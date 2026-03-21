<?php

/**
 * Extrai o texto do corpo das páginas institucional.adventistas.org/pt/nossas-crencas/{slug}/
 * e gera resources/js/data/adventistBeliefsFullText.gen.ts
 *
 * Uso: php scripts/fetch-adventist-beliefs-text.php
 */
$slugs = [
    '1-as-escrituras-sagradas', '2-a-trindade', '3-o-pai', '4-o-filho', '5-o-espirito-santo', '6-a-criacao',
    '7-a-natureza-da-humanidade', '8-o-grande-conflito', '9-vida-morte-e-ressurreicao-de-cristo',
    '10-a-experiencia-da-salvacao', '11-crescimento-em-cristo', '12-a-igreja', '13-o-remanescente-e-sua-missao',
    '14-unidade-no-corpo-de-cristo', '15-o-batismo', '16-a-ceia-do-senhor', '17-dons-e-ministerios-espirituais',
    '18-o-dom-de-profecia', '19-a-lei-de-deus', '20-o-sabado', '21-mordomia', '22-conduta-crista',
    '23-o-casamento-e-a-familia', '24-o-ministerio-de-cristo-no-santuario-celestial', '25-a-segunda-vinda-de-cristo',
    '26-morte-e-ressurreicao', '27-o-milenio-e-o-fim-do-pecado', '28-a-nova-terra',
];

function fetchUrl(string $url): string
{
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 60,
            'header' => "User-Agent: NovaSementeBeliefsFetcher/1.0\r\n",
        ],
    ]);
    $html = @file_get_contents($url, false, $ctx);

    return is_string($html) ? $html : '';
}

function stripNoise(string $html): string
{
    $html = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html) ?? $html;
    $html = preg_replace('#<style\b[^>]*>.*?</style>#is', '', $html) ?? $html;

    return $html;
}

function extractPostText(string $html): string
{
    $html = stripNoise($html);
    $pos = strpos($html, 'elementor-widget-theme-post-content');
    if ($pos === false) {
        return '';
    }
    $end = strpos($html, 'Veja também', $pos);
    if ($end === false) {
        $end = $pos + 80000;
    }
    $chunk = substr($html, $pos, $end - $pos);
    preg_match_all('#<div class="elementor-widget-container">(.*?)</div>\s*</div>#s', $chunk, $matches);
    $parts = [];
    foreach ($matches[1] as $inner) {
        $text = strip_tags($inner);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', trim($text)) ?? '';
        if (mb_strlen($text) > 40) {
            $parts[] = $text;
        }
    }

    return implode("\n\n", $parts);
}

$base = 'https://institucional.adventistas.org/pt/nossas-crencas/';
$out = [];

foreach ($slugs as $slug) {
    $url = $base.$slug.'/';
    echo $slug.' … ';
    $html = fetchUrl($url);
    $text = extractPostText($html);
    if ($slug === '13-o-remanescente-e-sua-missao' && str_starts_with($text, 'igreja universal')) {
        $text = 'A '.$text;
    }
    $out[$slug] = $text;
    echo strlen($text)." bytes\n";
    usleep(350000);
}

$target = dirname(__DIR__).'/resources/js/data/adventistBeliefsFullText.gen.ts';
$json = json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
$header = <<<'HDR'
/**
 * Texto integral extraído das páginas oficiais (Divisão Sul-Americana).
 * Regenerar: php scripts/fetch-adventist-beliefs-text.php
 */
HDR;
$ts = $header."\nconst adventistBeliefsFullText: Record<string, string> = ".$json.";\n\nexport default adventistBeliefsFullText;\n";

file_put_contents($target, $ts);
echo "Wrote {$target}\n";
