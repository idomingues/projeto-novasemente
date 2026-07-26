<?php

namespace App\Support;

use App\Models\News;

/**
 * Publicações promocionais do feed que abrem um módulo do app (em vez da ficha da notícia).
 */
final class NewsLaunchDeepLinks
{
    public const NS_CONECTA_SLUG = 'ns-whats-comunicacao-entre-a-nova-semente';

    /**
     * Href do feed / redirecionamento do detalhe, ou null para o fluxo normal da notícia.
     */
    public static function hrefFor(News $post): ?string
    {
        return match ($post->slug) {
            self::NS_CONECTA_SLUG => route('mobile.ns-whats.index', absolute: false),
            default => null,
        };
    }

    public static function actionLabelFor(News $post): ?string
    {
        return match ($post->slug) {
            self::NS_CONECTA_SLUG => 'Abrir NS Conecta',
            default => null,
        };
    }
}
