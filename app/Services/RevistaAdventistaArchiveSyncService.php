<?php

namespace App\Services;

use App\Models\RevistaAdventistaEdition;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class RevistaAdventistaArchiveSyncService
{
    public function __construct(
        private readonly RevistaAdventistaArchiveCatalogService $catalog,
        private readonly RevistaAdventistaEditionPdfService $pdfService,
    ) {}

    /**
     * @param  list<int>|null  $years
     * @return array{ok: bool, created: int, updated: int, skipped: int, covers_downloaded: int, pdfs_downloaded: int, error?: string}
     */
    public function sync(?array $years = null, bool $cachePdfs = false, bool $forceCovers = false): array
    {
        if ($years === null || $years === []) {
            $fetchedYears = $this->catalog->fetchAvailableYears();
            if (! ($fetchedYears['ok'] ?? false)) {
                return [
                    'ok' => false,
                    'created' => 0,
                    'updated' => 0,
                    'skipped' => 0,
                    'covers_downloaded' => 0,
                    'pdfs_downloaded' => 0,
                    'error' => $fetchedYears['error'] ?? 'Falha ao buscar anos disponíveis.',
                ];
            }
            $years = $fetchedYears['years'] ?? [];
        }

        $years = array_values(array_unique(array_filter($years, fn ($y) => is_int($y) && $y >= 1900 && $y <= 2100)));
        sort($years);

        if ($years === []) {
            return [
                'ok' => false,
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'covers_downloaded' => 0,
                'pdfs_downloaded' => 0,
                'error' => 'Informe ao menos um ano válido.',
            ];
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $coversDownloaded = 0;
        $pdfsDownloaded = 0;

        foreach ($years as $year) {
            $fetched = $this->catalog->fetchEditionsForYear($year);
            if (! ($fetched['ok'] ?? false)) {
                return [
                    'ok' => false,
                    'created' => $created,
                    'updated' => $updated,
                    'skipped' => $skipped,
                    'covers_downloaded' => $coversDownloaded,
                    'pdfs_downloaded' => $pdfsDownloaded,
                    'error' => $fetched['error'] ?? 'Falha ao buscar edições.',
                ];
            }

            foreach ($fetched['editions'] ?? [] as $item) {
                $mapped = $this->mapEdition($item);
                if ($mapped === null) {
                    $skipped++;

                    continue;
                }

                $cpbId = (int) $mapped['cpb_edition_id'];
                $edition = RevistaAdventistaEdition::query()->where('cpb_edition_id', $cpbId)->first();
                $isNew = $edition === null;

                if ($isNew) {
                    $edition = new RevistaAdventistaEdition($mapped);
                } else {
                    $edition->fill($mapped);
                }

                $shouldDownloadCover = $forceCovers
                    || $isNew
                    || ! $edition->hasLocalCover();

                if ($shouldDownloadCover && is_string($mapped['source_cover_url'] ?? null)) {
                    $coverPath = $this->downloadCover((string) $mapped['source_cover_url'], (int) $mapped['year'], (int) $mapped['month']);
                    if ($coverPath !== null) {
                        if (! $isNew && $edition->hasLocalCover() && $edition->cover_path !== $coverPath) {
                            Storage::disk('public')->delete((string) $edition->cover_path);
                        }
                        $edition->cover_path = $coverPath;
                        $edition->cover_cached_at = now();
                        $coversDownloaded++;
                    }
                }

                $edition->save();

                if ($isNew) {
                    $created++;
                } elseif ($edition->wasChanged()) {
                    $updated++;
                } else {
                    $skipped++;
                }

                if ($cachePdfs && ! $edition->hasLocalPdf()) {
                    if ($this->pdfService->cacheFromRemote($edition)) {
                        $pdfsDownloaded++;
                    }
                }
            }
        }

        return [
            'ok' => true,
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'covers_downloaded' => $coversDownloaded,
            'pdfs_downloaded' => $pdfsDownloaded,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    public function mapEdition(array $item): ?array
    {
        $cpbId = (int) ($item['id_edicao'] ?? 0);
        $year = (int) ($item['ano'] ?? 0);
        $monthCode = trim((string) ($item['mes'] ?? ''));
        $month = $this->catalog->parseMonth($monthCode);

        if ($cpbId <= 0 || $year <= 0 || $month === null) {
            return null;
        }

        if (($item['ativo'] ?? true) === false) {
            return null;
        }

        $coverFile = trim((string) ($item['capa'] ?? ''));
        $pdfFile = trim((string) ($item['arquivo'] ?? ''));

        return [
            'cpb_edition_id' => $cpbId,
            'year' => $year,
            'month_code' => strtoupper($monthCode),
            'month' => $month,
            'title' => $this->catalog->editionTitle($year, $month),
            'source_cover_url' => $coverFile !== '' ? $this->catalog->buildCoverUrl($coverFile) : null,
            'source_pdf_url' => $pdfFile !== '' ? $this->catalog->buildPdfUrl($pdfFile) : null,
            'synced_at' => now(),
        ];
    }

    private function downloadCover(string $url, int $year, int $month): ?string
    {
        try {
            $response = Http::timeout(60)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista archive)'])
                ->get($url);

            if (! $response->successful()) {
                return null;
            }

            $extension = $this->guessImageExtension($url, (string) $response->header('Content-Type'));
            $filename = $this->catalog->storageFilename($year, $month, $extension);
            $path = 'revista-adventista/covers/'.$filename;

            Storage::disk('public')->put($path, $response->body());

            return $path;
        } catch (\Throwable) {
            return null;
        }
    }

    private function guessImageExtension(string $url, string $contentType): string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (is_string($path) && preg_match('/\.(jpe?g|png|webp|gif)$/i', $path, $matches)) {
            return strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
        }

        $contentType = strtolower(trim(explode(';', $contentType)[0] ?? ''));

        return match ($contentType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'jpg',
        };
    }
}
