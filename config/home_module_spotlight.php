<?php

/**
 * Módulo em destaque na Home do app (campanhas por período).
 *
 * A primeira campanha ativa (data atual entre starts_at e ends_at) e com
 * a funcionalidade ligada na igreja é exibida. Ajuste datas/títulos aqui
 * ou desative com ends_at no passado.
 */
return [
    'campaigns' => [
        [
            'id' => 'ns_whats_2026_07',
            'feature_key' => 'ns_whats',
            'route' => 'mobile.ns-whats.index',
            'badge' => 'Em destaque',
            'title' => 'NS Whats',
            'subtitle' => 'Converse com departamentos, líderes e membros da igreja — direto pelo app.',
            'cta' => 'Abrir NS Whats',
            'starts_at' => '2026-07-20',
            'ends_at' => '2026-08-31',
        ],
    ],
];
