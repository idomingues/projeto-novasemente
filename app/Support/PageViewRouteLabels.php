<?php

namespace App\Support;

/**
 * Rótulos PT-BR alinhados aos menus da app: barra inferior, topbar e tela «Mais».
 * Manter em sincronia com as rotas referidas em:
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
        'volunteers.public-signup.page' => 'Cadastro de voluntário',
        'prayer.index' => 'Oração (lista web)',

        // —— Topbar ——
        'varios.notifications' => 'Notificações — ver todas',
        'mobile.profile' => 'Perfil',
        'mobile.profile.edit' => 'Editar perfil',
        'profile.edit' => 'Editar perfil (conta)',
        'login' => 'Login',
        'register' => 'Cadastro',

        // —— Mais (cartões) — mesmos títulos que Mobile/More.tsx e More/Index.tsx ——
        'mobile.news' => 'Notícias',
        'mobile.news.show' => 'Notícias — artigo',
        'mobile.offerings' => 'Dízimos e ofertas',
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
        'mobile.support.index' => 'Suporte',
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

        $human = str_replace(['.', '-', '_'], ' ', $routeName);

        return $human !== '' ? mb_convert_case($human, MB_CASE_TITLE, 'UTF-8') : $routeName;
    }
}
