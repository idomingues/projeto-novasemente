<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class LibraryExternalPageExtractService
{
    private const MAX_BODY_BYTES = 2_500_000;

    /**
     * Obtém HTML público do URL e devolve um fragmento sanitizado (melhor esforço).
     *
     * @param  string|null  $libraryKind  `lesson` ou `meditation` para heurísticas específicas.
     * @return array{ok: bool, html?: string, error?: string, segments?: list<array{slug: string, label: string, html: string}>|null}
     */
    public function fetchAndExtract(string $url, ?string $libraryKind = null): array
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

        $fragment = (string) $fragment;

        if ($libraryKind === 'lesson') {
            $fragment = $this->stripLessonHtmlNoise($fragment);
            $panelBlocks = $this->splitCpbLessonByTabPanels($fragment);
            if ($panelBlocks !== null && count($panelBlocks) >= 2) {
                $segments = [];
                foreach ($panelBlocks as $i => $block) {
                    $sanitized = $this->sanitizeHtml($block['html']);
                    $polished = $this->polishLibraryReaderHtml($sanitized);
                    if (trim(strip_tags($polished)) === '') {
                        continue;
                    }
                    $segments[] = [
                        'slug' => $block['slug'].'-'.$i,
                        'label' => $block['label'],
                        'html' => $polished,
                    ];
                }
                if (count($segments) >= 2) {
                    return [
                        'ok' => true,
                        'html' => $segments[0]['html'],
                        'segments' => $segments,
                    ];
                }
            }
        }

        $sanitized = $this->sanitizeHtml($fragment);

        return ['ok' => true, 'html' => $this->polishLibraryReaderHtml($sanitized)];
    }

    /**
     * Divide HTML da lição em blocos por dia da semana (cabeçalhos no conteúdo).
     *
     * @return list<array{slug: string, label: string, html: string}>
     */
    public function segmentLessonHtmlByWeekday(string $html): array
    {
        $html = trim($html);
        if ($html === '') {
            return [['slug' => 'all', 'label' => 'Lição', 'html' => $html]];
        }

        $matched = preg_match_all('/<h([1-4])[^>]*>(.*?)<\/h\1>/is', $html, $m, PREG_OFFSET_CAPTURE);
        if ($matched === false || $matched < 1) {
            return [['slug' => 'all', 'label' => 'Lição', 'html' => $html]];
        }

        $hits = [];
        $n = count($m[0]);
        for ($i = 0; $i < $n; $i++) {
            $full = $m[0][$i][0] ?? '';
            $off = (int) ($m[0][$i][1] ?? 0);
            $inner = (string) ($m[2][$i][0] ?? '');
            $dayLabel = $this->lessonHeadingWeekdayLabel($inner);
            if ($dayLabel === null) {
                continue;
            }
            $hits[] = ['offset' => $off, 'label' => $dayLabel];
        }

        if (count($hits) < 2) {
            return [['slug' => 'all', 'label' => 'Lição', 'html' => $html]];
        }

        usort($hits, fn (array $a, array $b): int => $a['offset'] <=> $b['offset']);

        $segments = [];
        for ($i = 0; $i < count($hits); $i++) {
            $start = $hits[$i]['offset'];
            $end = $i + 1 < count($hits) ? $hits[$i + 1]['offset'] : strlen($html);
            $slice = trim(substr($html, $start, max(0, $end - $start)));
            if ($slice === '') {
                continue;
            }
            $label = $hits[$i]['label'];
            $slug = $this->asciiSlug($label).'-'.$i;
            $segments[] = [
                'slug' => $slug,
                'label' => $label,
                'html' => $slice,
            ];
        }

        return count($segments) > 0 ? $segments : [['slug' => 'all', 'label' => 'Lição', 'html' => $html]];
    }

    private function lessonHeadingWeekdayLabel(string $innerHtml): ?string
    {
        $t = trim(html_entity_decode(strip_tags($innerHtml), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $t = preg_replace('/\s+/u', ' ', $t) ?? $t;

        $checks = [
            ['label' => 'Sábado', 'needles' => ['sábado', 'sabado']],
            ['label' => 'Domingo', 'needles' => ['domingo']],
            ['label' => 'Segunda', 'needles' => ['segunda-feira', 'segunda', 'segunda ', 'segunda,']],
            ['label' => 'Terça', 'needles' => ['terça-feira', 'terca-feira', 'terça', 'terca', 'terça,', 'terca,']],
            ['label' => 'Quarta', 'needles' => ['quarta-feira', 'quarta', 'quarta,']],
            ['label' => 'Quinta', 'needles' => ['quinta-feira', 'quinta', 'quinta,']],
            ['label' => 'Sexta', 'needles' => ['sexta-feira', 'sexta', 'sexta,']],
        ];

        $lower = mb_strtolower($t, 'UTF-8');
        foreach ($checks as $row) {
            foreach ($row['needles'] as $n) {
                if (mb_stripos($lower, mb_strtolower($n, 'UTF-8'), 0, 'UTF-8') !== false) {
                    return $row['label'];
                }
            }
        }

        return null;
    }

    private function asciiSlug(string $s): string
    {
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
        $s = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $s) ?? $s);

        return trim($s, '-') ?: 'dia';
    }

    /**
     * Formata o fragmento para leitura na app: remove rodapés CPB, destaca data e quebra linha após o cabeçalho da data.
     */
    private function polishLibraryReaderHtml(string $html): string
    {
        $html = $this->stripCpbPromoFooters($html);
        $html = $this->emphasizeWeekdayAndDateWithLineBreak($html);

        return $html;
    }

    private function stripCpbPromoFooters(string $html): string
    {
        $html = preg_replace(
            '/<p\b[^>]*>\s*<a\b[^>]*>[\s\S]*?Ler outras meditações[\s\S]*?<\/a>\s*<\/p>/iu',
            '',
            $html
        ) ?? $html;
        $html = preg_replace(
            '/<p\b[^>]*>[\s\S]*?Ler outras meditações\s+de\s+\d{4}[\s\S]*?<\/p>/iu',
            '',
            $html
        ) ?? $html;
        $html = preg_replace('/\s*Ler outras meditações\s+de\s+\d{4}\s*/iu', '', $html) ?? $html;

        return $html;
    }

    /**
     * Primeira ocorrência de «dia da semana + dia de mês»: destaque e quebra antes do título/corpo seguinte.
     */
    private function emphasizeWeekdayAndDateWithLineBreak(string $html): string
    {
        $months = 'janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro';
        $weekday = '(?:(?:Segunda|Terça|Terca|Quarta|Quinta|Sexta)(?:-feira)?|Sábado|Sabado|Domingo)';
        $pattern = '/(?<=>)(\s*)('.$weekday.')\s*,?\s*(\d{1,2}\s+de\s+(?:'.$months.'))(\s+)/iu';

        return preg_replace(
            $pattern,
            '$1<strong>$2</strong> <strong>$3</strong><br>$4',
            $html,
            1
        ) ?? $html;
    }

    /**
     * Lições CPB (mais.cpb.com.br): painéis por dia em div#licaoSabado … #licaoSexta.
     *
     * @return list<array{slug: string, label: string, html: string}>|null
     */
    private function splitCpbLessonByTabPanels(string $fragment): ?array
    {
        if (! str_contains($fragment, 'licaoSabado')) {
            return null;
        }

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $wrapped = '<?xml encoding="utf-8" ?>'.$fragment;
        if (! @$dom->loadHTML($wrapped, LIBXML_NOWARNING | LIBXML_NOERROR)) {
            libxml_clear_errors();

            return null;
        }
        libxml_clear_errors();

        $this->removeCpbLessonChromeFromDom($dom);

        $xp = new \DOMXPath($dom);
        $defs = [
            ['id' => 'licaoSabado', 'slug' => 'sabado', 'label' => 'Sábado'],
            ['id' => 'licaoDomingo', 'slug' => 'domingo', 'label' => 'Domingo'],
            ['id' => 'licaoSegunda', 'slug' => 'segunda', 'label' => 'Segunda'],
            ['id' => 'licaoTerca', 'slug' => 'terca', 'label' => 'Terça'],
            ['id' => 'licaoQuarta', 'slug' => 'quarta', 'label' => 'Quarta'],
            ['id' => 'licaoQuinta', 'slug' => 'quinta', 'label' => 'Quinta'],
            ['id' => 'licaoSexta', 'slug' => 'sexta', 'label' => 'Sexta'],
        ];

        $out = [];
        foreach ($defs as $def) {
            $id = $def['id'];
            if (! preg_match('/^[a-zA-Z0-9_-]+$/', $id)) {
                continue;
            }
            $nodes = $xp->query('//*[@id="'.$id.'"]');
            if ($nodes === false || $nodes->length === 0) {
                continue;
            }
            $panel = $nodes->item(0);
            if (! $panel instanceof \DOMElement) {
                continue;
            }
            $inner = '';
            foreach ($panel->childNodes as $child) {
                $inner .= $dom->saveHTML($child);
            }
            $inner = trim($inner);
            if ($inner === '') {
                continue;
            }
            $out[] = [
                'slug' => $def['slug'],
                'label' => $def['label'],
                'html' => $inner,
            ];
        }

        return count($out) >= 2 ? $out : null;
    }

    /**
     * Remove assinaturas, vídeo incorporado, áudio e apps (barra de dias e painéis extra tratados em DOM em {@see splitCpbLessonByTabPanels}).
     */
    private function stripLessonHtmlNoise(string $html): string
    {
        $html = preg_replace(
            '/<a[^>]*href=("|\')[^"\']*(?:campanhas\/licoes|classificacao\/index\/300)[^"\']*\1[^>]*>[\s\S]*?<button[^>]*assinatura-button[^>]*>[\s\S]*?Assine a lição[\s\S]*?<\/button>[\s\S]*?<\/a>/iu',
            '',
            $html
        ) ?? $html;
        $html = preg_replace('/<button[^>]*assinatura-button[^>]*>[\s\S]*?Assine a lição[\s\S]*?<\/button>/iu', '', $html) ?? $html;
        $html = preg_replace(
            '/<p[^>]*>\s*<strong>[\s\S]*?Garanta o conteúdo completo da Lição da Escola Sabatina[\s\S]*?<\/strong>[\s\S]*?<\/p>/iu',
            '',
            $html
        ) ?? $html;
        $html = preg_replace(
            '/<p[^>]*>[\s\S]*?<a[^>]*>[\s\S]*?Faça aqui a sua assinatura[\s\S]*?<\/a>[\s\S]*?<\/p>/iu',
            '',
            $html
        ) ?? $html;
        $html = preg_replace('/<p[^>]*>[\s\S]*?<iframe[^>]*>[\s\S]*?<\/iframe>[\s\S]*?<\/p>/iu', '', $html) ?? $html;
        $html = preg_replace('/<iframe[^>]*>[\s\S]*?<\/iframe>/iu', '', $html) ?? $html;
        $html = preg_replace('/<div[^>]*class="[^"]*audioLicaoDia[^"]*"[^>]*>[\s\S]*?<\/div>/iu', '', $html) ?? $html;
        $html = preg_replace('/<div[^>]*class="[^"]*downloadApp[^"]*"[^>]*>[\s\S]*?<\/div>/iu', '', $html) ?? $html;
        $html = preg_replace('/<p[^>]*>\s*<strong>\s*Dicas para a história\s*<\/strong>[\s\S]*?<\/p>/iu', '', $html) ?? $html;

        return trim($html);
    }

    private function removeCpbLessonChromeFromDom(\DOMDocument $dom): void
    {
        $xp = new \DOMXPath($dom);
        $toRemove = [];

        $tabBars = $xp->query('//*[contains(concat(" ", normalize-space(@class), " "), " mdl-tabs__tab-bar ") or contains(@class, "mdl-tabs__tab-bar")]');
        if ($tabBars !== false) {
            foreach ($tabBars as $n) {
                $toRemove[] = $n;
            }
        }

        foreach (['licaoAuxiliar', 'licaoInformativo', 'licaoComentario'] as $jid) {
            $nodes = $xp->query('//*[@id="'.$jid.'"]');
            if ($nodes !== false) {
                foreach ($nodes as $n) {
                    $toRemove[] = $n;
                }
            }
        }

        foreach ($toRemove as $n) {
            if ($n->parentNode) {
                $n->parentNode->removeChild($n);
            }
        }
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
