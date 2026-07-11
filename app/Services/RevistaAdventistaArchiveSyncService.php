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
     * Apaga todas as edições do acervo e os arquivos locais de capa/PDF.
     *
     * @return array{deleted: int, covers_deleted: int, pdfs_deleted: int}
     */
    public function purge(): array
    {
        $deleted = 0;
        $coversDeleted = 0;
        $pdfsDeleted = 0;

        RevistaAdventistaEdition::query()->orderBy('id')->chunkById(100, function ($editions) use (&$deleted, &$coversDeleted, &$pdfsDeleted): void {
            foreach ($editions as $edition) {
                if ($edition->hasLocalCover()) {
                    Storage::disk('public')->delete((string) $edition->cover_path);
                    $coversDeleted++;
                }

                if ($edition->hasLocalPdf()) {
                    Storage::disk('public')->delete((string) $edition->pdf_path);
                    $pdfsDeleted++;
                }

                $edition->delete();
                $deleted++;
            }
        });

        foreach (['revista-adventista/covers', 'revista-adventista/pdfs'] as $directory) {
            if (Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->deleteDirectory($directory);
            }
        }

        return [
            'deleted' => $deleted,
            'covers_deleted' => $coversDeleted,
            'pdfs_deleted' => $pdfsDeleted,
        ];
    }

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

            foreach ($fetched['editions'] ?? [] as $mapped) {
                if (! is_array($mapped)) {
                    $skipped++;

                    continue;
                }

                $sourceEditionId = trim((string) ($mapped['source_edition_id'] ?? ''));
                $cpbId = (int) ($mapped['cpb_edition_id'] ?? 0);
                $mappedYear = (int) ($mapped['year'] ?? 0);
                $mappedMonth = (int) ($mapped['month'] ?? 0);

                if ($sourceEditionId === '' || $cpbId <= 0 || $mappedYear <= 0 || $mappedMonth <= 0) {
                    $skipped++;

                    continue;
                }

                $edition = RevistaAdventistaEdition::query()
                    ->where('source', RevistaAdventistaEdition::SOURCE_CPB)
                    ->where('source_edition_id', $sourceEditionId)
                    ->first();

                if ($edition === null) {
                    $edition = RevistaAdventistaEdition::query()->where('cpb_edition_id', $cpbId)->first();
                }

                $isNew = $edition === null;
                if ($isNew) {
                    $edition = new RevistaAdventistaEdition();
                }

                $previousCoverPath = (string) ($edition->cover_path ?? '');

                $edition->fill($mapped);

                // Capas ficam nas URLs da CPB por padrão; só baixa localmente com --force-covers.
                if ($forceCovers && is_string($mapped['source_cover_url'] ?? null)) {
                    $coverPath = $this->downloadCover((string) $mapped['source_cover_url'], $mappedYear, $mappedMonth);
                    if ($coverPath !== null) {
                        if ($previousCoverPath !== '' && $previousCoverPath !== $coverPath) {
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

                if ($cachePdfs && ! $edition->hasLocalPdf() && $this->pdfService->cacheFromRemote($edition)) {
                    $pdfsDownloaded++;
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
        return $this->catalog->normalizeEdition($item);
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
