<?php

namespace App\Services;

use App\Models\RevistaAdventistaArticle;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class RevistaAdventistaSyncService
{
    public const API_BASE = 'https://revistaadventista.com.br/wp-json/wp/v2';

    private const MAX_PAGES = 200;

    private const PER_PAGE = 100;

    /**
     * Categorias monitoradas (slug => ID no WordPress).
     *
     * @var array<string, int>
     */
    public const WP_CATEGORY_IDS = [
        RevistaAdventistaArticle::SECTION_ARTIGOS => 44,
        RevistaAdventistaArticle::SECTION_BUSSOLA => 88,
        RevistaAdventistaArticle::SECTION_EDITORIAL => 79,
        RevistaAdventistaArticle::SECTION_EM_FAMILIA => 59,
    ];

    /**
     * Anos padrão: ano atual e o anterior (acompanha a virada de calendário).
     *
     * @return list<int>
     */
    public static function defaultYears(?Carbon $now = null): array
    {
        $year = ($now ?? now())->year;

        return [$year - 1, $year];
    }

    /**
     * @param  list<int>  $years
     * @return array{ok: bool, created: int, updated: int, skipped: int, error?: string}
     */
    public function sync(?array $years = null): array
    {
        $years ??= self::defaultYears();
        $years = array_values(array_unique(array_filter($years, fn ($y) => is_int($y) && $y >= 2000 && $y <= 2100)));
        if ($years === []) {
            return ['ok' => false, 'created' => 0, 'updated' => 0, 'skipped' => 0, 'error' => 'Informe ao menos um ano válido.'];
        }

        sort($years);
        $after = Carbon::create($years[0], 1, 1, 0, 0, 0, 'UTC')->toIso8601String();
        $before = Carbon::create(end($years) + 1, 1, 1, 0, 0, 0, 'UTC')->toIso8601String();

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $seenWpIds = [];

        foreach (self::WP_CATEGORY_IDS as $section => $categoryId) {
            $page = 1;

            while ($page <= self::MAX_PAGES) {
                $fetched = $this->fetchPostsPage($categoryId, $page, $after, $before);
                if (! ($fetched['ok'] ?? false)) {
                    return [
                        'ok' => false,
                        'created' => $created,
                        'updated' => $updated,
                        'skipped' => $skipped,
                        'error' => $fetched['error'] ?? 'Falha ao buscar publicações.',
                    ];
                }

                $posts = $fetched['posts'] ?? [];
                if ($posts === []) {
                    break;
                }

                foreach ($posts as $post) {
                    $wpId = (int) ($post['id'] ?? 0);
                    if ($wpId <= 0) {
                        continue;
                    }

                    if (isset($seenWpIds[$wpId])) {
                        $skipped++;

                        continue;
                    }
                    $seenWpIds[$wpId] = true;

                    $parsed = $this->mapPost($post);
                    if ($parsed === null) {
                        $skipped++;

                        continue;
                    }

                    $existing = RevistaAdventistaArticle::query()->where('wp_post_id', $wpId)->first();
                    if ($existing === null) {
                        RevistaAdventistaArticle::query()->create($parsed);
                        $created++;
                    } else {
                        $existing->fill($parsed);
                        if ($existing->isDirty()) {
                            $existing->save();
                            $updated++;
                        } else {
                            $skipped++;
                        }
                    }
                }

                if (count($posts) < self::PER_PAGE) {
                    break;
                }

                $page++;
            }
        }

        return [
            'ok' => true,
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
        ];
    }

    /**
     * @return array{ok: bool, posts?: list<array<string, mixed>>, error?: string}
     */
    private function fetchPostsPage(int $categoryId, int $page, string $after, string $before): array
    {
        try {
            $response = Http::timeout(45)
                ->retry(3, 750, function ($exception, $request) {
                    if ($exception instanceof \Illuminate\Http\Client\RequestException) {
                        $status = $exception->response?->status();

                        return in_array($status, [408, 425, 429, 500, 502, 503, 504], true);
                    }

                    // Falhas de rede / timeout: tentar de novo.
                    return true;
                }, throw: false)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; NovaSemente/1.0; +https://novasemente.app; revista-adventista sync)',
                    'Accept' => 'application/json',
                ])
                ->get(self::API_BASE.'/posts', [
                    'categories' => $categoryId,
                    'per_page' => self::PER_PAGE,
                    'page' => $page,
                    'after' => $after,
                    'before' => $before,
                    '_embed' => 'wp:featuredmedia,author',
                ]);

            if ($response->status() === 400) {
                return ['ok' => true, 'posts' => []];
            }

            if (! $response->successful()) {
                return ['ok' => false, 'error' => 'Não foi possível acessar a API da Revista Adventista (HTTP '.$response->status().').'];
            }

            $posts = $response->json();
            if (! is_array($posts)) {
                return ['ok' => false, 'error' => 'Resposta inválida da API da Revista Adventista.'];
            }

            return ['ok' => true, 'posts' => $posts];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao buscar publicações: '.$e->getMessage()];
        }
    }

    /**
     * @param  array<string, mixed>  $post
     * @return array<string, mixed>|null
     */
    public function mapPost(array $post): ?array
    {
        $wpId = (int) ($post['id'] ?? 0);
        $slug = trim((string) ($post['slug'] ?? ''));
        $title = $this->decodeHtml((string) ($post['title']['rendered'] ?? ''));
        $link = trim((string) ($post['link'] ?? ''));

        if ($wpId <= 0 || $slug === '' || $title === '' || $link === '') {
            return null;
        }

        $categoryIds = array_map('intval', (array) ($post['categories'] ?? []));
        $section = $this->resolveSection($categoryIds);

        $excerptHtml = (string) ($post['excerpt']['rendered'] ?? '');
        $excerpt = trim(strip_tags(html_entity_decode($excerptHtml, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        $excerpt = $excerpt !== '' ? Str::limit($excerpt, 500) : null;

        $body = (string) ($post['content']['rendered'] ?? '');
        if (trim(strip_tags($body)) === '') {
            return null;
        }

        $publishedAt = $this->parseDate((string) ($post['date_gmt'] ?? $post['date'] ?? ''));
        $modifiedAt = $this->parseDate((string) ($post['modified_gmt'] ?? $post['modified'] ?? ''));

        return [
            'wp_post_id' => $wpId,
            'title' => $title,
            'slug' => $slug,
            'excerpt' => $excerpt,
            'body' => $body,
            'author_name' => $this->extractAuthorName($post),
            'source_url' => $link,
            'image_url' => $this->extractFeaturedImageUrl($post),
            'section' => $section,
            'published_at' => $publishedAt,
            'wp_modified_at' => $modifiedAt,
            'synced_at' => now(),
        ];
    }

    /**
     * @param  list<int>  $categoryIds
     */
    public function resolveSection(array $categoryIds): string
    {
        $priority = [
            self::WP_CATEGORY_IDS[RevistaAdventistaArticle::SECTION_BUSSOLA],
            self::WP_CATEGORY_IDS[RevistaAdventistaArticle::SECTION_EDITORIAL],
            self::WP_CATEGORY_IDS[RevistaAdventistaArticle::SECTION_EM_FAMILIA],
            self::WP_CATEGORY_IDS[RevistaAdventistaArticle::SECTION_ARTIGOS],
        ];

        $byId = array_flip($categoryIds);
        foreach ($priority as $wpCategoryId) {
            if (isset($byId[$wpCategoryId])) {
                return array_search($wpCategoryId, self::WP_CATEGORY_IDS, true) ?: RevistaAdventistaArticle::SECTION_ARTIGOS;
            }
        }

        return RevistaAdventistaArticle::SECTION_ARTIGOS;
    }

    /**
     * @param  array<string, mixed>  $post
     */
    private function extractAuthorName(array $post): ?string
    {
        $embedded = $post['_embedded']['author'][0]['name'] ?? null;
        if (is_string($embedded) && trim($embedded) !== '') {
            return trim($embedded);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $post
     */
    private function extractFeaturedImageUrl(array $post): ?string
    {
        $media = $post['_embedded']['wp:featuredmedia'][0] ?? null;
        if (! is_array($media)) {
            return null;
        }

        $url = trim((string) ($media['source_url'] ?? ''));
        if ($url === '' || ! str_starts_with($url, 'http')) {
            return null;
        }

        return $url;
    }

    private function parseDate(string $value): ?Carbon
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function decodeHtml(string $value): string
    {
        return trim(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
}
