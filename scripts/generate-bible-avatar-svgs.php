<?php

/**
 * Gera SVGs ilustrados simples para o catálogo de avatares bíblicos.
 * Executar: php scripts/generate-bible-avatar-svgs.php
 */
$base = dirname(__DIR__).'/public/images/bible-avatars';

$characters = [
    'male' => [
        'david' => ['D', '#0d9488', '#134e4a', '♪'],
        'moses' => ['M', '#2563eb', '#1e3a8a', '◫'],
        'joseph' => ['J', '#7c3aed', '#4c1d95', '✦'],
        'daniel' => ['D', '#ea580c', '#9a3412', '◉'],
        'peter' => ['P', '#0891b2', '#164e63', '⚓'],
        'paul' => ['P', '#4f46e5', '#312e81', '✎'],
        'abraham' => ['A', '#ca8a04', '#713f12', '✶'],
        'jonah' => ['J', '#0284c7', '#0c4a6e', '≋'],
        'elijah' => ['E', '#dc2626', '#7f1d1d', '🔥'],
        'solomon' => ['S', '#b45309', '#78350f', '♛'],
        'john' => ['J', '#059669', '#064e3b', '♥'],
        'timothy' => ['T', '#6366f1', '#3730a3', '✿'],
    ],
    'female' => [
        'esther' => ['E', '#db2777', '#831843', '♛'],
        'mary' => ['M', '#2563eb', '#1e3a8a', '✿'],
        'ruth' => ['R', '#ca8a04', '#713f12', '☘'],
        'deborah' => ['D', '#7c3aed', '#4c1d95', '⚖'],
        'sarah' => ['S', '#0d9488', '#134e4a', '✶'],
        'rachel' => ['R', '#16a34a', '#14532d', '☁'],
        'miriam' => ['M', '#0891b2', '#164e63', '♪'],
        'lydia' => ['L', '#a855f7', '#581c87', '◆'],
        'priscilla' => ['P', '#ea580c', '#9a3412', '⌂'],
        'hannah' => ['A', '#4f46e5', '#312e81', '🙏'],
        'junia' => ['J', '#dc2626', '#7f1d1d', '★'],
        'abigail' => ['A', '#059669', '#064e3b', '🍇'],
    ],
];

function svg(string $initial, string $color1, string $color2, string $symbol): string
{
    $initial = htmlspecialchars($initial, ENT_XML1);
    $symbol = htmlspecialchars($symbol, ENT_XML1);

    return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{$color1}"/>
      <stop offset="100%" stop-color="{$color2}"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="64" fill="url(#bg)"/>
  <ellipse cx="64" cy="118" rx="38" ry="14" fill="#000" opacity="0.12"/>
  <circle cx="64" cy="54" r="26" fill="#fde68a"/>
  <path d="M38 88 Q64 72 90 88 L90 128 L38 128 Z" fill="#fbbf24" opacity="0.95"/>
  <circle cx="54" cy="52" r="3" fill="#422006"/>
  <circle cx="74" cy="52" r="3" fill="#422006"/>
  <path d="M58 62 Q64 68 70 62" stroke="#92400e" stroke-width="2" fill="none" stroke-linecap="round"/>
  <text x="64" y="108" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#fff">{$initial}</text>
  <text x="64" y="28" text-anchor="middle" font-size="18" fill="#fff" opacity="0.9">{$symbol}</text>
</svg>
SVG;
}

foreach ($characters as $gender => $list) {
    $dir = $base.'/'.$gender;
    if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
        throw new RuntimeException("Não foi possível criar {$dir}");
    }
    foreach ($list as $slug => [$initial, $c1, $c2, $symbol]) {
        file_put_contents($dir.'/'.$slug.'.svg', svg($initial, $c1, $c2, $symbol));
    }
}

echo 'Gerados '.array_sum(array_map('count', $characters))." avatares em {$base}\n";
