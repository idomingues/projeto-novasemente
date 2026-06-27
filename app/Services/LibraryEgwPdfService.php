<?php

namespace App\Services;

use App\Models\LibraryBook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
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
        $remoteUrl = $book->resolvedSourcePdfUrl();
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

        $remoteUrl = $book->resolvedSourcePdfUrl();
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
}
