<?php

namespace App\Support;

/**
 * Rótulos PT-BR alinhados aos menus da app: barra inferior, topbar e tela «Mais».
 * Manter em sincronia com as rotas referidas em:
 *
 * @see resources/js/Components/MobileBottomNav.tsx (activeRoutes)
 * @see resources/js/Components/Topbar.tsx
 * @see resources/js/Pages/Mobile/More.tsx
 * @see resources/js/Pages/More/Index.tsx
 *
 * Fallback: formatação do nome técnico da rota.
 */
final class PageViewRouteLabels
{
    /**
     * @var array<string, string>
     */
    private const MAP = [
        // —— Barra inferior ——
        'mobile.index' => 'Início (entrada /mobile)',
        'mobile.home' => 'Início',
        'mobile.culto' => 'Assistir culto',
        'mobile.culto.show' => 'Assistir culto — vídeo',
        'mobile.events' => 'Eventos',
        'mobile.prayer' => 'Oração',
        'mobile.more' => 'Mais',
        'mobile.baptism' => 'Batismo',
        'volunteers.public-signup.page' => 'Voluntário',
        'prayer.index' => 'Oração (lista web)',

        // —— Topbar ——
        'varios.notifications' => 'Notificações — ver todas',
        'mobile.profile' => 'Perfil',
        'mobile.profile.edit' => 'Editar perfil',
        'volunteers.self-signup.edit' => 'Cadastro de voluntário',
        'profile.edit' => 'Editar perfil (conta)',
        'login' => 'Login',
        'register' => 'Cadastro',

        // —— Mais (cartões) — mesmos títulos que Mobile/More.tsx e More/Index.tsx ——
        'mobile.news' => 'Notícias',
        'mobile.news.show' => 'Notícias — artigo',
        'mobile.health' => 'Saúde',
        'mobile.health.show' => 'Saúde — artigo',
        'mobile.mission' => 'Missão',
        'mobile.mission.events' => 'Missão — eventos',
        'mobile.mission.messages' => 'Missão — depoimentos',
        'mobile.mission.about' => 'Missão — quem somos',
        'mobile.mission.wall' => 'Missão — mural',
        'mobile.mission.wall.show' => 'Missão — mural (álbum)',
        'mobile.mission.form' => 'Missão — cadastro',
        'mission.form' => 'Missão — formulário',
        'mission.content.events' => 'Missão — gestão eventos',
        'mission.content.messages' => 'Missão — gestão depoimentos',
        'mission.content.about' => 'Missão — gestão quem somos',
        'mission.content.wall' => 'Missão — gestão mural',
        'mission.index' => 'Missão — gestão',
        'mission.show' => 'Missão — cadastro',
        'mobile.offerings' => 'Dízimos e ofertas',
        'mobile.campaigns.index' => 'Doação',
        'mobile.campaigns.show' => 'Doação — detalhe',
        'mobile.campaigns.my-donations' => 'Minhas doações',
        'mobile.talents.index' => 'Central de Serviços',
        'mobile.talents.show' => 'Central de Serviços — detalhe',
        'mobile.talents.my-listings' => 'Minhas publicações (Central de Serviços)',
        'mobile.talents.my-interests' => 'Meus interesses (Central de Serviços)',
        'talents.admin.dashboard' => 'Central de Serviços (painel)',
        'talents.admin.listings' => 'Central de Serviços — publicações',
        'talents.admin.reports' => 'Central de Serviços — denúncias',
        'donation-campaigns.index' => 'Doação (painel)',
        'finance.treasurer' => 'Painel do tesoureiro',
        'mobile.musica' => 'Música',
        'mobile.musica.show' => 'Música — vídeo',
        'mobile.services' => 'Cultos e horários',
        'varios.services' => 'Cultos e horários (web)',
        'mobile.fotos' => 'Fotos',
        'mobile.fotos.show' => 'Fotos — álbum',
        'mobile.biblioteca' => 'Biblioteca',
        'mobile.biblioteca.show' => 'Biblioteca — livro',
        'mobile.biblioteca.pdf-download' => 'Biblioteca — download PDF',
        'mobile.biblioteca.external-content' => 'Biblioteca — conteúdo externo',
        'mobile.biblioteca.config-external-content' => 'Biblioteca — configurar externo',
        'mobile.location' => 'Localização',
        'mobile.pastors' => 'Nossos pastores',
        'mobile.quem-somos' => 'Quem somos',
        'mobile.beliefs' => 'Em que acreditamos',
        'mobile.acervo' => 'Acervo',
        'mobile.acervo.show' => 'Acervo — playlist',
        'varios.classe-comecos' => 'Classe de começos (web)',
        'mobile.classe-comecos' => 'Classe de começos',
        'mobile.sobre-o-app' => 'Sobre o app',
        'more.index' => 'Mais (web /mais)',
        'musica.index' => 'Música (painel)',
        'health.index' => 'Saúde (painel)',

        // —— Ligações frequentes a partir de Mais / áreas relacionadas ——
        'varios.schedule' => 'Escala (web)',
        'mobile.schedule' => 'Agenda',
        'mobile.schedule.full' => 'Agenda (completa)',
        'mobile.schedule.checkin' => 'Check-in de escala',
        'escalas.index' => 'Escalas (painel)',
        'varios.contact' => 'Contato (web)',
        'mobile.contact' => 'Falar com o líder',
        'mobile.notifications' => 'Notificações (app)',
        'mobile.inventory' => 'Inventário (app)',
        'mobile.solicitations.hub' => 'Solicitações — hub',
        'mobile.solicitations.mine' => 'Solicitações — meus pedidos',
        'mobile.solicitations.create' => 'Solicitações — novo pedido',
        'mobile.solicitations.show' => 'Solicitações — detalhe',
        'mobile.leader-solicitations.index' => 'Conversas com membros (líder)',
        'mobile.leader-solicitations.show' => 'Conversa com membro — detalhe',
        'mobile.support.index' => 'Suporte APP',
        'mobile.support.ticket' => 'Suporte — ticket',
        'mobile.support.ticket.messages' => 'Suporte — mensagens do ticket',
        'mobile.pastoral-appointments.request' => 'Agendar com pastor',
        'mobile.pastor-availability' => 'Minha disponibilidade pastoral',
        'pastoral-agenda.index' => 'Agenda pastoral (painel)',
        'mobile.settings' => 'Definições (app)',

        // —— Área de liderança / painel (ligado desde Mais) ——
        'solicitations.index' => 'Atendimento pastoral (painel)',
        'ministry-lead.my-volunteers.index' => 'Meus voluntários (painel)',
        'ministry-lead.my-volunteers.update' => 'Meus voluntários — atualizar',
        'ministry-lead.my-volunteers.history' => 'Meus voluntários — histórico',
        'ministry-lead.my-volunteers.volunteer.history' => 'Meus voluntários — histórico',

        // —— Pastores / rotas auxiliares ——
        'pastors.weekly-schedule.update' => 'Escala semanal do pastor (atualizar)',

        // —— Redirecionamentos / varios ——
        'varios.acervo' => 'Acervo (atalho web)',
        'volunteers.self-signup' => 'Auto-cadastro voluntário',
        'leaders.self-signup' => 'Auto-cadastro de líder',

        // —— Painel geral (sidebar) ——
        'dashboard' => 'Dashboard (painel)',
        'operations.index' => 'Operações',
        'notifications.manage' => 'Gestão de notificações',

        // —— Painel — operação e voluntários ——
        'baptism-requests.index' => 'Batismo',
        'communication-requests.index' => 'Comunicação',
        'room-bookings.index' => 'Agendamento de salas',
        'inventory.index' => 'Inventários',
        'ministry-lead.volunteers.index' => 'Voluntários',
        'ministry-lead.volunteers.board' => 'Voluntários — quadro do ministério',
        'ministry-lead.volunteers.show' => 'Voluntários — ficha',
        'volunteer-requests.staff.index' => 'Pedidos de voluntário',
        'members.index' => 'Membros do app',
        'users.index' => 'Usuários',
        'roles.index' => 'Perfis',
        'churches.index' => 'Igrejas',
        'rooms.index' => 'Salas (cadastro)',
        'departments.index' => 'Departamentos',
        'pastors.index' => 'Pastores',
        'events.index' => 'Eventos (painel)',
        'news.index' => 'Notícias (painel)',
        'photo-albums.index' => 'Fotos (painel)',
        'library-books.index' => 'Biblioteca (painel)',
        'culto.index' => 'Culto (painel)',
        'acervo.index' => 'Acervo (painel)',
        'settings.index' => 'Configurações',
        'support.index' => 'Suporte APP',
        'app-versions.index' => 'Versão do APP',
        'talents.admin.dashboard' => 'Serviços (painel)',

        // —— Políticas / legais ——
        'privacy-policy' => 'Política de privacidade',
        'privacy-policy.en' => 'Privacy policy',
        'account-deletion' => 'Exclusão de conta',
        'account-deletion.en' => 'Account deletion',
    ];

    public static function label(string $routeName): string
    {
        if (isset(self::MAP[$routeName])) {
            return self::MAP[$routeName];
        }

        $fromSidebar = self::labelFromAdminSidebar($routeName);
        if ($fromSidebar !== null) {
            return $fromSidebar;
        }

        $human = str_replace(['.', '-', '_'], ' ', $routeName);

        return $human !== '' ? mb_convert_case($human, MB_CASE_TITLE, 'UTF-8') : $routeName;
    }

    private static function labelFromAdminSidebar(string $routeName): ?string
    {
        static $byRoute = null;

        if ($byRoute === null) {
            $byRoute = [];
            /** @var array<int, array{name: string, route: string}> $items */
            $items = config('admin_sidebar.items', []);
            foreach ($items as $item) {
                $route = $item['route'] ?? '';
                $name = $item['name'] ?? '';
                if ($route !== '' && $name !== '') {
                    $byRoute[$route] = $name === 'News' ? 'Notícias' : $name;
                }
            }
        }

        return $byRoute[$routeName] ?? null;
    }
}
