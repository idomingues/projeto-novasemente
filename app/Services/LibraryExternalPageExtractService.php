<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class LibraryExternalPageExtractService
{
    private const MAX_BODY_BYTES = 2_500_000;

    public function __construct(
        private readonly BibleReferenceService $bibleReferences,
    ) {}

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

        $fetched = $this->fetchPublicHtml($url);
        if (! $fetched['ok']) {
            return $fetched;
        }
        $body = (string) ($fetched['body'] ?? '');

        if ($libraryKind === 'meditation') {
            $resolvedUrl = $this->resolveCpbMeditationDailyUrlFromIndexIfApplicable($url, $body);
            if ($resolvedUrl !== null && $resolvedUrl !== $url) {
                $fetchedDaily = $this->fetchPublicHtml($resolvedUrl);
                if ($fetchedDaily['ok']) {
                    $url = $resolvedUrl;
                    $body = (string) ($fetchedDaily['body'] ?? '');
                }
            }
        }

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
        $meditationStructured = false;

        if ($libraryKind === 'meditation') {
            $rebuilt = $this->restructureCpbMeditationFragmentIfApplicable($fragment);
            if ($rebuilt !== null) {
                $fragment = $rebuilt;
                $meditationStructured = true;
            }
        }

        if ($libraryKind === 'lesson') {
            $panelBlocks = $this->splitCpbLessonByTabPanels($fragment);
            if ($panelBlocks !== null && count($panelBlocks) >= 2) {
                $segments = [];
                foreach ($panelBlocks as $i => $block) {
                    $cleaned = $this->stripLessonHtmlNoise($block['html']);
                    $sanitized = $this->sanitizeHtml($cleaned);
                    $polished = $this->polishLibraryReaderHtml($sanitized, true);
                    $polished = $this->bibleReferences->linkifyLessonHtml($polished);
                    if (trim(strip_tags($polished)) === '') {
                        continue;
                    }
                    $segments[] = [
                        'slug' => $block['slug'].'-'.$i,
                        'label' => $block['label'],
                        'html' => $polished,
                        'question' => isset($block['question']) && is_string($block['question']) && trim($block['question']) !== ''
                            ? $this->linkifyLessonQuestion(trim($block['question']))
                            : null,
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
            $fragment = $this->stripLessonHtmlNoise($fragment);
        }

        $sanitized = $this->sanitizeHtml($fragment);
        $html = $this->polishLibraryReaderHtml($sanitized, ! $meditationStructured);
        if ($libraryKind === 'lesson') {
            $html = $this->bibleReferences->linkifyLessonHtml($html);
        }

        return [
            'ok' => true,
            'html' => $html,
        ];
    }

    /**
     * @return array{ok: bool, body?: string, error?: string}
     */
    private function fetchPublicHtml(string $url): array
    {
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

        return ['ok' => true, 'body' => $response->body()];
    }

    /**
     * CPB: quando a URL é a listagem de meditações diárias, o conteúdo real está no botão "LER DEVOCIONAL".
     *
     * @return string|null URL absoluta da meditação do dia
     */
    private function resolveCpbMeditationDailyUrlFromIndexIfApplicable(string $url, string $indexHtml): ?string
    {
        $lowerUrl = strtolower($url);
        $isHojeRedirect = str_contains($lowerUrl, 'meditacao-jovem-hoje')
            || str_contains($lowerUrl, 'meditacao-mulher-hoje');
        $looksLikeIndex = str_contains($lowerUrl, 'mais.cpb.com.br/meditacoes-diarias')
            || str_contains($lowerUrl, 'mais.cpb.com.br/meditacao-da-mulher')
            || (str_contains($lowerUrl, 'mais.cpb.com.br/meditacao-jovem') && ! $isHojeRedirect);

        if (! $looksLikeIndex && ! $isHojeRedirect) {
            return null;
        }

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $wrapped = '<?xml encoding="utf-8" ?>'.$indexHtml;
        if (! @$dom->loadHTML($wrapped, LIBXML_NOWARNING | LIBXML_NOERROR)) {
            libxml_clear_errors();

            return null;
        }
        libxml_clear_errors();

        $xp = new \DOMXPath($dom);

        if ($isHojeRedirect) {
            // Páginas *-hoje: meta/JS redirecionam; o HTML traz «clique aqui» com post_type=meditacao.
            $nodes = $xp->query('//a[@href[contains(., "post_type=meditacao")]]');
            if ($nodes !== false && $nodes->length > 0) {
                $href = (string) (($nodes->item(0) instanceof \DOMElement) ? $nodes->item(0)->getAttribute('href') : '');
                $href = trim(html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                if ($href !== '') {
                    return $this->absolutizeUrl($url, $href);
                }
            }

            if (preg_match('/https?:\\\\\/\\\\\/mais\.cpb\.com\.br\\\\\/\?post_type=meditacao[^"\']*/i', $indexHtml, $m)) {
                $raw = stripcslashes($m[0]);

                return html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }

            return null;
        }

        // 1) Caso comum: <a href="..."><button>LER DEVOCIONAL</button></a>
        $nodes = $xp->query(
            '//a[@href][.//button[contains(translate(normalize-space(string(.)), "abcdefghijklmnopqrstuvwxyzáàâãäçéèêëíìîïñóòôõöúùûü", "abcdefghijklmnopqrstuvwxyzáàâãäçéèêëíìîïñóòôõöúùûü"), "ler devocional")]]'
        );
        if ($nodes !== false && $nodes->length > 0) {
            $href = (string) (($nodes->item(0) instanceof \DOMElement) ? $nodes->item(0)->getAttribute('href') : '');
            $href = trim(html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($href !== '') {
                return $this->absolutizeUrl($url, $href);
            }
        }

        // 2) Fallback: âncora cujo texto contém "Ler Devocional"
        $nodes = $xp->query(
            '//a[@href][contains(translate(normalize-space(string(.)), "abcdefghijklmnopqrstuvwxyzáàâãäçéèêëíìîïñóòôõöúùûü", "abcdefghijklmnopqrstuvwxyzáàâãäçéèêëíìîïñóòôõöúùûü"), "ler devocional")]'
        );
        if ($nodes !== false && $nodes->length > 0) {
            $href = (string) (($nodes->item(0) instanceof \DOMElement) ? $nodes->item(0)->getAttribute('href') : '');
            $href = trim(html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($href !== '') {
                return $this->absolutizeUrl($url, $href);
            }
        }

        // 3) Último fallback: primeiro link que parece a meditação do dia (?post_type=meditacao&p=...)
        $nodes = $xp->query('//a[@href[contains(., "post_type=meditacao")]]');
        if ($nodes !== false && $nodes->length > 0) {
            $href = (string) (($nodes->item(0) instanceof \DOMElement) ? $nodes->item(0)->getAttribute('href') : '');
            $href = trim(html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($href !== '') {
                return $this->absolutizeUrl($url, $href);
            }
        }

        return null;
    }

    private function absolutizeUrl(string $baseUrl, string $href): string
    {
        $href = trim($href);
        if ($href === '') {
            return $baseUrl;
        }
        if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
            return $href;
        }
        if (str_starts_with($href, '//')) {
            return 'https:'.$href;
        }

        $parts = parse_url($baseUrl);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? '';
        if ($host === '') {
            return $href;
        }
        $origin = $scheme.'://'.$host;

        if (str_starts_with($href, '/')) {
            return $origin.$href;
        }

        $basePath = $parts['path'] ?? '/';
        $dir = rtrim(str_replace('\\', '/', dirname($basePath)), '/');

        return $origin.($dir !== '' ? '/'.$dir : '').'/'.$href;
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
            $split = $this->splitLessonHtmlAndQuestion($slice);
            $segments[] = [
                'slug' => $slug,
                'label' => $label,
                'html' => $split['html'],
                'question' => $split['question'],
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

        return trim($s, '-');
    }

    /**
     * @return array{html: string, question: string|null}
     */
    private function splitLessonHtmlAndQuestion(string $html): array
    {
        $html = trim($html);
        if ($html === '') {
            return ['html' => '', 'question' => null];
        }

        if (preg_match('/<blockquote>\s*<p>\s*<em>([\s\S]*?)<\/em>\s*<\/p>\s*<\/blockquote>\s*$/iu', $html, $m)) {
            $question = trim(html_entity_decode(strip_tags((string) ($m[1] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $question = preg_replace('/\s+/u', ' ', $question) ?? $question;
            $stripped = trim((string) preg_replace('/<blockquote>\s*<p>\s*<em>[\s\S]*?<\/em>\s*<\/p>\s*<\/blockquote>\s*$/iu', '', $html));
            if ($question !== '') {
                return ['html' => $stripped, 'question' => $question];
            }
        }

        return ['html' => $html, 'question' => null];
    }

    private function linkifyLessonQuestion(string $question): string
    {
        $question = $this->normalizeReaderTextValue($question);
        $linked = $this->bibleReferences->linkifyPlainText($question);

        return $linked !== '' ? $linked : '<p>'.htmlspecialchars($question, ENT_QUOTES | ENT_HTML5, 'UTF-8').'</p>';
    }

    /**
     * Formata o fragmento para leitura na app: remove rodapés CPB; opcionalmente destaca data no texto corrido.
     *
     * @param  bool  $applyLeadingDateEmphasis  Falso quando a meditação CPB já foi reestruturada em HTML semântico.
     */
    private function polishLibraryReaderHtml(string $html, bool $applyLeadingDateEmphasis = true): string
    {
        $html = $this->stripCpbPromoFooters($html);
        if ($applyLeadingDateEmphasis) {
            $html = $this->emphasizeWeekdayAndDateWithLineBreak($html);
        }
        $html = $this->normalizeReaderTextArtifacts($html);

        return $html;
    }

    private function normalizeReaderTextArtifacts(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return '';
        }

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $wrapped = '<?xml encoding="utf-8" ?><div id="library-reader-root">'.$html.'</div>';
        if (! @$dom->loadHTML($wrapped, LIBXML_NOWARNING | LIBXML_NOERROR)) {
            libxml_clear_errors();

            return $this->normalizeReaderTextValue($html);
        }
        libxml_clear_errors();

        $root = $dom->getElementById('library-reader-root');
        if (! $root instanceof \DOMElement) {
            return $this->normalizeReaderTextValue($html);
        }

        $this->normalizeReaderTextNodes($root);

        $normalized = '';
        foreach ($root->childNodes as $child) {
            $normalized .= $dom->saveHTML($child);
        }

        return trim($normalized);
    }

    private function normalizeReaderTextNodes(\DOMNode $node): void
    {
        foreach ($node->childNodes as $child) {
            if ($child instanceof \DOMText) {
                $child->nodeValue = $this->normalizeReaderTextValue($child->nodeValue ?? '');

                continue;
            }

            $this->normalizeReaderTextNodes($child);
        }
    }

    private function normalizeReaderTextValue(string $text): string
    {
        if ($text === '') {
            return '';
        }

        $text = str_replace("\u{00AD}", '', $text);
        $text = str_replace("\u{00A0}", ' ', $text);
        $text = preg_replace('/\[\s*(?:\.{3}|…)\s*\]/u', ' ', $text) ?? $text;
        $text = strtr($text, [
            'cora-ção' => 'coração',
            'pos-tura' => 'postura',
            'sabe-mos' => 'sabemos',
            'pre-parou' => 'preparou',
        ]);
        $text = preg_replace('/\s+([,.;:!?])/u', '$1', $text) ?? $text;
        $text = preg_replace('/([(\["“‘])\s+/u', '$1', $text) ?? $text;
        $text = preg_replace('/\s{2,}/u', ' ', $text) ?? $text;

        return $text;
    }

    /**
     * Meditação CPB: data em divs separados, título e versículo em blocos próprios — evita texto corrido após strip_tags.
     */
    private function restructureCpbMeditationFragmentIfApplicable(string $fragment): ?string
    {
        if (! str_contains($fragment, 'diaMesMeditacao') || ! str_contains($fragment, 'versoBiblico')) {
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

        $xp = new \DOMXPath($dom);

        $weekday = $this->cpbDomFirstNormalizedText($xp, '//*[contains(concat(" ", normalize-space(@class), " "), " diaSemanaMeditacao ")]');
        $dayMonth = $this->cpbDomFirstNormalizedText($xp, '//*[contains(concat(" ", normalize-space(@class), " "), " diaMesMeditacao ")]');

        $title = '';
        $headlineNodes = $xp->query('//*[contains(concat(" ", normalize-space(@class), " "), " titleMeditacao ")]//*[contains(@class, "mdl-typography--headline")]');
        if ($headlineNodes !== false && $headlineNodes->length > 0) {
            $title = $this->normalizeCpbWhitespace((string) $headlineNodes->item(0)->textContent);
        }
        if ($title === '') {
            $title = $this->cpbDomFirstNormalizedText($xp, '//*[contains(concat(" ", normalize-space(@class), " "), " titleMeditacao ")]');
        }

        $verse = $this->cpbDomFirstNormalizedText($xp, '//*[contains(concat(" ", normalize-space(@class), " "), " versoBiblico ")]');

        $contentInner = '';
        $contentNodes = $xp->query('//*[contains(concat(" ", normalize-space(@class), " "), " conteudoMeditacao ")]');
        if ($contentNodes !== false && $contentNodes->length > 0) {
            $box = $contentNodes->item(0);
            if ($box instanceof \DOMNode) {
                foreach ($box->childNodes as $child) {
                    $contentInner .= $dom->saveHTML($child);
                }
            }
        }

        if ($weekday === '' && $dayMonth === '' && $title === '' && $verse === '' && trim(strip_tags($contentInner)) === '') {
            return null;
        }

        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $html = '';
        if ($weekday !== '' || $dayMonth !== '') {
            $html .= '<p>';
            if ($weekday !== '') {
                $html .= '<strong>'.$esc($weekday).'</strong>';
            }
            if ($dayMonth !== '') {
                $html .= ($weekday !== '' ? ' ' : '').'<strong>'.$esc($dayMonth).'</strong>';
            }
            $html .= '</p>';
        }
        if ($title !== '') {
            $html .= '<h2>'.$esc($title).'</h2>';
        }
        if ($verse !== '') {
            $html .= '<p><em><strong>'.$esc($verse).'</strong></em></p>';
        }
        $html .= $contentInner;

        return $html !== '' ? $html : null;
    }

    private function cpbDomFirstNormalizedText(\DOMXPath $xp, string $expr): string
    {
        $nodes = $xp->query($expr);
        if ($nodes === false || $nodes->length === 0) {
            return '';
        }

        return $this->normalizeCpbWhitespace((string) $nodes->item(0)->textContent);
    }

    private function normalizeCpbWhitespace(string $text): string
    {
        $t = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);

        return $t;
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
            $serialized = $this->serializeCpbLessonPanelToReaderHtml($dom, $panel);
            $inner = trim($serialized['html']) !== ''
                ? $serialized['html']
                : $this->fallbackCpbLessonPanelInnerHtml($dom, $panel);
            if ($inner === '') {
                continue;
            }
            $out[] = [
                'slug' => $def['slug'],
                'label' => $def['label'],
                'html' => $inner,
                'question' => $serialized['question'],
            ];
        }

        return count($out) >= 2 ? $out : null;
    }

    private function fallbackCpbLessonPanelInnerHtml(\DOMDocument $dom, \DOMElement $panel): string
    {
        $inner = '';
        foreach ($panel->childNodes as $child) {
            $inner .= $dom->saveHTML($child);
        }

        return trim($inner);
    }

    /**
     * Reconstrói o HTML de leitura a partir do painel CPB (preserva blocos que sumiam com strip_tags nos divs).
     *
     * Padrão alinhado ao layout CPB: Sábado = lição + datas + título do trimestre + meta (subtítulo + ano) + verso + leituras + texto;
     * demais dias = meta (data do dia + ano) + título do dia + texto (sem repetir o título do trimestre).
     *
     * @return array{html: string, question: string|null}
     */
    private function serializeCpbLessonPanelToReaderHtml(\DOMDocument $dom, \DOMElement $panel): array
    {
        $xp = new \DOMXPath($dom);
        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $t = fn (string $rel): string => $this->cpbXPathFirstText($xp, $panel, $rel);

        $html = '';
        $question = null;

        $num = $t('.//*[contains(concat(" ", normalize-space(@class), " "), " numberLicao ")]');
        $dateRange = $t('.//*[contains(concat(" ", normalize-space(@class), " "), " dateLicao ")]');
        $isIntroSaturday = ($num !== '' || $dateRange !== '');

        if ($isIntroSaturday) {
            if ($num !== '' || $dateRange !== '') {
                $html .= '<p>';
                if ($num !== '') {
                    $html .= '<strong>'.$esc($num).'</strong>';
                }
                if ($dateRange !== '') {
                    $html .= ($num !== '' ? '<br>' : '').'<strong>'.$esc($dateRange).'</strong>';
                }
                $html .= '</p>';
            }

            $series = $t('.//*[contains(concat(" ", normalize-space(@class), " "), " titleLicao ")][not(contains(@class, "titleLicaoDay"))]//*[contains(@class, "mdl-typography--display-1")]');
            if ($series !== '') {
                $html .= '<h2>'.$esc($series).'</h2>';
            }
        }

        $dayCal = $t('.//*[contains(concat(" ", normalize-space(@class), " "), " descriptionText ")][not(contains(@class, "numberLicao"))][not(contains(@class, "dateLicao"))][not(contains(@class, "anoBiblicoDia"))][not(contains(@class, "diaMes"))]');
        $diaEtiqueta = $t('.//*[contains(concat(" ", normalize-space(@class), " "), " descriptionText ")][contains(@class, "dia")][contains(@class, "Licao")]');
        $ano = $t('.//*[contains(concat(" ", normalize-space(@class), " "), " anoBiblicoDia ")]');

        $metaLine = [];
        if ($dayCal !== '') {
            $metaLine[] = '<strong>'.$esc($dayCal).'</strong>';
        }
        if ($diaEtiqueta !== '' && $diaEtiqueta !== $dayCal) {
            $metaLine[] = '<strong>'.$esc($diaEtiqueta).'</strong>';
        }
        if ($ano !== '') {
            $metaLine[] = '<strong>'.$esc($ano).'</strong>';
        }
        if ($metaLine !== []) {
            $html .= '<p>'.implode(' — ', $metaLine).'</p>';
        }

        $versoBox = $this->cpbXPathFirstElement($xp, $panel, './/*[contains(concat(" ", normalize-space(@class), " "), " versoMemorizarLicao ")]');
        $html .= $this->serializeCpbVersoOuLeiturasBox($xp, $versoBox, $esc, 'versoMemorizarChamada', 'versoMemorizar', 'Verso para memorizar', true);

        $leiturasBox = $this->cpbXPathFirstElement($xp, $panel, './/*[contains(concat(" ", normalize-space(@class), " "), " leiturasSemanaLicao ")]');
        $html .= $this->serializeCpbVersoOuLeiturasBox($xp, $leiturasBox, $esc, 'leiturasSemanaChamada', 'leiturasSemana', 'Leituras da semana', false);

        $dayTitle = $t('.//*[contains(concat(" ", normalize-space(@class), " "), " titleLicaoDay ")]//*[contains(@class, "mdl-typography--headline")]');
        if ($dayTitle !== '') {
            $html .= '<h2>'.$esc($dayTitle).'</h2>';
        }

        $conteudo = $this->cpbXPathFirstElement($xp, $panel, './/*[contains(concat(" ", normalize-space(@class), " "), " conteudoLicaoDia ")]');
        if ($conteudo instanceof \DOMElement) {
            foreach ($conteudo->childNodes as $child) {
                $html .= $dom->saveHTML($child);
            }
        }

        $rodape = $this->cpbXPathFirstElement($xp, $panel, './/*[contains(concat(" ", normalize-space(@class), " "), " rodapeBoxLicaoDia ")]');
        if ($rodape instanceof \DOMElement) {
            $v = $this->normalizeCpbWhitespace($rodape->textContent ?? '');
            if ($v !== '') {
                $question = $v;
            }
        }

        return [
            'html' => trim($html),
            'question' => $question,
        ];
    }

    /**
     * @param  bool  $italicBody  verso em itálico; leituras em texto normal
     */
    private function serializeCpbVersoOuLeiturasBox(
        \DOMXPath $xp,
        ?\DOMElement $box,
        callable $esc,
        string $classChamada,
        string $classCorpo,
        string $defaultChamada,
        bool $italicBody
    ): string {
        if (! $box instanceof \DOMElement) {
            return '';
        }

        $chNode = $xp->query('.//*[contains(@class, "'.$classChamada.'")]', $box)->item(0);
        $bodyNode = $xp->query(
            './/*[contains(@class, "'.$classCorpo.'")][not(contains(@class, "Chamada"))]',
            $box
        )->item(0);

        $chamada = $chNode instanceof \DOMElement
            ? $this->normalizeCpbWhitespace($chNode->textContent ?? '')
            : '';
        if ($chamada === '') {
            $chamada = $defaultChamada;
        }
        $chamadaOriginal = $chamada;
        if (! str_ends_with($chamada, ':')) {
            $chamada .= ':';
        }

        $corpo = $bodyNode instanceof \DOMElement
            ? $this->normalizeCpbWhitespace($bodyNode->textContent ?? '')
            : '';
        if ($corpo === '') {
            $whole = $this->normalizeCpbWhitespace($box->textContent ?? '');
            $corpo = trim(preg_replace('/^\s*'.preg_quote($chamadaOriginal, '/').'\s*/iu', '', $whole) ?? $whole);
            $corpo = trim(preg_replace('/^\s*'.preg_quote($chamada, '/').'\s*/iu', '', $corpo) ?? $corpo);
        }
        if ($corpo === '') {
            return '';
        }

        $label = mb_strtoupper($chamada, 'UTF-8');
        $openBody = $italicBody ? '<p><em>' : '<p>';
        $closeBody = $italicBody ? '</em></p>' : '</p>';

        return '<blockquote><p><strong>'.$esc($label).'</strong></p>'.$openBody.$esc($corpo).$closeBody.'</blockquote>';
    }

    private function cpbXPathFirstText(\DOMXPath $xp, \DOMElement $ctx, string $expr): string
    {
        $el = $this->cpbXPathFirstElement($xp, $ctx, $expr);
        if (! $el instanceof \DOMElement) {
            return '';
        }

        return $this->normalizeCpbWhitespace($el->textContent ?? '');
    }

    private function cpbXPathFirstElement(\DOMXPath $xp, \DOMElement $ctx, string $expr): ?\DOMElement
    {
        $nodes = $xp->query($expr, $ctx);
        if ($nodes === false || $nodes->length === 0) {
            return null;
        }
        $n = $nodes->item(0);

        return $n instanceof \DOMElement ? $n : null;
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
            '/<p[^>]*>\s*<strong>\s*Garanta o conteúdo completo da Lição da Escola Sabatina[\s\S]*?<\/strong>[\s\S]*?<\/p>/iu',
            '',
            $html
        ) ?? $html;
        $html = preg_replace('/<p[^>]*>\s*<iframe[^>]*>[\s\S]*?<\/iframe>\s*<\/p>/iu', '', $html) ?? $html;
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
