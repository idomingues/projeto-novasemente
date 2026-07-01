<?php

/**
 * Funcionalidades do app (membros): chaves estáveis, rótulos e rotas cobertas pelo middleware.
 *
 * @see App\Support\ChurchAppFeatures
 * @see resources/js/Pages/Settings/AppFeatures.tsx
 */
return [
    'group_labels' => [
        'barra_inferior' => 'Barra inferior',
        'inicio' => 'Início (atalhos)',
        'menu_mais' => 'Menu Mais',
    ],

    'always_enabled_routes' => [
        'mobile.index',
        'mobile.home',
        'mobile.more',
        'more.index',
        'mobile.settings',
        'mobile.sobre-o-app',
        'mobile.profile',
        'mobile.profile.edit',
        'login',
        'register',
        'password.request',
        'password.email',
        'password.reset',
        'password.store',
        'password.update',
        'verification.notice',
        'verification.verify',
        'verification.send',
    ],

    'features' => [
        'culto' => [
            'label' => 'Assistir culto / Culto',
            'group' => 'barra_inferior',
            'routes' => ['mobile.culto', 'mobile.culto.*'],
        ],
        'events' => [
            'label' => 'Eventos',
            'group' => 'barra_inferior',
            'routes' => ['mobile.events', 'mobile.schedule', 'mobile.schedule.*'],
        ],
        'prayer' => [
            'label' => 'Oração',
            'group' => 'barra_inferior',
            'routes' => ['mobile.prayer', 'prayer.index'],
        ],
        'promise_box' => [
            'label' => 'Caixa de Promessas',
            'group' => 'inicio',
            'routes' => ['mobile.promise-box.*'],
        ],
        'baptism' => [
            'label' => 'Batismo',
            'group' => 'inicio',
            'routes' => ['mobile.baptism'],
        ],
        'devotional' => [
            'label' => 'Devocional',
            'group' => 'inicio',
            'routes' => ['mobile.meditacao-diaria'],
        ],
        'acervo' => [
            'label' => 'Séries',
            'group' => 'inicio',
            'routes' => ['mobile.acervo', 'mobile.acervo.*', 'varios.acervo'],
        ],
        'musica' => [
            'label' => 'Música',
            'group' => 'inicio',
            'routes' => ['mobile.musica', 'mobile.musica.*', 'musica.index'],
        ],
        'photos' => [
            'label' => 'Fotos',
            'group' => 'inicio',
            'routes' => ['mobile.fotos', 'mobile.fotos.*'],
        ],
        'offerings' => [
            'label' => 'Oferta / Dízimos e ofertas',
            'group' => 'inicio',
            'routes' => ['mobile.offerings'],
        ],
        'mission' => [
            'label' => 'Missão',
            'group' => 'inicio',
            'routes' => ['mobile.mission', 'mobile.mission.*', 'mission.form'],
        ],
        'bible' => [
            'label' => 'Bíblia',
            'group' => 'menu_mais',
            'routes' => ['mobile.bible', 'mobile.bible.*'],
        ],
        'ano_biblico' => [
            'label' => 'Ano Bíblico',
            'group' => 'menu_mais',
            'routes' => ['mobile.ano-biblico', 'mobile.ano-biblico.*'],
        ],
        'news' => [
            'label' => 'Notícias',
            'group' => 'menu_mais',
            'routes' => ['mobile.news', 'mobile.news.*'],
        ],
        'health' => [
            'label' => 'Saúde',
            'group' => 'menu_mais',
            'routes' => ['mobile.health', 'mobile.health.*'],
        ],
        'communities' => [
            'label' => 'Comunidades',
            'group' => 'menu_mais',
            'routes' => ['mobile.communities'],
        ],
        'donation_campaigns' => [
            'label' => 'Doação',
            'group' => 'menu_mais',
            'routes' => ['mobile.campaigns', 'mobile.campaigns.*', 'mobile.item-campaigns', 'mobile.item-campaigns.*'],
        ],
        'talents' => [
            'label' => 'Central de Serviços',
            'group' => 'menu_mais',
            'routes' => ['mobile.talents', 'mobile.talents.*'],
        ],
        'shared_talents' => [
            'label' => 'Doar Talentos',
            'group' => 'menu_mais',
            'routes' => ['mobile.shared-talents', 'mobile.shared-talents.*'],
        ],
        'services' => [
            'label' => 'Cultos e horários',
            'group' => 'menu_mais',
            'routes' => ['mobile.services', 'varios.services'],
        ],
        'library' => [
            'label' => 'Biblioteca',
            'group' => 'menu_mais',
            'routes' => ['mobile.biblioteca', 'mobile.biblioteca.*'],
        ],
        'revista_adventista' => [
            'label' => 'Acervo Revista Adventista',
            'group' => 'menu_mais',
            'routes' => ['mobile.revista-adventista', 'mobile.revista-adventista.*'],
        ],
        'location' => [
            'label' => 'Localização',
            'group' => 'menu_mais',
            'routes' => ['mobile.location'],
        ],
        'pastors' => [
            'label' => 'Nossos pastores',
            'group' => 'menu_mais',
            'routes' => ['mobile.pastors'],
        ],
        'quem_somos' => [
            'label' => 'Quem somos',
            'group' => 'menu_mais',
            'routes' => ['mobile.quem-somos'],
        ],
        'beliefs' => [
            'label' => 'Em que acreditamos',
            'group' => 'menu_mais',
            'routes' => ['mobile.beliefs'],
        ],
        'volunteer_signup' => [
            'label' => 'Área do voluntário',
            'group' => 'menu_mais',
            'routes' => [
                'volunteers.public-signup.page',
                'volunteers.self-signup',
                'volunteers.self-signup.*',
            ],
        ],
        'classe_comecos' => [
            'label' => 'Classe Começos',
            'group' => 'menu_mais',
            'routes' => ['varios.classe-comecos', 'mobile.classe-comecos'],
        ],
        'support' => [
            'label' => 'Suporte APP',
            'group' => 'menu_mais',
            'routes' => ['mobile.support', 'mobile.support.*'],
        ],
    ],
];
