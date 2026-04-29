<?php

/**
 * Menu lateral do painel (AdminLayout / MobileLayout autenticado).
 * Textos e ordem vêm daqui — atualizam com deploy PHP sem rebuild obrigatório do Vite.
 * A filtragem por permissão continua no Sidebar (adminSidebarRoutePermissions).
 *
 * Secções (Sidebar.tsx): itens que não estão em publicationRoutes/cadastroRoutes/admRoutes
 * aparecem em «Menu Principal» — mantenha esse bloco contíguo no topo desta lista.
 *
 * @var array<int, array{name: string, route: string, icon: string}>
 */
return [
    'items' => [
        // Menu principal (ordem fixa pedida pela equipa)
        ['name' => 'Dashboard', 'route' => 'dashboard', 'icon' => 'home'],
        ['name' => 'Atendimento', 'route' => 'solicitations.index', 'icon' => 'inbox'],
        ['name' => 'Agenda Pastoral', 'route' => 'pastoral-agenda.index', 'icon' => 'clock'],
        ['name' => 'Agendamento de Salas', 'route' => 'room-bookings.index', 'icon' => 'rectangle-stack'],
        ['name' => 'Escalas', 'route' => 'escalas.index', 'icon' => 'calendar'],
        ['name' => 'Inventários', 'route' => 'inventory.index', 'icon' => 'archive-box'],
        ['name' => 'Voluntários', 'route' => 'ministry-lead.volunteers.index', 'icon' => 'user-group'],
        ['name' => 'Usuários', 'route' => 'members.index', 'icon' => 'users'],
        ['name' => 'Oração', 'route' => 'prayer.index', 'icon' => 'praying-hands'],
        // Publicação
        ['name' => 'News', 'route' => 'news.index', 'icon' => 'newspaper'],
        ['name' => 'Eventos', 'route' => 'events.index', 'icon' => 'calendar-days'],
        ['name' => 'Acervo', 'route' => 'acervo.index', 'icon' => 'play-circle'],
        ['name' => 'Música', 'route' => 'musica.index', 'icon' => 'musical-note'],
        ['name' => 'Fotos', 'route' => 'photo-albums.index', 'icon' => 'camera'],
        ['name' => 'Culto', 'route' => 'culto.index', 'icon' => 'film'],
        ['name' => 'Notificações', 'route' => 'notifications.manage', 'icon' => 'bell-alert'],
        // Cadastro
        ['name' => 'Salas', 'route' => 'rooms.index', 'icon' => 'building-office'],
        ['name' => 'Departamentos', 'route' => 'departments.index', 'icon' => 'building-office-2'],
        ['name' => 'Pastores', 'route' => 'pastors.index', 'icon' => 'user-circle'],
        ['name' => 'Contas do app', 'route' => 'users.index', 'icon' => 'sparkles'],
        // ADM (ordem fixa em Sidebar.tsx — admRouteOrder)
        ['name' => 'Igrejas', 'route' => 'churches.index', 'icon' => 'building-office'],
        ['name' => 'Operações', 'route' => 'operations.index', 'icon' => 'chart-bar-square'],
        ['name' => 'Perfis', 'route' => 'roles.index', 'icon' => 'key'],
        ['name' => 'Suporte APP', 'route' => 'support.index', 'icon' => 'chat-bubble'],
        ['name' => 'Versão do APP', 'route' => 'app-versions.index', 'icon' => 'cog'],
        ['name' => 'Configurações', 'route' => 'settings.index', 'icon' => 'cog'],
    ],
];
