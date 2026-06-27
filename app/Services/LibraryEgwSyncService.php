<?php

namespace App\Services;

use App\Models\LibraryBook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LibraryEgwSyncService
{
    public function __construct(
        private readonly CentroWhiteEgwCatalogService $catalog,
        private readonly LibraryEgwPdfService $pdfService,
    ) {}

    /**
     * @return array{ok: bool, created: int, updated: int, removed: int, error?: string}
     */
    public function sync(bool $forceCovers = false, bool $cachePdfs = false): array
    {
        $fetched = $this->catalog->fetchCatalog();
        if (! ($fetched['ok'] ?? false)) {
            return [
                'ok' => false,
                'created' => 0,
                'updated' => 0,
                'removed' => 0,
                'error' => $fetched['error'] ?? 'Falha ao buscar catálogo.',
            ];
        }

        $items = $fetched['items'] ?? [];
        $created = 0;
        $updated = 0;
        $seenPdfUrls = [];

        foreach ($items as $index => $item) {
            $pdfUrl = $item['pdf_url'];
            $seenPdfUrls[$pdfUrl] = true;

            $book = LibraryBook::query()
                ->global()
                ->where('category', LibraryBook::CATEGORY_EGW)
                ->where('source_pdf_url', $pdfUrl)
                ->first();

            $isNew = $book === null;
            if ($isNew) {
                $book = new LibraryBook([
                    'church_id' => null,
                    'category' => LibraryBook::CATEGORY_EGW,
                    'source_pdf_url' => $pdfUrl,
                    'order' => count($items) - $index,
                ]);
            }

            $book->title = $item['title'];
            $book->subtitle = 'Ellen G. White';
            $book->source_cover_url = $item['cover_url'];
            $book->source_pdf_url = $pdfUrl;

            if (! $book->hasLocalPdf()) {
                $book->pdf_path = $pdfUrl;
                $book->pdf_cached_at = null;
            }

            $shouldDownloadCover = $forceCovers
                || $isNew
                || empty($book->cover_path)
                || str_starts_with((string) $book->cover_path, 'http');

            if ($shouldDownloadCover) {
                $coverPath = $this->downloadCover($item['cover_url'], $item['title']);
                if ($coverPath !== null) {
                    if (! $isNew && is_string($book->cover_path) && ! str_starts_with($book->cover_path, 'http')) {
                        Storage::disk('public')->delete($book->cover_path);
                    }
                    $book->cover_path = $coverPath;
                }
            }

            $book->save();

            if ($isNew) {
                $created++;
            } else {
                $updated++;
            }

            if ($cachePdfs && ! $book->hasLocalPdf()) {
                $this->pdfService->cacheFromRemote($book);
            }
        }

        $removed = $this->removeStaleBooks($seenPdfUrls);

        return [
            'ok' => true,
            'created' => $created,
            'updated' => $updated,
            'removed' => $removed,
        ];
    }

    /**
     * @param  array<string, true>  $seenPdfUrls
     */
    private function removeStaleBooks(array $seenPdfUrls): int
    {
        $removed = 0;
        $stale = LibraryBook::query()
            ->global()
            ->where('category', LibraryBook::CATEGORY_EGW)
            ->get()
            ->filter(function (LibraryBook $book) use ($seenPdfUrls) {
                $url = $book->source_pdf_url ?? $book->pdf_path;

                return ! is_string($url) || ! isset($seenPdfUrls[$url]);
            });

        foreach ($stale as $book) {
            if ($book->hasLocalPdf()) {
                continue;
            }
            $this->deleteBookFiles($book);
            $book->delete();
            $removed++;
        }

        return $removed;
    }

    private function downloadCover(string $url, string $title): ?string
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (library sync)'])
                ->get($url);

            if (! $response->successful()) {
                return null;
            }

            $extension = $this->guessImageExtension($url, (string) $response->header('Content-Type'));
            $filename = $this->catalog->slugForTitle($title).'.'.$extension;
            $path = 'library/egw/covers/'.$filename;

            Storage::disk('public')->put($path, $response->body());

            return $path;
        } catch (\Throwable) {
            return null;
        }
    }

    private function guessImageExtension(string $url, string $contentType): string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (is_string($path)) {
            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                return $ext === 'jpeg' ? 'jpg' : $ext;
            }
        }

        return match (true) {
            str_contains($contentType, 'png') => 'png',
            str_contains($contentType, 'webp') => 'webp',
            str_contains($contentType, 'gif') => 'gif',
            default => 'jpg',
        };
    }

    private function deleteBookFiles(LibraryBook $book): void
    {
        foreach (['cover_path', 'pdf_path'] as $field) {
            $path = $book->{$field};
            if (is_string($path) && $path !== '' && ! str_starts_with($path, 'http')) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}
