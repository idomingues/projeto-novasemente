<?php

namespace App\Support;

use App\Models\Church;
use App\Services\PageViewAnalytics;
use Illuminate\Support\Facades\Route;

/**
 * Cards «Mais visualizados» da Home: ranking de views (30 dias) + fallback curado.
 * Só entram rotas que existem como atalho na grade da Home (nunca painel/admin).
 */
final class HomeFeaturedWeek
{
    public const LIMIT = 6;

    public const PERIOD_DAYS = 30;

    /**
     * Rotas permitidas — espelham os cards de resources/js/Pages/Mobile/Home.tsx.
     *
     * @var list<string>
     */
    private const HOME_CARD_ROUTES = [
        'mobile.ano-biblico',
        'volunteers.public-signup.page',
        'mobile.baptism',
        'mobile.biblioteca',
        'mobile.bible',
        'mobile.talents.index',
        'varios.classe-comecos',
        'mobile.communities',
        'mobile.culto',
        'mobile.services',
        'mobile.meditacao-diaria',
        'mobile.offerings',
        'mobile.donations.index',
        'mobile.shared-talents.index',
        'mobile.beliefs',
        'mobile.events',
        'mobile.fotos',
        'mobile.location',
        'mobile.mission',
        'mobile.musica',
        'mobile.pastors',
        'mobile.campaigns.index',
        'mobile.prayer',
        'mobile.quem-somos',
        'mobile.revista-adventista',
        'mobile.health',
        'mobile.acervo',
        'mobile.support.index',
    ];

    /**
     * Rótulos iguais aos cards da Home (nunca fallback técnico tipo «Mobile Bible»).
     *
     * @var array<string, string>
     */
    private const HOME_CARD_LABELS = [
        'mobile.ano-biblico' => 'Ano Bíblico',
        'volunteers.public-signup.page' => 'Voluntário',
        'mobile.baptism' => 'Batismo',
        'mobile.biblioteca' => 'Biblioteca',
        'mobile.bible' => 'Bíblia',
        'mobile.talents.index' => 'Central de Serviços',
        'varios.classe-comecos' => 'Classe Começos',
        'mobile.communities' => 'Comunidades',
        'mobile.culto' => 'Culto',
        'mobile.services' => 'Horários',
        'mobile.meditacao-diaria' => 'Meditação diária',
        'mobile.offerings' => 'Dízimos e Pacto',
        'mobile.donations.index' => 'Doação',
        'mobile.shared-talents.index' => 'Doar Talentos',
        'mobile.beliefs' => 'Em que cremos',
        'mobile.events' => 'Eventos',
        'mobile.fotos' => 'Fotos',
        'mobile.location' => 'Localização',
        'mobile.mission' => 'Missão',
        'mobile.musica' => 'Música',
        'mobile.pastors' => 'Pastores',
        'mobile.campaigns.index' => 'Oferta Nova Semente',
        'mobile.prayer' => 'Oração',
        'mobile.quem-somos' => 'Quem somos',
        'mobile.revista-adventista' => 'Revista Adventista',
        'mobile.health' => 'Saúde',
        'mobile.acervo' => 'Séries',
        'mobile.support.index' => 'Suporte APP',
    ];

    /**
     * Fallback curado quando ainda não há views suficientes.
     *
     * @var list<array{route: string, label: string, subtitle: string, feature_key: string|null, icon_key: string, route_params?: array<string, string>}>
     */
    private const CURATED = [
        [
            'route' => 'mobile.biblioteca',
            'label' => 'Lição',
            'subtitle' => 'Estudo da escola sabatina',
            'feature_key' => 'library',
            'icon_key' => 'lesson',
            'route_params' => ['tab' => 'lesson', 'solo' => '1'],
        ],
        [
            'route' => 'mobile.bible',
            'label' => 'Bíblia',
            'subtitle' => 'Leitura e busca de versículos',
            'feature_key' => 'bible',
            'icon_key' => 'bible',
        ],
        [
            'route' => 'mobile.culto',
            'label' => 'Culto',
            'subtitle' => 'Assista quando quiser',
            'feature_key' => 'culto',
            'icon_key' => 'culto',
        ],
        [
            'route' => 'mobile.events',
            'label' => 'Eventos',
            'subtitle' => 'Agenda da igreja',
            'feature_key' => 'events',
            'icon_key' => 'events',
        ],
        [
            'route' => 'mobile.biblioteca',
            'label' => 'Biblioteca',
            'subtitle' => 'Livros e PDFs',
            'feature_key' => 'library',
            'icon_key' => 'library',
        ],
    ];

    /**
     * Colapsa rotas de detalhe para o hub do card da Home.
     *
     * @var array<string, string>
     */
    private const HUB_COLLAPSE = [
        'mobile.culto.show' => 'mobile.culto',
        'mobile.musica.show' => 'mobile.musica',
        'mobile.fotos.show' => 'mobile.fotos',
        'mobile.biblioteca.show' => 'mobile.biblioteca',
        'mobile.acervo.show' => 'mobile.acervo',
        'mobile.revista-adventista.show' => 'mobile.revista-adventista',
        'mobile.health.show' => 'mobile.health',
        'mobile.campaigns.show' => 'mobile.campaigns.index',
        'mobile.donations.show' => 'mobile.donations.index',
        'mobile.talents.show' => 'mobile.talents.index',
        'mobile.shared-talents.show' => 'mobile.shared-talents.index',
        'mobile.mission.home' => 'mobile.mission',
        'mobile.mission.events' => 'mobile.mission',
        'mobile.mission.messages' => 'mobile.mission',
        'mobile.mission.about' => 'mobile.mission',
        'mobile.mission.wall' => 'mobile.mission',
        'mobile.mission.form' => 'mobile.mission',
        'mobile.support.ticket' => 'mobile.support.index',
        'mobile.ano-biblico.complete' => 'mobile.ano-biblico',
        'prayer.index' => 'mobile.prayer',
    ];

    /**
     * @return array{items: list<array{id: string, route: string, href: string, label: string, subtitle: string, feature_key: string|null, icon_key: string, source: string}>}
     */
    public static function forChurch(?Church $church): array
    {
        $items = [];
        $seenRoutes = [];

        if ($church?->id !== null) {
            $top = PageViewAnalytics::topPagesForChurch((int) $church->id, self::PERIOD_DAYS, 24);
            foreach ($top as $row) {
                $card = self::cardFromAnalyticsRoute(
                    (string) $row['routeName'],
                    (string) $row['label'],
                    $church,
                );
                if ($card === null) {
                    continue;
                }
                $dedupeKey = self::dedupeKey($card['route'], $card['href']);
                if (isset($seenRoutes[$dedupeKey])) {
                    continue;
                }
                $seenRoutes[$dedupeKey] = true;
                $items[] = $card;
                if (count($items) >= self::LIMIT) {
                    return ['items' => $items];
                }
            }
        }

        foreach (self::CURATED as $curated) {
            if (count($items) >= self::LIMIT) {
                break;
            }
            $card = self::cardFromCurated($curated, $church);
            if ($card === null) {
                continue;
            }
            $dedupeKey = self::dedupeKey($card['route'], $card['href']);
            if (isset($seenRoutes[$dedupeKey])) {
                continue;
            }
            $seenRoutes[$dedupeKey] = true;
            $items[] = $card;
        }

        return ['items' => $items];
    }

    /**
     * @return array{id: string, route: string, href: string, label: string, subtitle: string, feature_key: string|null, icon_key: string, source: string}|null
     */
    private static function cardFromAnalyticsRoute(string $routeName, string $label, Church $church): ?array
    {
        $hub = self::resolveHomeCardRoute($routeName);
        if ($hub === null || ! self::isHomeCardRoute($hub)) {
            return null;
        }

        if (! Route::has($hub)) {
            return null;
        }

        $featureKey = self::featureKeyForRoute($hub);
        if ($featureKey !== null && ! ChurchAppFeatures::isEnabled($church, $featureKey)) {
            return null;
        }

        try {
            $href = route($hub, [], absolute: false);
        } catch (\Throwable) {
            return null;
        }

        $cleanLabel = self::HOME_CARD_LABELS[$hub] ?? self::cleanLabel($label, $hub);

        return [
            'id' => 'analytics-'.$hub,
            'route' => $hub,
            'href' => $href,
            'label' => $cleanLabel,
            'subtitle' => 'Entre os mais visualizados',
            'feature_key' => $featureKey,
            'icon_key' => self::iconKeyForRoute($hub),
            'source' => 'analytics',
        ];
    }

    private static function resolveHomeCardRoute(string $routeName): ?string
    {
        if (isset(self::HUB_COLLAPSE[$routeName])) {
            return self::HUB_COLLAPSE[$routeName];
        }

        if (self::isHomeCardRoute($routeName)) {
            return $routeName;
        }

        if (preg_match('/^(mobile\.[a-z0-9\-]+)\.(show|update|store|destroy|edit|create|index)$/', $routeName, $m) === 1) {
            $candidate = $m[1];
            if (self::isHomeCardRoute($candidate)) {
                return $candidate;
            }
            $withIndex = $candidate.'.index';
            if (self::isHomeCardRoute($withIndex)) {
                return $withIndex;
            }
        }

        return null;
    }

    private static function isHomeCardRoute(string $routeName): bool
    {
        return in_array($routeName, self::HOME_CARD_ROUTES, true);
    }

    /**
     * @param  array{route: string, label: string, subtitle: string, feature_key: string|null, icon_key: string, route_params?: array<string, string>}  $curated
     * @return array{id: string, route: string, href: string, label: string, subtitle: string, feature_key: string|null, icon_key: string, source: string}|null
     */
    private static function cardFromCurated(array $curated, ?Church $church): ?array
    {
        $routeName = $curated['route'];
        if (! self::isHomeCardRoute($routeName) || ! Route::has($routeName)) {
            return null;
        }

        $featureKey = $curated['feature_key'];
        if ($church !== null && $featureKey !== null && ! ChurchAppFeatures::isEnabled($church, $featureKey)) {
            return null;
        }

        $params = $curated['route_params'] ?? [];

        try {
            $href = route($routeName, $params, absolute: false);
        } catch (\Throwable) {
            return null;
        }

        return [
            'id' => 'curated-'.$curated['icon_key'].'-'.md5($href),
            'route' => $routeName,
            'href' => $href,
            'label' => $curated['label'],
            'subtitle' => $curated['subtitle'],
            'feature_key' => $featureKey,
            'icon_key' => $curated['icon_key'],
            'source' => 'curated',
        ];
    }

    private static function dedupeKey(string $route, string $href): string
    {
        return $route.'|'.$href;
    }

    private static function cleanLabel(string $label, string $hub): string
    {
        $label = trim(preg_replace('/\s*[—–-]\s*.+$/u', '', $label) ?? $label);
        if ($label !== '') {
            return $label;
        }

        return PageViewRouteLabels::label($hub);
    }

    private static function featureKeyForRoute(string $routeName): ?string
    {
        return match ($routeName) {
            'mobile.culto' => 'culto',
            'mobile.events' => 'events',
            'mobile.bible' => 'bible',
            'mobile.biblioteca' => 'library',
            'mobile.health' => 'health',
            'mobile.musica' => 'musica',
            'mobile.fotos' => 'photos',
            'mobile.acervo' => 'acervo',
            'mobile.revista-adventista' => 'revista_adventista',
            'mobile.prayer' => 'prayer',
            'mobile.ano-biblico' => 'ano_biblico',
            'mobile.meditacao-diaria' => 'devotional',
            'mobile.offerings' => 'offerings',
            'mobile.donations.index' => 'charity_donations',
            'mobile.campaigns.index' => 'donation_campaigns',
            'mobile.talents.index' => 'talents',
            'mobile.shared-talents.index' => 'shared_talents',
            'mobile.mission' => 'mission',
            'mobile.communities' => 'communities',
            'mobile.beliefs' => 'beliefs',
            'mobile.pastors' => 'pastors',
            'mobile.services' => 'services',
            'mobile.location' => 'location',
            'mobile.quem-somos' => 'quem_somos',
            'mobile.support.index' => 'support',
            'mobile.baptism' => 'baptism',
            'volunteers.public-signup.page' => 'volunteer_signup',
            'varios.classe-comecos' => 'classe_comecos',
            default => null,
        };
    }

    private static function iconKeyForRoute(string $routeName): string
    {
        return match ($routeName) {
            'mobile.culto' => 'culto',
            'mobile.events' => 'events',
            'mobile.bible' => 'bible',
            'mobile.biblioteca' => 'library',
            'mobile.health' => 'health',
            'mobile.musica' => 'musica',
            'mobile.fotos' => 'photos',
            'mobile.acervo' => 'acervo',
            'mobile.revista-adventista' => 'revista',
            'mobile.prayer' => 'prayer',
            'mobile.ano-biblico' => 'ano_biblico',
            'mobile.meditacao-diaria' => 'devotional',
            'mobile.offerings' => 'offerings',
            'mobile.donations.index' => 'donations',
            'mobile.campaigns.index' => 'campaigns',
            'mobile.talents.index', 'mobile.shared-talents.index' => 'talents',
            'mobile.mission' => 'mission',
            'mobile.beliefs' => 'beliefs',
            'mobile.pastors' => 'pastors',
            'mobile.services' => 'services',
            'mobile.support.index' => 'support',
            default => 'sparkles',
        };
    }
}
