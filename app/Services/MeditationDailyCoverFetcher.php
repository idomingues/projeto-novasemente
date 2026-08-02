<?php

namespace App\Services;

use App\Models\News;
use App\Support\MeditationDailyFeed;
use App\Support\StorageUrl;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Busca diária de capa (nascer/pôr do sol) sem repetir URLs já usadas no feed.
 */
class MeditationDailyCoverFetcher
{
    private const OPENVERSE_ENDPOINT = 'https://api.openverse.org/v1/images';

    /** @var list<string> */
    private const QUERIES = [
        'sunrise',
        'sunset sky',
        'dawn sunrise',
        'golden hour sunrise',
        'morning sunrise landscape',
    ];

    /**
     * Resolve capa para a data: busca no banco de imagens e evita repetição.
     */
    public function resolveForDate(CarbonInterface $date): string
    {
        $date = $date->copy()->startOfDay();
        $used = $this->usedCoverKeys();

        $candidate = $this->pickFreshRemoteUrl($date, $used);
        if ($candidate !== null) {
            $stored = $this->storeLocalCopy($date, $candidate);
            if ($stored !== null) {
                return $stored;
            }

            return $candidate;
        }

        Log::notice('meditation_daily_cover.openverse_exhausted_or_failed');

        return $this->fallbackFromPool($date, $used);
    }

    /**
     * Chaves normalizadas das capas já publicadas (para não repetir).
     *
     * @return array<string, true>
     */
    public function usedCoverKeys(): array
    {
        $urls = News::query()
            ->where('slug', 'like', MeditationDailyFeed::SLUG_PREFIX.'%')
            ->whereNotNull('image_url')
            ->pluck('image_url');

        $keys = [];
        foreach ($urls as $url) {
            $key = $this->normalizeCoverKey((string) $url);
            if ($key !== '') {
                $keys[$key] = true;
            }
        }

        return $keys;
    }

    /**
     * @param  array<string, true>  $used
     */
    private function pickFreshRemoteUrl(CarbonInterface $date, array $used): ?string
    {
        $dayOfYear = (int) $date->format('z');
        $year = (int) $date->format('Y');
        $query = self::QUERIES[($dayOfYear + $year) % count(self::QUERIES)];

        // Varre algumas páginas a partir de um offset estável do dia.
        $startPage = 1 + ($dayOfYear % 12);
        for ($offset = 0; $offset < 8; $offset++) {
            $page = (($startPage - 1 + $offset) % 20) + 1;
            $results = $this->fetchOpenversePage($query, $page);
            foreach ($results as $url) {
                $key = $this->normalizeCoverKey($url);
                if ($key === '' || isset($used[$key])) {
                    continue;
                }

                return $url;
            }
        }

        // Última tentativa: outras queries.
        foreach (self::QUERIES as $altQuery) {
            if ($altQuery === $query) {
                continue;
            }
            $results = $this->fetchOpenversePage($altQuery, 1 + ($dayOfYear % 5));
            foreach ($results as $url) {
                $key = $this->normalizeCoverKey($url);
                if ($key === '' || isset($used[$key])) {
                    continue;
                }

                return $url;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function fetchOpenversePage(string $query, int $page): array
    {
        try {
            $response = Http::timeout(18)
                ->withHeaders([
                    'User-Agent' => 'NovaSementeMeditationCover/1.0',
                    'Accept' => 'application/json',
                ])
                ->get(self::OPENVERSE_ENDPOINT, [
                    'q' => $query,
                    'page' => max(1, $page),
                    'page_size' => 40,
                ]);

            if (! $response->successful()) {
                return [];
            }

            $results = $response->json('results');
            if (! is_array($results)) {
                return [];
            }

            $urls = [];
            foreach ($results as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $url = trim((string) ($row['url'] ?? ''));
                if ($url === '' || (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://'))) {
                    continue;
                }
                $urls[] = $url;
            }

            return $urls;
        } catch (\Throwable $e) {
            Log::warning('meditation_daily_cover.openverse_error', [
                'query' => $query,
                'page' => $page,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    private function storeLocalCopy(CarbonInterface $date, string $remoteUrl): ?string
    {
        try {
            $response = Http::timeout(25)
                ->withHeaders(['User-Agent' => 'NovaSementeMeditationCover/1.0'])
                ->get($remoteUrl);

            if (! $response->successful()) {
                return null;
            }

            $bytes = $response->body();
            if ($bytes === '' || strlen($bytes) < 2_000) {
                return null;
            }

            $ext = 'jpg';
            $contentType = strtolower((string) $response->header('Content-Type'));
            if (str_contains($contentType, 'png')) {
                $ext = 'png';
            } elseif (str_contains($contentType, 'webp')) {
                $ext = 'webp';
            }

            $relative = 'meditation-covers/'.$date->format('Y').'/'.$date->format('Y-m-d').'.'.$ext;
            Storage::disk('public')->put($relative, $bytes);

            return StorageUrl::publicMediaUrl($relative);
        } catch (\Throwable $e) {
            Log::warning('meditation_daily_cover.store_failed', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param  array<string, true>  $used
     */
    private function fallbackFromPool(CarbonInterface $date, array $used): string
    {
        $pool = MeditationDailyFeed::sunriseCoverPool();
        $n = count($pool);
        if ($n === 0) {
            return '';
        }

        $start = ((int) $date->format('z') + (int) $date->format('Y')) % $n;
        for ($i = 0; $i < $n; $i++) {
            $url = $pool[($start + $i) % $n];
            $key = $this->normalizeCoverKey($url);
            if ($key !== '' && ! isset($used[$key])) {
                return $url;
            }
        }

        // Todas já usadas: ainda assim devolve uma do dia (ciclo longo).
        return $pool[$start];
    }

    public function normalizeCoverKey(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }

        // Path local de storage também conta.
        if (str_contains($url, 'meditation-covers/')) {
            if (preg_match('#meditation-covers/\d{4}/(\d{4}-\d{2}-\d{2})\.[a-z0-9]+#i', $url, $m)) {
                return 'local:'.$m[1];
            }

            return 'local:'.Str::lower(basename(parse_url($url, PHP_URL_PATH) ?: $url));
        }

        $path = parse_url($url, PHP_URL_PATH);
        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($path) || $path === '') {
            return Str::lower($url);
        }

        return Str::lower(trim((string) $host).$path);
    }
}
