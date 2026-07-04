<?php

namespace App\Services;

use App\Models\RevistaAdventistaEdition;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class RevistaAdventistaArchiveSyncService
{
    public function __construct(
        private readonly RevistaAdventistaArchiveCatalogService $cpbCatalog,
        private readonly RevistaAdventistaAcesArchiveCatalogService $acesCatalog,
        private readonly RevistaAdventistaEditionPdfService $pdfService,
    ) {}

    /**
     * @param  list<int>|null  $years
     * @return array{ok: bool, created: int, updated: int, skipped: int, covers_downloaded: int, pdfs_downloaded: int, error?: string}
     */
    public function sync(?array $years = null, bool $cachePdfs = false, bool $forceCovers = false): array
    {
        $cpbAvailableYears = null;
        $acesAvailableYears = null;

        if ($years === null || $years === []) {
            $fetchedCpbYears = $this->cpbCatalog->fetchAvailableYears();
            if (! ($fetchedCpbYears['ok'] ?? false)) {
                return [
                    'ok' => false,
                    'created' => 0,
                    'updated' => 0,
                    'skipped' => 0,
                    'covers_downloaded' => 0,
                    'pdfs_downloaded' => 0,
                    'error' => $fetchedCpbYears['error'] ?? 'Falha ao buscar anos disponíveis.',
                ];
            }

            $cpbAvailableYears = $fetchedCpbYears['years'] ?? [];
            $fetchedAcesYears = $this->acesCatalog->fetchAvailableYears();
            if (! ($fetchedAcesYears['ok'] ?? false)) {
                return [
                    'ok' => false,
                    'created' => 0,
                    'updated' => 0,
                    'skipped' => 0,
                    'covers_downloaded' => 0,
                    'pdfs_downloaded' => 0,
                    'error' => $fetchedAcesYears['error'] ?? 'Falha ao buscar anos disponíveis.',
                ];
            }

            $acesAvailableYears = $fetchedAcesYears['years'] ?? [];
            $years = array_merge(
                $cpbAvailableYears,
                $acesAvailableYears,
            );
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
            if ($cpbAvailableYears === null || in_array($year, $cpbAvailableYears, true)) {
                $cpbResult = $this->syncProvider($this->cpbCatalog, $year, $cachePdfs, $forceCovers);
                if (! ($cpbResult['ok'] ?? false)) {
                    return [
                        'ok' => false,
                        'created' => $created + $cpbResult['created'],
                        'updated' => $updated + $cpbResult['updated'],
                        'skipped' => $skipped + $cpbResult['skipped'],
                        'covers_downloaded' => $coversDownloaded + $cpbResult['covers_downloaded'],
                        'pdfs_downloaded' => $pdfsDownloaded + $cpbResult['pdfs_downloaded'],
                        'error' => $cpbResult['error'] ?? 'Falha ao buscar edições.',
                    ];
                }

                $created += $cpbResult['created'];
                $updated += $cpbResult['updated'];
                $skipped += $cpbResult['skipped'];
                $coversDownloaded += $cpbResult['covers_downloaded'];
                $pdfsDownloaded += $cpbResult['pdfs_downloaded'];
            }

            if ($acesAvailableYears === null || in_array($year, $acesAvailableYears, true)) {
                $acesResult = $this->syncProvider($this->acesCatalog, $year, $cachePdfs, $forceCovers);
                if (! ($acesResult['ok'] ?? false)) {
                    return [
                        'ok' => false,
                        'created' => $created + $acesResult['created'],
                        'updated' => $updated + $acesResult['updated'],
                        'skipped' => $skipped + $acesResult['skipped'],
                        'covers_downloaded' => $coversDownloaded + $acesResult['covers_downloaded'],
                        'pdfs_downloaded' => $pdfsDownloaded + $acesResult['pdfs_downloaded'],
                        'error' => $acesResult['error'] ?? 'Falha ao buscar edições.',
                    ];
                }

                $created += $acesResult['created'];
                $updated += $acesResult['updated'];
                $skipped += $acesResult['skipped'];
                $coversDownloaded += $acesResult['covers_downloaded'];
                $pdfsDownloaded += $acesResult['pdfs_downloaded'];
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
        return $this->cpbCatalog->normalizeEdition($item);
    }

    /**
     * @return array{ok: bool, created: int, updated: int, skipped: int, covers_downloaded: int, pdfs_downloaded: int, error?: string}
     */
    private function syncProvider(
        RevistaAdventistaArchiveProvider $provider,
        int $year,
        bool $cachePdfs,
        bool $forceCovers,
    ): array {
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $coversDownloaded = 0;
        $pdfsDownloaded = 0;

        $fetched = $provider->fetchEditionsForYear($year);
        if (! ($fetched['ok'] ?? false)) {
            return [
                'ok' => false,
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'covers_downloaded' => 0,
                'pdfs_downloaded' => 0,
                'error' => $fetched['error'] ?? 'Falha ao buscar edições.',
            ];
        }

        foreach ($fetched['editions'] ?? [] as $mapped) {
            if (! is_array($mapped)) {
                $skipped++;

                continue;
            }

            $source = trim((string) ($mapped['source'] ?? ''));
            $sourceEditionId = trim((string) ($mapped['source_edition_id'] ?? ''));
            $mappedYear = (int) ($mapped['year'] ?? 0);
            $mappedMonth = (int) ($mapped['month'] ?? 0);

            if ($source === '' || $sourceEditionId === '' || $mappedYear <= 0 || $mappedMonth <= 0) {
                $skipped++;

                continue;
            }

            $edition = RevistaAdventistaEdition::query()
                ->where('source', $source)
                ->where('source_edition_id', $sourceEditionId)
                ->first();

            if ($edition === null) {
                $existingByMonth = RevistaAdventistaEdition::query()
                    ->where('year', $mappedYear)
                    ->where('month', $mappedMonth)
                    ->first();

                if (
                    $existingByMonth !== null
                    && $provider->sourceKey() !== RevistaAdventistaEdition::SOURCE_CPB
                    && $existingByMonth->source !== $provider->sourceKey()
                ) {
                    $skipped++;

                    continue;
                }

                if ($existingByMonth !== null) {
                    $edition = $existingByMonth;
                }
            }

            $isNew = $edition === null;
            if ($isNew) {
                $edition = new RevistaAdventistaEdition();
            }

            $isReplacingSource = $edition->exists && $edition->source !== $source;
            $previousCoverPath = (string) ($edition->cover_path ?? '');
            $previousPdfPath = (string) ($edition->pdf_path ?? '');

            if ($isReplacingSource) {
                if ($edition->hasLocalCover()) {
                    Storage::disk('public')->delete($previousCoverPath);
                }

                if ($edition->hasLocalPdf()) {
                    Storage::disk('public')->delete($previousPdfPath);
                }

                $edition->cover_path = null;
                $edition->cover_cached_at = null;
                $edition->pdf_path = null;
                $edition->pdf_cached_at = null;
            }

            $edition->fill($mapped);

            $shouldDownloadCover = $forceCovers
                || $isNew
                || $isReplacingSource
                || ! $edition->hasLocalCover();

            if ($shouldDownloadCover && is_string($mapped['source_cover_url'] ?? null)) {
                $coverPath = $this->downloadCover((string) $mapped['source_cover_url'], $mappedYear, $mappedMonth);
                if ($coverPath !== null) {
                    if (! $isNew && $previousCoverPath !== '' && $previousCoverPath !== $coverPath) {
                        Storage::disk('public')->delete($previousCoverPath);
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

            $shouldCachePdf = $cachePdfs && ($isReplacingSource || ! $edition->hasLocalPdf());
            if ($shouldCachePdf && $this->pdfService->cacheFromRemote($edition)) {
                $pdfsDownloaded++;
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
            $filename = RevistaAdventistaEdition::storageFilename($year, $month, $extension);
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
