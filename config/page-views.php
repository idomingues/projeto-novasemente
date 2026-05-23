<?php

/**
 * Contagem leve de visualizações por rota (nome da rota Laravel), agregada por dia e igreja.
 * A gravação corre em middleware terminável — depois da resposta ao cliente — e usa um único upsert.
 */
return [
    'enabled' => env('PAGE_VIEWS_ENABLED', true),

    /**
     * Utilizadores autenticados: regista uma vez por dia por rota (funcionalidade) que a pessoa «entrou» no item.
     * Não acumula várias visitas no mesmo dia (insert ignorado em duplicado).
     */
    'track_user_daily_reach' => env('PAGE_VIEWS_TRACK_USER_DAILY_REACH', true),

    /** Dias mostrados no widget do dashboard (painel). */
    'dashboard_days' => (int) env('PAGE_VIEWS_DASHBOARD_DAYS', 14),

    /** Máximo de linhas no ranking do dashboard. */
    'dashboard_top_limit' => (int) env('PAGE_VIEWS_DASHBOARD_TOP', 12),

    /** Prefixos de nome de rota ignorados (ex.: pacotes de debug). */
    'ignored_route_prefixes' => [
        'debugbar',
        'horizon',
        'livewire',
        'pulse',
        'telescope',
        'sanctum',
        'ignition',
    ],

    /** Nomes de rota ignorados (ficheiros, health, auth raramente úteis para ranking de conteúdo). */
    'ignored_routes' => [
        'favicon',
        'media.public',
        'up',
    ],
];
