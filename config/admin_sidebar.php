<?php

/**
 * Menu lateral do painel (AdminLayout / MobileLayout autenticado).
 * Textos e ordem vêm daqui — atualizam com deploy PHP sem rebuild obrigatório do Vite.
 * A filtragem por permissão continua no Sidebar (adminSidebarRoutePermissions).
 *
 * @var array<int, array{name: string, route: string, icon: string}>
 */
return [
    'items' => [
        ['name' => 'Dashboard', 'route' => 'dashboard', 'icon' => 'home'],
        ['name' => 'Atendimento', 'route' => 'solicitations.index', 'icon' => 'inbox'],
        ['name' => 'Pastores', 'route' => 'pastors.index', 'icon' => 'user-circle'],
        ['name' => 'Agenda pastoral', 'route' => 'pastoral-agenda.index', 'icon' => 'clock'],
        ['name' => 'Eventos', 'route' => 'events.index', 'icon' => 'calendar-days'],
        ['name' => 'Culto', 'route' => 'culto.index', 'icon' => 'film'],
        ['name' => 'Acervo', 'route' => 'acervo.index', 'icon' => 'play-circle'],
        ['name' => 'Departamentos', 'route' => 'departments.index', 'icon' => 'building-office-2'],
        ['name' => 'Escalas', 'route' => 'escalas.index', 'icon' => 'calendar'],
        ['name' => 'Voluntários', 'route' => 'ministry-lead.volunteers.index', 'icon' => 'user-group'],
        ['name' => 'Perfis', 'route' => 'roles.index', 'icon' => 'key'],
        ['name' => 'Salas', 'route' => 'rooms.index', 'icon' => 'building-office'],
        ['name' => 'Agendamento de salas', 'route' => 'room-bookings.index', 'icon' => 'rectangle-stack'],
        ['name' => 'Inventário', 'route' => 'inventory.index', 'icon' => 'archive-box'],
        ['name' => 'Igrejas', 'route' => 'churches.index', 'icon' => 'building-office'],
        ['name' => 'Notificações', 'route' => 'notifications.manage', 'icon' => 'bell-alert'],
        ['name' => 'Configurações', 'route' => 'settings.index', 'icon' => 'cog'],
        ['name' => 'Suporte do app', 'route' => 'support.index', 'icon' => 'chat-bubble'],
        ['name' => 'Versão do App', 'route' => 'app-versions.index', 'icon' => 'cog'],
    ],
];
