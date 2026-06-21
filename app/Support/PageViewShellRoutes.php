<?php

namespace App\Support;

/**
 * Rotas excluídas do ranking «Páginas mais vistas» (dashboard e Operações).
 *
 * @see resources/js/Components/MobileBottomNav.tsx
 * @see resources/js/Components/Sidebar.tsx (MOBILE_BOTTOM_NAV_ROUTES)
 */
final class PageViewShellRoutes
{
    /**
     * Abas da barra inferior e hubs equivalentes — caminhos de entrada, não páginas de conteúdo.
     *
     * @return list<string>
     */
    public static function bottomNavigationRoutes(): array
    {
        return [
            'mobile.index',
            'mobile.home',
            'mobile.culto',
            'mobile.news',
            'mobile.prayer',
            'prayer.index',
            'mobile.more',
            'more.index',
            'mobile.baptism',
            'volunteers.public-signup.page',
        ];
    }

    /**
     * Hubs de navegação do painel e app.
     *
     * @return list<string>
     */
    public static function navigationHubs(): array
    {
        return array_values(array_unique(array_merge(
            self::bottomNavigationRoutes(),
            [
                'dashboard',
            ],
        )));
    }

    /**
     * Endpoints técnicos (JSON, feed, polling) — não são telas.
     *
     * @return list<string>
     */
    public static function technicalRoutes(): array
    {
        return [
            'notifications.feed',
            'ministry-lead.volunteers.pipeline.detail',
        ];
    }

    /**
     * @return list<string>
     */
    public static function excludedFromRanking(): array
    {
        return array_values(array_unique(array_merge(
            self::navigationHubs(),
            self::technicalRoutes(),
        )));
    }

    /** @deprecated Use excludedFromRanking() */
    public static function excludedFromOperationsRanking(): array
    {
        return self::excludedFromRanking();
    }

    public static function isExcluded(string $routeName): bool
    {
        if (in_array($routeName, self::excludedFromRanking(), true)) {
            return true;
        }

        if (str_ends_with($routeName, '.feed')) {
            return true;
        }

        return false;
    }
}
