<?php

namespace App\Services;

use App\Models\RevistaAdventistaEdition;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class RevistaAdventistaEditionPdfService
{
    public function __construct(
        private readonly RevistaAdventistaArchiveCatalogService $catalog,
    ) {}

    public function localCachePath(RevistaAdventistaEdition $edition): string
    {
        return 'revista-adventista/pdfs/'.$this->catalog->storageFilename((int) $edition->year, (int) $edition->month, 'pdf');
    }

    public function cacheFromRemote(RevistaAdventistaEdition $edition): bool
    {
        $remoteUrl = $edition->resolvedSourcePdfUrl();
        if ($remoteUrl === null) {
            return false;
        }

        try {
            $response = Http::timeout(180)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista cache)'])
                ->get($remoteUrl);

            if (! $response->successful()) {
                return false;
            }

            $path = $this->localCachePath($edition);
            Storage::disk('public')->put($path, $response->body());

            $edition->pdf_path = $path;
            $edition->pdf_cached_at = now();
            $edition->save();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @return \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\Response|null
     */
    public function streamPdf(RevistaAdventistaEdition $edition, bool $attachment = false)
    {
        if ($edition->hasLocalPdf()) {
            return $this->streamLocalPdf($edition, $attachment);
        }

        $remoteUrl = $edition->resolvedSourcePdfUrl();
        if ($remoteUrl === null) {
            return null;
        }

        try {
            $response = Http::timeout(180)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista proxy)'])
                ->get($remoteUrl);

            if (! $response->successful()) {
                return null;
            }

            $path = $this->localCachePath($edition);
            $body = $response->body();
            Storage::disk('public')->put($path, $body);

            $edition->pdf_path = $path;
            $edition->pdf_cached_at = now();
            $edition->save();

            return response($body, 200, $this->pdfHeaders($edition, $attachment));
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\Response|null
     */
    public function streamLocalPdf(RevistaAdventistaEdition $edition, bool $attachment = false)
    {
        $path = trim(str_replace('\\', '/', (string) ($edition->pdf_path ?? '')), '/');
        if ($path === '' || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $headers = $this->pdfHeaders($edition, $attachment);

        if ($attachment) {
            return Storage::disk('public')->download($path, $this->downloadFilename($edition), $headers);
        }

        return Storage::disk('public')->response($path, null, $headers);
    }

    /**
     * @return array<string, string>
     */
    private function pdfHeaders(RevistaAdventistaEdition $edition, bool $attachment): array
    {
        $disposition = ($attachment ? 'attachment' : 'inline').'; filename="'.$this->downloadFilename($edition).'"';

        return [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition,
            'Cache-Control' => 'private, max-age=3600',
        ];
    }

    private function downloadFilename(RevistaAdventistaEdition $edition): string
    {
        return $this->catalog->storageFilename((int) $edition->year, (int) $edition->month, 'pdf');
    }
}
