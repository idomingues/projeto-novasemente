<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class LibraryExternalPageExtractService
{
    private const MAX_BODY_BYTES = 2_500_000;

    /**
     * Obtém HTML público do URL e devolve um fragmento sanitizado (melhor esforço).
     *
     * @return array{ok: bool, html?: string, error?: string}
     */
    public function fetchAndExtract(string $url): array
    {
        $url = trim($url);
        if ($url === '' || (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://'))) {
            return ['ok' => false, 'error' => 'URL inválida.'];
        }

        try {
            $response = Http::timeout(18)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; NovaSementeLibraryBot/1.0; +'.config('app.url').')',
                    'Accept' => 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'pt-BR,pt;q=0.9,en;q=0.5',
                ])
                ->get($url);
        } catch (\Throwable) {
            return ['ok' => false, 'error' => 'Não foi possível contactar o site. Abra o link no browser.'];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'error' => 'O site não disponibilizou a página para leitura aqui.'];
        }

        $body = $response->body();
        if (strlen($body) > self::MAX_BODY_BYTES) {
            return ['ok' => false, 'error' => 'Página demasiado grande para pré-visualizar.'];
        }

        $fragment = $this->extractMainHtmlFragment($body);
        $textProbe = trim(strip_tags((string) $fragment));

        if ($fragment === null || $textProbe === '') {
            return [
                'ok' => false,
                'error' => 'Não foi possível extrair texto (muitas páginas carregam o texto só com JavaScript). Use «Abrir no site».',
            ];
        }

        return ['ok' => true, 'html' => $this->sanitizeHtml($fragment)];
    }

    private function extractMainHtmlFragment(string $html): ?string
    {
        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $wrapped = '<?xml encoding="utf-8" ?>'.$html;
        $loaded = @$dom->loadHTML($wrapped, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        if (! $loaded) {
            return null;
        }

        $xpath = new \DOMXPath($dom);
        foreach ($xpath->query('//script|//style|//noscript|//iframe|//object|//embed|//svg') as $node) {
            if ($node->parentNode) {
                $node->parentNode->removeChild($node);
            }
        }

        $queries = [
            '//article',
            '//main',
            '//*[contains(concat(" ", normalize-space(@class), " "), " entry-content ")]',
            '//*[contains(concat(" ", normalize-space(@class), " "), " post-content ")]',
            '//*[contains(concat(" ", normalize-space(@class), " "), " single-content ")]',
            '//*[@id="content"]',
        ];

        foreach ($queries as $q) {
            $nodes = $xpath->query($q);
            if ($nodes !== false && $nodes->length > 0) {
                $n = $nodes->item(0);
                if ($n instanceof \DOMNode) {
                    return $dom->saveHTML($n);
                }
            }
        }

        $bodies = $xpath->query('//body');

        if ($bodies !== false && $bodies->length > 0) {
            $b = $bodies->item(0);
            if ($b instanceof \DOMNode) {
                return $dom->saveHTML($b);
            }
        }

        return null;
    }

    private function sanitizeHtml(string $html): string
    {
        $allowed = '<p><br><hr><strong><b><em><i><a><ul><ol><li><h2><h3><h4><blockquote><section>';
        $out = strip_tags($html, $allowed);
        $out = preg_replace('/\s+on\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/iu', '', $out) ?? $out;
        $out = preg_replace('/\s+style\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/iu', '', $out) ?? $out;
        $out = preg_replace('/_?navigate_(before|next)_?/iu', '', $out) ?? $out;

        return preg_replace_callback('/<a\s+([^>]*)>/iu', function (array $m): string {
            if (preg_match('/href\s*=\s*("|\')(https?:\/\/[^"\']+)\1/iu', $m[1], $mm)) {
                $href = htmlspecialchars($mm[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');

                return '<a href="'.$href.'" rel="noopener noreferrer" target="_blank">';
            }

            return '<span>';
        }, $out) ?? $out;
    }
}
