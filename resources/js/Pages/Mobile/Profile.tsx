import BiometricDisableButton from '@/Components/Auth/BiometricDisableButton';
import MobileLayout from '@/Layouts/MobileLayout';
import VolunteerSignupIncompleteBanner from '@/Components/Volunteers/VolunteerSignupIncompleteBanner';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRightOnRectangleIcon,
    ClockIcon,
    InboxIcon,
    CalendarDaysIcon,
    CakeIcon,
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    LifebuoyIcon,
    ChevronRightIcon,
    PencilSquareIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Props {
    church: { name: string } | null;
    user: { name: string; email: string; birth_date?: string | null; photo_url?: string | null };
    volunteerSignupCompletion?: VolunteerSignupCompletion | null;
    profileCounts: {
        /** Pedidos em aberto no painel Atendimento Pastoral (null se o usuário não vê o painel). */
        atendimento_open: number | null;
        /** Compromissos na agenda do perfil ligado (null se não há pastor ligado à conta). */
        pastoral_agenda: number | null;
        /** Notificações pessoais ainda não lidas (mesmo critério do sino). */
        notifications: number;
        /** Conversas NS Conecta aguardando sua resposta. */
        ns_whats_pending?: number;
    };
}

type Row = {
    title: string;
    description: string;
    icon: typeof InboxIcon;
    href?: string;
    onClick?: 'logout';
    tone?: 'member' | 'public' | 'critical';
    /** Contagem no canto do card; `null` omite o badge. */
    badgeCount?: number | null;
    /** Singular/plural para acessibilidade do badge (ex.: não lida / não lidas). */
    badgeLabel?: { one: string; many: string };
};

/** Formata Y-m-d sem deslocar fuso (evita dia errado com Date UTC). */
function formatBirthDateBr(iso: string | null | undefined): string | null {
    if (!iso) {
        return null;
    }
    const ymd = iso.slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) {
        return null;
    }
    return `${m[3]}/${m[2]}/${m[1]}`;
}

function countBadgeClass(tone: Row['tone']): string {
    if (tone === 'critical') {
        return 'bg-brand-600 text-white shadow-sm shadow-brand-600/25 ring-2 ring-white dark:bg-brand-500 dark:ring-zinc-900';
    }
    if (tone === 'member') {
        return 'bg-zinc-900 text-white shadow-sm shadow-zinc-900/25 ring-2 ring-white dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-900';
    }
    return 'bg-zinc-800 text-white dark:bg-zinc-600';
}

function RowItem({ row }: { row: Row }) {
    const Icon = row.icon;

    if (row.onClick === 'logout') {
        return (
            <Link
                href={route('logout')}
                method="post"
                as="button"
                className="group relative w-full cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-rose-50/80 p-4 text-left shadow-sm ring-1 ring-rose-200/70 transition duration-200 hover:bg-rose-600 hover:bg-none hover:shadow-md hover:ring-rose-700 active:scale-[0.99] dark:from-zinc-900 dark:via-zinc-900 dark:to-rose-950/40 dark:ring-rose-900/50 dark:hover:bg-rose-500 dark:hover:bg-none dark:hover:ring-rose-400"
            >
                <div className="relative flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200/80 transition duration-200 group-hover:bg-white/15 group-hover:text-white group-hover:ring-white/30 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50 dark:group-hover:bg-white/15 dark:group-hover:text-white dark:group-hover:ring-white/30">
                        <ArrowRightOnRectangleIcon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-rose-700 transition group-hover:text-white dark:text-rose-200 dark:group-hover:text-white">
                            {row.title}
                        </div>
                        <div className="mt-0.5 text-sm text-zinc-500 transition group-hover:text-rose-100 dark:text-zinc-400 dark:group-hover:text-rose-100">
                            {row.description}
                        </div>
                    </div>
                    <ChevronRightIcon
                        className="h-5 w-5 shrink-0 text-rose-300 transition group-hover:translate-x-0.5 group-hover:text-white dark:text-rose-700 dark:group-hover:text-white"
                        aria-hidden
                    />
                </div>
            </Link>
        );
    }

    const tone = row.tone ?? 'member';
    const cardClass =
        tone === 'critical'
            ? 'group relative block cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50/90 via-white to-brand-50/50 p-4 shadow-sm ring-1 ring-brand-200/70 transition duration-200 hover:bg-brand-600 hover:bg-none hover:shadow-md hover:ring-brand-700 active:scale-[0.99] dark:from-brand-950/50 dark:via-zinc-900 dark:to-brand-950/30 dark:ring-brand-800/50 dark:hover:bg-brand-500 dark:hover:bg-none dark:hover:ring-brand-400'
            : tone === 'member'
              ? 'group relative block cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-brand-50/40 p-4 shadow-sm ring-1 ring-zinc-200/80 transition duration-200 hover:bg-zinc-950 hover:bg-none hover:shadow-md hover:ring-zinc-800 active:scale-[0.99] dark:from-zinc-900 dark:via-zinc-900 dark:to-brand-950/30 dark:ring-zinc-700/70 dark:hover:bg-white dark:hover:bg-none dark:hover:ring-zinc-200/80'
              : 'group relative block cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-zinc-50 p-4 shadow-sm ring-1 ring-zinc-200/80 transition duration-200 hover:bg-zinc-950 hover:bg-none hover:shadow-md hover:ring-zinc-800 active:scale-[0.99] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/40 dark:ring-zinc-700/70 dark:hover:bg-white dark:hover:bg-none dark:hover:ring-zinc-200/80';
    const iconWrapClass =
        tone === 'critical'
            ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/80 transition duration-200 group-hover:bg-white/15 group-hover:text-white group-hover:ring-white/30 dark:bg-brand-950/45 dark:text-brand-300 dark:ring-brand-800/60 dark:group-hover:bg-white/15 dark:group-hover:text-white dark:group-hover:ring-white/30'
            : tone === 'member'
              ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-800 ring-1 ring-inset ring-zinc-200/80 transition duration-200 group-hover:bg-white/10 group-hover:text-white group-hover:ring-white/25 dark:bg-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700/70 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-800 dark:group-hover:ring-zinc-200/80'
              : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-200/80 transition duration-200 group-hover:bg-white/10 group-hover:text-white group-hover:ring-white/25 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-zinc-700/60 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-600 dark:group-hover:ring-zinc-200/80';
    const glowClass =
        tone === 'critical'
            ? 'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-400/15 blur-2xl transition duration-300 group-hover:bg-white/10 dark:bg-brand-500/10 dark:group-hover:bg-white/10'
            : tone === 'member'
              ? 'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-400/10 blur-2xl transition duration-300 group-hover:bg-white/10 dark:bg-brand-500/8 dark:group-hover:bg-brand-400/15'
              : 'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-zinc-400/10 blur-2xl transition duration-300 group-hover:bg-white/10 dark:bg-zinc-500/10 dark:group-hover:bg-zinc-400/20';
    const chevronClass =
        tone === 'critical'
            ? 'h-5 w-5 shrink-0 text-brand-300 transition group-hover:translate-x-0.5 group-hover:text-white dark:text-brand-800 dark:group-hover:text-white'
            : tone === 'member'
              ? 'h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-white dark:text-zinc-600 dark:group-hover:text-zinc-500'
              : 'h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-white dark:text-zinc-600 dark:group-hover:text-zinc-500';
    const titleClass =
        tone === 'critical'
            ? 'font-semibold text-zinc-900 transition group-hover:text-white dark:text-white dark:group-hover:text-white'
            : 'font-semibold text-zinc-900 transition group-hover:text-white dark:text-white dark:group-hover:text-zinc-900';
    const descriptionClass =
        tone === 'critical'
            ? 'mt-0.5 text-sm text-zinc-500 transition group-hover:text-brand-100 dark:text-zinc-400 dark:group-hover:text-brand-100'
            : 'mt-0.5 text-sm text-zinc-500 transition group-hover:text-zinc-300 dark:text-zinc-400 dark:group-hover:text-zinc-500';
    const painelBadgeClass =
        'shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 ring-1 ring-inset ring-brand-200/80 transition group-hover:bg-white/15 group-hover:text-white group-hover:ring-white/30 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-800/70 dark:group-hover:bg-white/15 dark:group-hover:text-white dark:group-hover:ring-white/30';
    const iconClass = 'h-6 w-6';

    return (
        <Link href={row.href ?? '#'} className={cardClass}>
            <span className={glowClass} aria-hidden />
            <div className="relative flex items-center gap-4">
                <div className={iconWrapClass}>
                    <Icon className={iconClass} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={titleClass}>{row.title}</div>
                        {tone === 'critical' ? <span className={painelBadgeClass}>Painel</span> : null}
                    </div>
                    <div className={descriptionClass}>{row.description}</div>
                </div>
                {typeof row.badgeCount === 'number' && row.badgeCount > 0 ? (
                    <span
                        className={`inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums transition group-hover:ring-2 group-hover:ring-white/30 ${countBadgeClass(tone)}`}
                        title={`${row.badgeCount} ${row.badgeCount === 1 ? (row.badgeLabel?.one ?? 'item') : (row.badgeLabel?.many ?? 'itens')}`}
                        aria-label={`${row.badgeCount} ${row.badgeCount === 1 ? (row.badgeLabel?.one ?? 'item') : (row.badgeLabel?.many ?? 'itens')}`}
                    >
                        {row.badgeCount > 99 ? '99+' : row.badgeCount}
                    </span>
                ) : null}
                <ChevronRightIcon className={chevronClass} aria-hidden />
            </div>
        </Link>
    );
}

export default function MobileProfile({ user, profileCounts, volunteerSignupCompletion = null }: Props) {
    const birthDateLabel = formatBirthDateBr(user.birth_date);
    const page = usePage();
    const auth = (page.props as {
        auth?: {
            permissions?: string[];
            canAccessAdminMenu?: boolean;
            adminSidebarUnrestricted?: boolean;
            linkedPastor?: { id: number } | null;
            user?: { is_volunteer?: boolean; is_ministry_leader?: boolean };
            /** Propriedade `is_ministry_leader` na conta. */
            isMinistryLeaderAccount?: boolean;
        };
    }).auth;
    const linkedPastor = auth?.linkedPastor ?? null;
    const permissions = auth?.permissions ?? [];
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const isVolunteer = auth?.user?.is_volunteer === true;
    /**
     * "Minha Agenda" é um item específico do perfil de pastor.
     * Portanto, só deve aparecer quando a conta tiver um registro de pastor ligado na igreja em contexto.
     */
    const showMyPastoralAgenda = linkedPastor !== null;

    /** Painel web «Atendimento Pastoral» — equipe com acesso ao painel (não fica em Mais). */
    const adminUnrestricted = auth?.adminSidebarUnrestricted === true;
    const canShowAtendimentoPainel =
        canAccessAdminMenu &&
        route().has('solicitations.index') &&
        (adminUnrestricted ||
            permissions.includes('solicitations.view') ||
            permissions.includes('solicitations.manage'));
    const isMinistryLeader = auth?.isMinistryLeaderAccount === true;
    const canShowComunicacaoPainel =
        route().has('communication-requests.index') &&
        canAccessAdminMenu &&
        (adminUnrestricted ||
            permissions.includes('solicitations.view') ||
            permissions.includes('solicitations.manage'));
    const canShowComunicacaoPedido =
        route().has('communication-requests.index') &&
        (isMinistryLeader || isVolunteer) &&
        !canShowComunicacaoPainel;

    const memberRows: Row[] = [
        {
            title: 'Minhas Notificações',
            description: 'Avisos de eventos e notícias',
            icon: InboxIcon,
            href: route('mobile.notifications'),
            tone: 'member',
            badgeCount: profileCounts.notifications > 0 ? profileCounts.notifications : null,
            badgeLabel: { one: 'não lida', many: 'não lidas' },
        },
        {
            title: 'Minha Escala',
            description: 'Escala de voluntários',
            icon: CalendarDaysIcon,
            href: route('mobile.schedule'),
            tone: 'member',
        },
        ...(isMinistryLeader
            ? ([
                  {
                      title: 'Gestão de Escala',
                      description: 'Gestão de voluntários na escala dos seus departamentos',
                      icon: CalendarDaysIcon,
                      href: route('escalas.index'),
                      tone: 'member',
                  },
                  {
                      title: 'Meus voluntários',
                      description: 'Fluxo completo do líder: novos, em atividade e solicitar voluntário',
                      icon: UserGroupIcon,
                      href: route('ministry-lead.my-volunteers.index'),
                      tone: 'member',
                  },
              ] as Row[])
            : []),
        ...((isMinistryLeader || isVolunteer || adminUnrestricted) && route().has('mobile.leader.birthdays')
            ? ([
                  {
                      title: 'Aniversariantes do mês',
                      description: adminUnrestricted
                          ? 'Da sua área ou todos os voluntários em ordem alfabética'
                          : 'Da sua área — com destaque no dia e parabéns pelo NS Conecta',
                      icon: CakeIcon,
                      href: route('mobile.leader.birthdays'),
                      tone: 'member',
                  },
              ] as Row[])
            : []),
        ...(route().has('mobile.ns-whats.index')
            ? ([
                  {
                      title: 'NS Conecta',
                      description: 'Converse com departamentos, líderes e voluntários.',
                      icon: ChatBubbleLeftRightIcon,
                      href: route('mobile.ns-whats.index'),
                      tone: 'member',
                      badgeCount:
                          typeof profileCounts.ns_whats_pending === 'number' && profileCounts.ns_whats_pending > 0
                              ? profileCounts.ns_whats_pending
                              : null,
                  },
              ] as Row[])
            : []),
        ...(route().has('mobile.solicitations.hub')
            ? ([
                  {
                      title: 'Solicitações',
                      description: 'Batismo, apresentação e outros pedidos',
                      icon: SparklesIcon,
                      href: route('mobile.solicitations.hub'),
                      tone: 'member',
                  },
              ] as Row[])
            : []),
        ...(route().has('mobile.pastoral-appointments.request')
            ? ([
                  {
                      title: 'Agendamento pastoral',
                      description: 'Marque um horário com um pastor da igreja',
                      icon: ClockIcon,
                      href: route('mobile.pastoral-appointments.request'),
                      tone: 'member',
                  },
              ] as Row[])
            : []),
        ...(canShowComunicacaoPedido
            ? ([
                  {
                      title: 'Solicite a Comunicação',
                      description: 'Peça arte, divulgação, cobertura ou suporte técnico',
                      icon: ChatBubbleLeftRightIcon,
                      href: route('communication-requests.index'),
                      tone: 'member',
                  },
              ] as Row[])
            : []),
        {
            title: 'Suporte do APP',
            description: 'Problema ou sugestão sobre a aplicação',
            icon: LifebuoyIcon,
            href: route('mobile.support.index'),
            tone: 'member',
        },
    ];

    const publicRows: Row[] = [];

    const adminRows: Row[] = [
        ...(canShowAtendimentoPainel
            ? ([
                  {
                      title: 'Atendimento Pastoral',
                      description: 'Solicitações da igreja, batismo e visitas (painel)',
                      icon: InboxIcon,
                      href: route('solicitations.index'),
                      tone: 'critical',
                      badgeCount:
                            typeof profileCounts.atendimento_open === 'number' && profileCounts.atendimento_open > 0
                                ? profileCounts.atendimento_open
                                : null,
                  },
              ] as Row[])
            : []),
        ...(canShowComunicacaoPainel
            ? ([
                  {
                      title: 'Comunicação',
                      description: 'Solicitações para área de Comunicação',
                      icon: ChatBubbleLeftRightIcon,
                      href: route('communication-requests.index'),
                      tone: 'critical',
                  },
              ] as Row[])
            : []),
        ...(showMyPastoralAgenda
            ? ([
                  {
                      title: 'Minha Agenda',
                      description: 'Compromissos e disponibilidade do seu perfil (painel)',
                      icon: ClockIcon,
                      href: route('pastoral-agenda.index', { mine: 1 }),
                      tone: 'critical',
                      badgeCount:
                            typeof profileCounts.pastoral_agenda === 'number' && profileCounts.pastoral_agenda > 0
                                ? profileCounts.pastoral_agenda
                                : null,
                  },
              ] as Row[])
            : []),
    ];

    const logoutRow: Row = {
        title: 'Sair',
        description: 'Encerrar sessão nesta conta',
        icon: ArrowRightOnRectangleIcon,
        onClick: 'logout',
    };

    return (
        <MobileLayout>
            <Head title="Meu perfil" />

            <div className="space-y-6">
                <Link
                    href={route('mobile.profile.edit')}
                    aria-label="Editar perfil"
                    className="group relative flex cursor-pointer items-start gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-brand-50/60 p-5 shadow-sm ring-1 ring-brand-900/8 transition duration-200 hover:shadow-md hover:ring-brand-600/20 active:scale-[0.99] dark:from-zinc-900 dark:via-zinc-900 dark:to-brand-950/40 dark:ring-white/8 dark:hover:ring-brand-400/25"
                >
                    <span
                        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand-400/10 blur-2xl transition duration-300 group-hover:bg-brand-400/20 dark:bg-brand-500/10"
                        aria-hidden
                    />
                    {user.photo_url ? (
                        <img
                            src={user.photo_url}
                            alt=""
                            className="relative h-16 w-16 shrink-0 rounded-full object-cover shadow-md ring-2 ring-white dark:ring-zinc-800"
                        />
                    ) : (
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 text-xl font-bold text-white shadow-md ring-2 ring-white dark:from-zinc-700 dark:to-zinc-900 dark:ring-zinc-800">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="relative min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                            <span className="font-medium">Meu perfil</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-200/80 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-800/70">
                                <PencilSquareIcon className="h-3.5 w-3.5" aria-hidden />
                                Toque para editar
                            </span>
                        </div>
                        <div className="mt-1 break-words text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                            {user.name}
                        </div>
                        <div className="mt-1.5 space-y-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            <div className="break-all">{user.email}</div>
                            <div>
                                {birthDateLabel
                                    ? `Nascimento: ${birthDateLabel}`
                                    : 'Data de nascimento não informada'}
                            </div>
                        </div>
                    </div>
                    <ChevronRightIcon
                        className="relative mt-1 h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-zinc-600 dark:group-hover:text-brand-400"
                        aria-hidden
                    />
                </Link>

                {volunteerSignupCompletion ? (
                    <VolunteerSignupIncompleteBanner completion={volunteerSignupCompletion} />
                ) : null}

                {adminRows.length > 0 ? (
                    <div className="space-y-3">
                        {adminRows.map((r) => (
                            <RowItem key={r.title} row={r} />
                        ))}
                    </div>
                ) : null}

                <div className="space-y-3">
                    {memberRows.map((r) => (
                        <RowItem key={r.title} row={r} />
                    ))}
                </div>

                {publicRows.length > 0 ? (
                    <div className="space-y-3 pt-2">
                        {publicRows.map((r) => (
                            <RowItem key={r.title} row={r} />
                        ))}
                    </div>
                ) : null}

                <div className="space-y-3 pt-1">
                    <BiometricDisableButton />
                    <RowItem row={logoutRow} />
                </div>

                <p className="px-4 pb-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Ao sair, seus dados de sessão serão removidos deste dispositivo.
                </p>
            </div>
        </MobileLayout>
    );
}
