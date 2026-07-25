<?php

/**
 * Menu lateral do painel (AdminLayout / MobileLayout autenticado).
 * Textos e ordem vêm daqui — atualizam com deploy PHP sem rebuild obrigatório do Vite.
 * A filtragem por permissão continua no Sidebar (adminSidebarRoutePermissions).
 *
 * Secções (Sidebar.tsx): Dashboard (fixo no topo); PASTOR (pastorRoutes); OPERAÇÃO (restante);
 * depois Publicação, Cadastro e ADM.
 *
 * @var array<int, array{name: string, route: string, icon: string}>
 */
return [
    'items' => [
        // OPERAÇÃO
        ['name' => 'Dashboard', 'route' => 'dashboard', 'icon' => 'home'],
        ['name' => 'Comunicação', 'route' => 'communication-requests.index', 'icon' => 'chat-bubble'],
        // Teste admin (fase 1) — fora de Publicação para ficar visível com OPERAÇÃO aberta
        ['name' => 'IA Foto', 'route' => 'face-ai.index', 'icon' => 'sparkles'],
        // PASTOR (ordem fixa em Sidebar.tsx — pastorRouteOrder)
        ['name' => 'Atendimento', 'route' => 'solicitations.index', 'icon' => 'inbox'],
        ['name' => 'Batismo', 'route' => 'baptism-requests.index', 'icon' => 'sparkles'],
        ['name' => 'Agenda', 'route' => 'pastoral-agenda.index', 'icon' => 'clock'],
        ['name' => 'Salas', 'route' => 'room-bookings.index', 'icon' => 'rectangle-stack'],
        ['name' => 'Escalas', 'route' => 'escalas.index', 'icon' => 'calendar'],
        ['name' => 'Inventários', 'route' => 'inventory.index', 'icon' => 'archive-box'],
        ['name' => 'Voluntários', 'route' => 'ministry-lead.volunteers.central', 'icon' => 'user-group'],
        ['name' => 'Usuários', 'route' => 'users.index', 'icon' => 'users'],
        ['name' => 'Missão', 'route' => 'mission.index', 'icon' => 'globe-alt'],
        ['name' => 'Oração', 'route' => 'prayer.index', 'icon' => 'praying-hands'],
        // Publicação
        ['name' => 'News', 'route' => 'news.index', 'icon' => 'newspaper'],
        ['name' => 'Comentários', 'route' => 'publication-comments.index', 'icon' => 'chat-bubble'],
        ['name' => 'Saúde', 'route' => 'health.index', 'icon' => 'heart'],
        ['name' => 'Revista Adventista', 'route' => 'revista-adventista.index', 'icon' => 'newspaper'],
        ['name' => 'Acervo Revista Adventista', 'route' => 'revista-adventista-acervo.index', 'icon' => 'book-open'],
        ['name' => 'Eventos', 'route' => 'events.index', 'icon' => 'calendar-days'],
        ['name' => 'Séries', 'route' => 'acervo.index', 'icon' => 'play-circle'],
        ['name' => 'Música', 'route' => 'musica.index', 'icon' => 'musical-note'],
        ['name' => 'Fotos', 'route' => 'photo-albums.index', 'icon' => 'camera'],
        ['name' => 'Biblioteca', 'route' => 'library-books.index', 'icon' => 'book-open'],
        ['name' => 'Comunidades', 'route' => 'communities.index', 'icon' => 'user-group'],
        ['name' => 'Caixa de Promessas', 'route' => 'promise-box-verses.index', 'icon' => 'sparkles'],
        ['name' => 'Culto', 'route' => 'culto.index', 'icon' => 'film'],
        ['name' => 'Oferta Nova Semente', 'route' => 'donation-campaigns.index', 'icon' => 'banknotes'],
        ['name' => 'Doação', 'route' => 'charity-campaigns.index', 'icon' => 'banknotes'],
        ['name' => 'Serviços', 'route' => 'talents.admin.dashboard', 'icon' => 'user-group'],
        ['name' => 'Talentos', 'route' => 'shared-talents.admin.dashboard', 'icon' => 'sparkles'],
        ['name' => 'Tesouraria', 'route' => 'finance.treasurer', 'icon' => 'chart-bar-square'],
        ['name' => 'Notificações', 'route' => 'notifications.manage', 'icon' => 'bell-alert'],
        // Cadastro
        ['name' => 'Salas', 'route' => 'rooms.index', 'icon' => 'building-office'],
        ['name' => 'Departamentos', 'route' => 'departments.index', 'icon' => 'building-office-2'],
        ['name' => 'Pastores', 'route' => 'pastors.index', 'icon' => 'user-circle'],
        ['name' => 'Programação', 'route' => 'programacao.index', 'icon' => 'clock'],
        // ADM (ordem fixa em Sidebar.tsx — admRouteOrder)
        ['name' => 'Igrejas', 'route' => 'churches.index', 'icon' => 'building-office'],
        ['name' => 'Operações', 'route' => 'operations.index', 'icon' => 'chart-bar-square'],
        ['name' => 'Perfis', 'route' => 'roles.index', 'icon' => 'key'],
        ['name' => 'Suporte APP', 'route' => 'support.index', 'icon' => 'chat-bubble'],
        ['name' => 'Versão do APP', 'route' => 'app-versions.index', 'icon' => 'cog'],
        ['name' => 'Funcionalidades do app', 'route' => 'settings.app-features.index', 'icon' => 'sparkles'],
        ['name' => 'Configurações', 'route' => 'settings.index', 'icon' => 'cog'],
    ],
];
