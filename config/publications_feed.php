<?php

/**
 * Feed unificado de publicações (app mobile).
 *
 * Enquanto `preview_only` for true, só os e-mails em `preview_emails` acessam a rota.
 * O feed fica na barra inferior; o default é liberado para todos.
 */
return [
    'preview_only' => env('PUBLICATIONS_FEED_PREVIEW_ONLY', false),

    'preview_emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('PUBLICATIONS_FEED_PREVIEW_EMAILS', 'admin@example.com')),
    ))),

    /** Quando o item não tem capa própria, tenta o logo da igreja antes do gradiente. */
    'use_church_logo_as_fallback' => true,

    /** Capa global opcional (URL absoluta ou path). */
    'fallback_cover' => env('PUBLICATIONS_FEED_FALLBACK_COVER'),

    /**
     * Capas padrão por tipo (último recurso, após artefatos reais e logo da igreja).
     * Deixe null para usar só conteúdo real + logo.
     */
    'default_covers' => [
        'news' => null,
        'health' => null,
        'culto' => null,
        'prayer' => null,
        'charity_donation' => null,
        'library' => null,
        'photos' => null,
        'events' => null,
        'revista' => null,
        'acervo' => null,
        'musica' => null,
        'polls' => '/images/publications/enquetes-feed-cover.png',
    ],
];
