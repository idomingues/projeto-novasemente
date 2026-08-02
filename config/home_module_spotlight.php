<?php

/**
 * Módulos em destaque na Home do app (campanhas por período).
 *
 * Campanhas ativas (starts_at…ends_at + feature ligada) pinam o card na grade
 * e mostram o badge «New». O banner/carrossel da Home está desligado por enquanto.
 * Ajuste datas/títulos aqui ou desative com ends_at no passado.
 */
return [
    /** Segundos entre slides (reservado se o banner voltar). */
    'interval_seconds' => 6,

    'campaigns' => [
        [
            'id' => 'meditacao_diaria_2026_08',
            'feature_key' => 'devotional',
            'route' => 'mobile.meditacao-diaria',
            /** Card correspondente na grade da Home (pin + badge New). */
            'home_card_id' => 'meditacao-diaria',
            'badge' => 'New',
            'title' => 'Meditação diária',
            'subtitle' => 'Adulto, Mulher ou Jovem — meditação de hoje.',
            'cta' => 'Ler meditação',
            'icon_key' => 'devotional',
            'starts_at' => '2026-08-02',
            'ends_at' => '2026-10-31',
        ],
        [
            'id' => 'ns_whats_2026_07',
            'feature_key' => 'ns_whats',
            'route' => 'mobile.ns-whats.index',
            /** Card correspondente na grade da Home (pin + badge New). */
            'home_card_id' => 'ns-whats',
            'badge' => 'New',
            'title' => 'NS Conecta',
            'subtitle' => 'Converse com departamentos, líderes e voluntários.',
            'cta' => 'Abrir NS Conecta',
            'icon_key' => 'ns_whats',
            'starts_at' => '2026-07-20',
            'ends_at' => '2026-08-31',
        ],
        [
            'id' => 'enquetes_2026_07',
            'feature_key' => 'polls',
            'route' => 'mobile.polls.index',
            'home_card_id' => 'enquetes',
            'badge' => 'New',
            'title' => 'Enquetes',
            'subtitle' => 'Responda e veja o resultado da congregação.',
            'cta' => 'Abrir Enquetes',
            'icon_key' => 'polls',
            'starts_at' => '2026-07-20',
            'ends_at' => '2026-08-31',
        ],
    ],
];
