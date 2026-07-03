<?php

namespace App\Services;

use App\Models\LibraryBook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LibraryEgwPdfService
{
    public function __construct(
        private readonly CentroWhiteEgwCatalogService $catalog,
    ) {}

    public function localCachePath(LibraryBook $book): string
    {
        $slug = $this->catalog->slugForTitle($book->title);

        return 'library/egw/pdfs/'.$slug.'.pdf';
    }

    public function cacheFromRemote(LibraryBook $book): bool
    {
        $remoteUrl = $this->resolveRemotePdfUrl($book);
        if ($remoteUrl === null) {
            return false;
        }

        try {
            $response = Http::timeout(120)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (library cache)'])
                ->get($remoteUrl);

            if (! $response->successful()) {
                return false;
            }

            $path = $this->localCachePath($book);
            Storage::disk('public')->put($path, $response->body());

            $book->pdf_path = $path;
            $book->pdf_cached_at = now();
            $book->save();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @return StreamedResponse|\Illuminate\Http\Response|null
     */
    public function streamPdf(LibraryBook $book, bool $attachment = false)
    {
        if ($book->hasLocalPdf()) {
            return $this->streamLocalPdf($book, $attachment);
        }

        $remoteUrl = $this->resolveRemotePdfUrl($book);
        if ($remoteUrl === null) {
            return null;
        }

        try {
            $response = Http::timeout(120)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (library proxy)'])
                ->withOptions(['stream' => true])
                ->get($remoteUrl);

            if (! $response->successful()) {
                return null;
            }

            $path = $this->localCachePath($book);
            $body = $response->body();
            Storage::disk('public')->put($path, $body);

            $book->pdf_path = $path;
            $book->pdf_cached_at = now();
            $book->save();

            return response($body, 200, $this->pdfHeaders($book, $attachment));
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\Response|null
     */
    public function streamLocalPdf(LibraryBook $book, bool $attachment = false)
    {
        $path = trim(str_replace('\\', '/', (string) ($book->pdf_path ?? '')), '/');
        if ($path === '' || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $headers = $this->pdfHeaders($book, $attachment);

        if ($attachment) {
            return Storage::disk('public')->download($path, $this->downloadFilename($book), $headers);
        }

        return Storage::disk('public')->response($path, null, $headers);
    }

    /**
     * @return array<string, string>
     */
    private function pdfHeaders(LibraryBook $book, bool $attachment): array
    {
        $disposition = ($attachment ? 'attachment' : 'inline').'; filename="'.$this->downloadFilename($book).'"';

        return [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition,
        ];
    }

    private function downloadFilename(LibraryBook $book): string
    {
        $slug = $this->catalog->slugForTitle($book->title);

        return ($slug !== '' ? $slug : 'publicacao-'.$book->id).'.pdf';
    }

    private function resolveRemotePdfUrl(LibraryBook $book): ?string
    {
        $remoteUrl = $book->resolvedSourcePdfUrl();
        if ($remoteUrl !== null) {
            return $remoteUrl;
        }

        if ($book->category !== LibraryBook::CATEGORY_EGW) {
            return null;
        }

        $discovered = $this->discoverRemotePdfUrlFromCatalog($book);
        if ($discovered === null) {
            return null;
        }

        $book->source_pdf_url = $discovered;
        $book->save();

        return $discovered;
    }

    private function discoverRemotePdfUrlFromCatalog(LibraryBook $book): ?string
    {
        $catalog = $this->catalog->fetchCatalog();
        if (! ($catalog['ok'] ?? false)) {
            return null;
        }

        $items = $catalog['items'] ?? [];
        if (! is_array($items) || $items === []) {
            return null;
        }

        $variants = $this->titleLookupVariants($book->title);
        $variantSlugs = array_map(fn (string $title) => $this->catalog->slugForTitle($title), $variants);

        foreach ($items as $item) {
            $candidateTitle = trim((string) ($item['title'] ?? ''));
            $candidatePdfUrl = trim((string) ($item['pdf_url'] ?? ''));
            if ($candidateTitle === '' || $candidatePdfUrl === '') {
                continue;
            }

            $candidateVariants = $this->titleLookupVariants($candidateTitle);
            foreach ($candidateVariants as $candidateVariant) {
                if (in_array($candidateVariant, $variants, true)) {
                    return $candidatePdfUrl;
                }
            }

            $candidateSlug = $this->catalog->slugForTitle($candidateTitle);
            if (in_array($candidateSlug, $variantSlugs, true)) {
                return $candidatePdfUrl;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function titleLookupVariants(string $title): array
    {
        $variants = [];
        $push = function (string $value) use (&$variants): void {
            $normalized = $this->normalizeLookupTitle($value);
            if ($normalized !== '' && ! in_array($normalized, $variants, true)) {
                $variants[] = $normalized;
            }
        };

        $push($title);
        $push(preg_replace('/\s*[\(\[].*?[\)\]]\s*/u', ' ', $title) ?? $title);

        return $variants;
    }

    private function normalizeLookupTitle(string $title): string
    {
        $normalized = Str::of($title)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9\s]+/', ' ')
            ->replaceMatches('/\s+/', ' ')
            ->trim()
            ->value();

        return $normalized;
    }
}
