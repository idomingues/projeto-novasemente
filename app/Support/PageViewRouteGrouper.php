<?php

namespace App\Support;

/**
 * Agrupa rotas Laravel em áreas legíveis no relatório de Operações.
 */
final class PageViewRouteGrouper
{
    public static function group(string $routeName): string
    {
        if (str_starts_with($routeName, 'mobile.biblioteca') || str_contains($routeName, 'biblioteca')) {
            return 'Biblioteca e estudo';
        }

        if (
            in_array($routeName, ['mobile.home', 'mobile.index', 'mobile.more', 'mobile.culto', 'mobile.culto.show', 'mobile.events', 'mobile.prayer', 'mobile.baptism'], true)
            || str_starts_with($routeName, 'mobile.culto.')
        ) {
            return 'Navegação principal (app)';
        }

        if (
            str_starts_with($routeName, 'mobile.news')
            || str_starts_with($routeName, 'mobile.health')
            || str_starts_with($routeName, 'mobile.mission')
            || str_starts_with($routeName, 'mission.')
        ) {
            return 'Notícias, saúde e missão';
        }

        if (
            str_starts_with($routeName, 'mobile.musica')
            || str_starts_with($routeName, 'mobile.acervo')
            || str_starts_with($routeName, 'mobile.services')
            || str_starts_with($routeName, 'mobile.offerings')
            || in_array($routeName, ['musica.index', 'acervo.index', 'varios.acervo', 'culto.index'], true)
        ) {
            return 'Cultos, música e acervo';
        }

        if (
            str_starts_with($routeName, 'mobile.schedule')
            || str_starts_with($routeName, 'escalas.')
            || $routeName === 'varios.schedule'
            || $routeName === 'mobile.schedule'
        ) {
            return 'Agenda e escalas';
        }

        if (
            str_starts_with($routeName, 'mobile.solicitation')
            || str_starts_with($routeName, 'mobile.support')
            || str_starts_with($routeName, 'mobile.pastoral')
            || str_starts_with($routeName, 'mobile.leader-solicitation')
            || str_starts_with($routeName, 'pastoral-agenda')
            || str_starts_with($routeName, 'solicitation')
        ) {
            return 'Solicitações, suporte e pastoral';
        }

        if (
            str_starts_with($routeName, 'volunteer')
            || str_starts_with($routeName, 'ministry-lead.')
            || str_starts_with($routeName, 'leaders.self-signup')
        ) {
            return 'Voluntários e liderança';
        }

        if (
            in_array($routeName, [
                'mobile.location',
                'mobile.pastors',
                'mobile.quem-somos',
                'mobile.beliefs',
                'mobile.contact',
                'mobile.classe-comecos',
                'mobile.sobre-o-app',
                'varios.contact',
                'varios.classe-comecos',
                'varios.services',
            ], true)
            || str_starts_with($routeName, 'mobile.fotos')
            || str_starts_with($routeName, 'photo-albums.')
        ) {
            return 'Institucional e contato';
        }

        if (
            str_starts_with($routeName, 'mobile.profile')
            || $routeName === 'profile.edit'
            || $routeName === 'mobile.settings'
        ) {
            return 'Perfil e conta';
        }

        if (str_starts_with($routeName, 'varios.') || $routeName === 'more.index') {
            return 'Web / links do Mais';
        }

        if (
            $routeName === 'dashboard'
            || $routeName === 'operations.index'
            || str_ends_with($routeName, '.index')
            || str_contains($routeName, '.manage')
            || str_starts_with($routeName, 'settings.')
            || str_starts_with($routeName, 'churches.')
            || str_starts_with($routeName, 'users.')
            || str_starts_with($routeName, 'roles.')
            || str_starts_with($routeName, 'pastors.')
            || str_starts_with($routeName, 'library-books.')
            || str_starts_with($routeName, 'notifications.')
            || str_starts_with($routeName, 'app-versions.')
            || str_starts_with($routeName, 'support.')
        ) {
            return 'Painel administrativo';
        }

        if (in_array($routeName, ['privacy-policy', 'privacy-policy.en', 'account-deletion', 'account-deletion.en'], true)) {
            return 'Legal e políticas';
        }

        return 'Outras telas';
    }

    /**
     * Ordem de exibição dos grupos no relatório.
     *
     * @return list<string>
     */
    public static function orderedGroupLabels(): array
    {
        return [
            'Navegação principal (app)',
            'Biblioteca e estudo',
            'Notícias, saúde e missão',
            'Cultos, música e acervo',
            'Agenda e escalas',
            'Solicitações, suporte e pastoral',
            'Voluntários e liderança',
            'Institucional e contato',
            'Perfil e conta',
            'Web / links do Mais',
            'Painel administrativo',
            'Legal e políticas',
            'Outras telas',
        ];
    }
}
