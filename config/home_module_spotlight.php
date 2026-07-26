<?php

/**
 * Módulos em destaque na Home do app (campanhas por período).
 *
 * Todas as campanhas ativas (data atual entre starts_at e ends_at) e com
 * a funcionalidade ligada na igreja entram no carrossel, que troca a cada
 * interval_seconds. Ajuste datas/títulos aqui ou desative com ends_at no passado.
 */
return [
    /** Segundos entre slides do carrossel «Em destaque». */
    'interval_seconds' => 6,

    'campaigns' => [
        [
            'id' => 'ns_whats_2026_07',
            'feature_key' => 'ns_whats',
            'route' => 'mobile.ns-whats.index',
            /** Card correspondente na grade da Home (pin + estilo New no 1º mês). */
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
