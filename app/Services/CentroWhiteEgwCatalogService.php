<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CentroWhiteEgwCatalogService
{
    public const CATALOG_URL = 'https://centrowhite.org.br/downloads/ebooks/';

    private const MAX_BODY_BYTES = 5_000_000;

    /**
     * @return array{ok: bool, items?: list<array{title: string, pdf_url: string, cover_url: string}>, error?: string}
     */
    public function fetchCatalog(): array
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (library sync)'])
                ->get(self::CATALOG_URL);

            if (! $response->successful()) {
                return ['ok' => false, 'error' => 'Não foi possível acessar a página do Centro White.'];
            }

            $body = (string) $response->body();
            if (strlen($body) > self::MAX_BODY_BYTES) {
                return ['ok' => false, 'error' => 'Página do Centro White demasiado grande para processar.'];
            }

            $items = $this->parseHtml($body);
            if ($items === []) {
                return ['ok' => false, 'error' => 'Nenhum livro encontrado na página do Centro White.'];
            }

            return ['ok' => true, 'items' => $items];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao buscar catálogo: '.$e->getMessage()];
        }
    }

    /**
     * @return list<array{title: string, pdf_url: string, cover_url: string}>
     */
    public function parseHtml(string $html): array
    {
        $items = [];
        $seenPdfUrls = [];

        if (! preg_match_all(
            '/<a\s+class="elementor-cta"\s+href="([^"]+\.pdf)"[^>]*>.*?background-image:\s*url\(([^)]+)\).*?<h2[^>]*class="elementor-cta__title[^"]*"[^>]*>(.*?)<\/h2>/is',
            $html,
            $matches,
            PREG_SET_ORDER
        )) {
            return [];
        }

        foreach ($matches as $match) {
            $pdfUrl = $this->normalizeUrl(html_entity_decode(trim($match[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $coverUrl = $this->normalizeUrl(html_entity_decode(trim($match[2]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $title = $this->normalizeTitle(strip_tags(html_entity_decode(trim($match[3]), ENT_QUOTES | ENT_HTML5, 'UTF-8')));

            if ($pdfUrl === '' || $coverUrl === '' || $title === '') {
                continue;
            }

            if (isset($seenPdfUrls[$pdfUrl])) {
                continue;
            }

            $seenPdfUrls[$pdfUrl] = true;
            $items[] = [
                'title' => $title,
                'pdf_url' => $pdfUrl,
                'cover_url' => $coverUrl,
            ];
        }

        return $items;
    }

    public function slugForTitle(string $title): string
    {
        $slug = Str::slug($title);
        if ($slug !== '') {
            return $slug;
        }

        return 'egw-'.substr(md5($title), 0, 12);
    }

    private function normalizeTitle(string $title): string
    {
        $title = preg_replace('/\s+/u', ' ', trim($title)) ?? '';

        return $title;
    }

    private function normalizeUrl(string $url): string
    {
        $url = trim($url, " \t\n\r\0\x0B'\"");
        if ($url === '') {
            return '';
        }
        if (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://')) {
            return '';
        }

        return $url;
    }
}
