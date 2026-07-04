<?php

namespace App\Services;

use App\Models\RevistaAdventistaEdition;
use Illuminate\Support\Facades\Http;

class RevistaAdventistaAcesArchiveCatalogService implements RevistaAdventistaArchiveProvider
{
    public const SOURCE = RevistaAdventistaEdition::SOURCE_ACES;

    public const API_BASE = 'https://archivo.revistaadventista.editorialaces.com/wp-json/wp/v2';

    public function sourceKey(): string
    {
        return self::SOURCE;
    }

    /**
     * @return array{ok: bool, years?: list<int>, error?: string}
     */
    public function fetchAvailableYears(): array
    {
        try {
            $years = [];
            $page = 1;
            $totalPages = 1;

            do {
                $response = Http::timeout(60)
                    ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista archive)'])
                    ->get(self::API_BASE.'/categories', [
                        'page' => $page,
                        'per_page' => 100,
                        '_fields' => 'id,name,slug,count',
                    ]);

                if (! $response->successful()) {
                    return ['ok' => false, 'error' => 'Não foi possível acessar o acervo ACES (HTTP '.$response->status().').'];
                }

                $categories = $response->json();
                if (! is_array($categories)) {
                    return ['ok' => false, 'error' => 'Resposta inválida do acervo ACES.'];
                }

                foreach ($categories as $category) {
                    if (! is_array($category)) {
                        continue;
                    }

                    $year = $this->extractYearFromCategory($category);
                    if ($year !== null) {
                        $years[] = $year;
                    }
                }

                $totalPages = max(1, (int) $response->header('X-WP-TotalPages', 1));
                $page++;
            } while ($page <= $totalPages);

            $years = array_values(array_unique($years));
            sort($years);

            return ['ok' => true, 'years' => $years];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao buscar anos do acervo ACES: '.$e->getMessage()];
        }
    }

    /**
     * @return array{ok: bool, editions?: list<array<string, mixed>>, error?: string}
     */
    public function fetchEditionsForYear(int $year): array
    {
        $category = $this->fetchYearCategory($year);
        if (! ($category['ok'] ?? false)) {
            return ['ok' => false, 'error' => $category['error'] ?? 'Não foi possível localizar o ano no acervo ACES.'];
        }

        $yearCategory = $category['category'] ?? null;
        if (! is_array($yearCategory)) {
            return ['ok' => true, 'editions' => []];
        }

        try {
            $postsResponse = Http::timeout(60)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista archive)'])
                ->get(self::API_BASE.'/posts', [
                    'categories' => (int) $yearCategory['id'],
                    'per_page' => 100,
                    'orderby' => 'date',
                    'order' => 'asc',
                    '_fields' => 'id,date,slug,title,jetpack_featured_media_url',
                ]);

            if (! $postsResponse->successful()) {
                return ['ok' => false, 'error' => 'Não foi possível buscar edições ACES de '.$year.' (HTTP '.$postsResponse->status().').'];
            }

            $posts = $postsResponse->json();
            if (! is_array($posts)) {
                return ['ok' => false, 'error' => 'Resposta inválida ao buscar edições ACES de '.$year.'.'];
            }

            $media = $this->fetchMediaForYear($year);
            if (! ($media['ok'] ?? false)) {
                return ['ok' => false, 'error' => $media['error'] ?? 'Não foi possível localizar a mídia do acervo ACES.'];
            }

            $mediaByMonth = $this->groupMediaByMonth($media['media'] ?? [], $year);
            $editions = [];

            foreach ($posts as $post) {
                if (! is_array($post)) {
                    continue;
                }

                $normalized = $this->normalizePost($post, $mediaByMonth, $year);
                if ($normalized !== null) {
                    $editions[] = $normalized;
                }
            }

            return ['ok' => true, 'editions' => $editions];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao buscar edições ACES de '.$year.': '.$e->getMessage()];
        }
    }

    /**
     * @return array{ok: bool, category?: array<string, mixed>|null, error?: string}
     */
    private function fetchYearCategory(int $year): array
    {
        try {
            $response = Http::timeout(45)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista archive)'])
                ->get(self::API_BASE.'/categories', [
                    'search' => (string) $year,
                    'per_page' => 20,
                    '_fields' => 'id,name,slug,count',
                ]);

            if (! $response->successful()) {
                return ['ok' => false, 'error' => 'Não foi possível localizar a categoria '.$year.' no acervo ACES (HTTP '.$response->status().').'];
            }

            $categories = $response->json();
            if (! is_array($categories)) {
                return ['ok' => false, 'error' => 'Resposta inválida ao buscar a categoria '.$year.' no acervo ACES.'];
            }

            foreach ($categories as $category) {
                if (! is_array($category)) {
                    continue;
                }

                if ($this->extractYearFromCategory($category) === $year) {
                    return ['ok' => true, 'category' => $category];
                }
            }

            return ['ok' => true, 'category' => null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao localizar a categoria '.$year.' no acervo ACES: '.$e->getMessage()];
        }
    }

    /**
     * @return array{ok: bool, media?: list<array<string, mixed>>, error?: string}
     */
    private function fetchMediaForYear(int $year): array
    {
        try {
            $response = Http::timeout(60)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista archive)'])
                ->get(self::API_BASE.'/media', [
                    'search' => (string) $year,
                    'per_page' => 100,
                    '_fields' => 'id,slug,title,mime_type,source_url,media_type,post',
                ]);

            if (! $response->successful()) {
                return ['ok' => false, 'error' => 'Não foi possível buscar a mídia ACES de '.$year.' (HTTP '.$response->status().').'];
            }

            $media = $response->json();
            if (! is_array($media)) {
                return ['ok' => false, 'error' => 'Resposta inválida ao buscar a mídia ACES de '.$year.'.'];
            }

            return ['ok' => true, 'media' => $media];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao buscar a mídia ACES de '.$year.': '.$e->getMessage()];
        }
    }

    /**
     * @param  array<string, mixed>  $post
     * @param  array<int, list<array<string, mixed>>>  $mediaByMonth
     * @return array<string, mixed>|null
     */
    private function normalizePost(array $post, array $mediaByMonth, int $year): ?array
    {
        $postId = (int) ($post['id'] ?? 0);
        $month = $this->extractMonthFromPost($post);

        if ($postId <= 0 || $month === null) {
            return null;
        }

        $monthMedia = $mediaByMonth[$month] ?? [];
        $coverUrl = $this->selectMediaUrl($monthMedia, 'image', $postId);
        $pdfUrl = $this->selectMediaUrl($monthMedia, 'application/pdf', $postId);

        if ($coverUrl === null) {
            $fallbackCover = trim((string) ($post['jetpack_featured_media_url'] ?? ''));
            $coverUrl = $fallbackCover !== '' ? $fallbackCover : null;
        }

        return [
            'source' => self::SOURCE,
            'source_edition_id' => (string) $postId,
            'cpb_edition_id' => null,
            'year' => $year,
            'month_code' => sprintf('M%02d', $month),
            'month' => $month,
            'title' => RevistaAdventistaEdition::buildTitle($year, $month),
            'source_cover_url' => $coverUrl,
            'source_pdf_url' => $pdfUrl,
            'synced_at' => now(),
        ];
    }

    /**
     * @param  array<string, mixed>  $category
     */
    private function extractYearFromCategory(array $category): ?int
    {
        $slug = trim((string) ($category['slug'] ?? ''));
        $name = trim((string) ($category['name'] ?? ''));
        $count = (int) ($category['count'] ?? 0);

        if ($count <= 0) {
            return null;
        }

        foreach ([$slug, $name] as $candidate) {
            if (preg_match('/^\d{4}$/', $candidate) === 1) {
                return (int) $candidate;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $post
     */
    private function extractMonthFromPost(array $post): ?int
    {
        $date = trim((string) ($post['date'] ?? ''));
        if (preg_match('/^\d{4}-(\d{2})-\d{2}/', $date, $matches) === 1) {
            $month = (int) $matches[1];

            return ($month >= 1 && $month <= 12) ? $month : null;
        }

        $yearMonth = $this->extractYearMonthFromValues([
            (string) ($post['slug'] ?? ''),
            (string) (($post['title']['rendered'] ?? '') ?: ''),
        ]);

        return $yearMonth['month'] ?? null;
    }

    /**
     * @param  list<array<string, mixed>>  $media
     * @return array<int, list<array<string, mixed>>>
     */
    private function groupMediaByMonth(array $media, int $year): array
    {
        $grouped = [];

        foreach ($media as $item) {
            $yearMonth = $this->extractYearMonthFromValues([
                (string) ($item['slug'] ?? ''),
                (string) (($item['title']['rendered'] ?? '') ?: ''),
                (string) ($item['source_url'] ?? ''),
            ]);

            if ($yearMonth === null || $yearMonth['year'] !== $year) {
                continue;
            }

            $month = $yearMonth['month'];
            $grouped[$month] ??= [];
            $grouped[$month][] = $item;
        }

        return $grouped;
    }

    /**
     * @param  list<string>  $values
     * @return array{year: int, month: int}|null
     */
    private function extractYearMonthFromValues(array $values): ?array
    {
        foreach ($values as $value) {
            if (preg_match('/(\d{4})[_-](\d{2})(?:\D|$)/i', $value, $matches) !== 1) {
                continue;
            }

            $year = (int) $matches[1];
            $month = (int) $matches[2];

            if ($year >= 1900 && $year <= 2100 && $month >= 1 && $month <= 12) {
                return ['year' => $year, 'month' => $month];
            }
        }

        return null;
    }

    /**
     * @param  list<array<string, mixed>>  $media
     */
    private function selectMediaUrl(array $media, string $type, int $postId): ?string
    {
        foreach ($media as $item) {
            if ($this->matchesRequestedMediaType($item, $type) && (int) ($item['post'] ?? 0) === $postId) {
                $url = trim((string) ($item['source_url'] ?? ''));

                return $url !== '' ? $url : null;
            }
        }

        foreach ($media as $item) {
            if ($this->matchesRequestedMediaType($item, $type)) {
                $url = trim((string) ($item['source_url'] ?? ''));

                return $url !== '' ? $url : null;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $media
     */
    private function matchesRequestedMediaType(array $media, string $type): bool
    {
        if ($type === 'image') {
            return trim((string) ($media['media_type'] ?? '')) === 'image';
        }

        return trim((string) ($media['mime_type'] ?? '')) === $type;
    }
}
