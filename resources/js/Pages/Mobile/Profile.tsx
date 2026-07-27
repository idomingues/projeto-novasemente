import BiometricDisableButton from '@/Components/Auth/BiometricDisableButton';
import MobileLayout from '@/Layouts/MobileLayout';
import VolunteerSignupIncompleteBanner from '@/Components/Volunteers/VolunteerSignupIncompleteBanner';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRightOnRectangleIcon,
    Cog6ToothIcon,
    ClockIcon,
    InboxIcon,
    CalendarDaysIcon,
    CakeIcon,
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    LifebuoyIcon,
    ChevronDownIcon,
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
        /** Total no feed de notificações (igreja + caixa pessoal). */
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
        return 'bg-rose-600 text-white dark:bg-rose-500';
    }
    if (tone === 'member') {
        // Mesmo contraste dos cards PAINEL (rose): `primary` sobre fundo primary-50 pode ficar ilegível.
        return 'bg-rose-600 text-white shadow-sm ring-2 ring-white dark:bg-rose-500 dark:ring-zinc-900';
    }
    return 'bg-zinc-700 text-white dark:bg-zinc-600';
}

function RowItem({ row }: { row: Row }) {
    const Icon = row.icon;

    if (row.onClick === 'logout') {
        return (
            <Link
                href={route('logout')}
                method="post"
                as="button"
                className="group w-full cursor-pointer rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-rose-200/70 transition duration-200 hover:bg-rose-50/70 hover:shadow-md hover:ring-rose-300/80 active:bg-rose-50 dark:bg-zinc-900 dark:ring-rose-900/50 dark:hover:bg-rose-950/30 dark:hover:ring-rose-800/60"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/50">
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-rose-700 dark:text-rose-200">{row.title}</div>
                        <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{row.description}</div>
                    </div>
                </div>
            </Link>
        );
    }

    const tone = row.tone ?? 'member';
    const cardClass =
        tone === 'critical'
            ? 'group block cursor-pointer rounded-2xl bg-amber-50/90 p-4 shadow-sm ring-1 ring-amber-200/80 transition duration-200 hover:bg-amber-50 hover:shadow-md hover:ring-amber-300/90 active:bg-amber-100/80 dark:bg-amber-950/30 dark:ring-amber-800/50 dark:hover:bg-amber-950/45 dark:hover:ring-amber-700/60'
            : tone === 'member'
              ? 'group block cursor-pointer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-200/60 transition duration-200 hover:bg-rose-50/50 hover:shadow-md hover:ring-rose-300/70 active:bg-rose-50/80 dark:bg-zinc-900 dark:ring-rose-900/40 dark:hover:bg-rose-950/25 dark:hover:ring-rose-800/55'
              : 'group block cursor-pointer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/80 transition duration-200 hover:bg-zinc-50 hover:shadow-md hover:ring-zinc-300/90 active:bg-zinc-100/80 dark:bg-zinc-900 dark:ring-zinc-700/70 dark:hover:bg-zinc-800/60 dark:hover:ring-zinc-600/70';
    const iconWrapClass =
        tone === 'critical'
            ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200/80 dark:bg-amber-900/35 dark:text-amber-200 dark:ring-amber-800/50'
            : tone === 'member'
              ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70 dark:bg-rose-950/45 dark:text-rose-200 dark:ring-rose-800/50'
              : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700/60';
    const iconClass = 'h-6 w-6';

    return (
        <Link href={row.href ?? '#'} className={cardClass}>
            <div className="flex items-center gap-4">
                <div className={iconWrapClass}>
                    <Icon className={iconClass} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-zinc-900 dark:text-white">{row.title}</div>
                        {tone === 'critical' ? (
                            <span className="shrink-0 rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                                Painel
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{row.description}</div>
                </div>
                {typeof row.badgeCount === 'number' ? (
                    <span
                        className={`ml-auto inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${countBadgeClass(tone)}`}
                        title={`${row.badgeCount} ${row.badgeCount === 1 ? 'item' : 'itens'}`}
                        aria-label={`${row.badgeCount} ${row.badgeCount === 1 ? 'item' : 'itens'}`}
                    >
                        {row.badgeCount > 99 ? '99+' : row.badgeCount}
                    </span>
                ) : null}
            </div>
        </Link>
    );
}

export default function MobileProfile({ church, user, profileCounts, volunteerSignupCompletion = null }: Props) {
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
    const canShowComunicacaoLider =
        route().has('communication-requests.index') && isMinistryLeader && !canShowComunicacaoPainel;

    const memberRows: Row[] = [
        {
            title: 'Minhas Notificações',
            description: 'Avisos de eventos e notícias',
            icon: InboxIcon,
            href: route('mobile.notifications'),
            tone: 'member',
            badgeCount: profileCounts.notifications,
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
        ...((isMinistryLeader || isVolunteer) && route().has('mobile.leader.birthdays')
            ? ([
                  {
                      title: 'Aniversariantes do mês',
                      description: 'Da sua área — com destaque no dia e parabéns pelo NS Conecta',
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
        ...(canShowComunicacaoLider
            ? ([
                  {
                      title: 'Solicitações de Comunicação',
                      description: 'Abrir e acompanhar pedidos da Comunicação',
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
        {
            title: 'Configurações',
            description: 'Tema e preferências',
            icon: Cog6ToothIcon,
            href: route('mobile.settings'),
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
                            typeof profileCounts.atendimento_open === 'number'
                                ? profileCounts.atendimento_open
                                : null,
                  },
              ] as Row[])
            : []),
        ...(canShowComunicacaoPainel
            ? ([
                  {
                      title: 'Comunicação',
                      description: 'Solicitações e acompanhamento (painel)',
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
                            typeof profileCounts.pastoral_agenda === 'number' ? profileCounts.pastoral_agenda : null,
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
                <div className="flex items-start justify-between gap-4 rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900/70 dark:ring-zinc-700/70">
                    <div className="flex min-w-0 items-start gap-4">
                        {user.photo_url ? (
                            <img
                                src={user.photo_url}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-zinc-800"
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white shadow-sm ring-2 ring-white dark:bg-zinc-700 dark:ring-zinc-800">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                <ChevronDownIcon className="h-4 w-4" aria-hidden />
                                <span>Meu perfil</span>
                            </div>
                            <div className="mt-1 truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                {user.name}
                            </div>
                            <div className="mt-1 space-y-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                                <div className="truncate" title={user.email}>
                                    {user.email}
                                </div>
                                <div className="truncate">
                                    {birthDateLabel
                                        ? `Nascimento: ${birthDateLabel}`
                                        : 'Data de nascimento não informada'}
                                </div>
                                <div className="truncate">{church?.name ?? 'Igreja'}</div>
                            </div>
                        </div>
                    </div>

                    <Link
                        href={route('mobile.profile.edit')}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200/80 transition hover:bg-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                    >
                        <PencilSquareIcon className="h-4 w-4" aria-hidden />
                        Editar perfil
                    </Link>
                </div>

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

                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 px-4 pb-6">
                    Ao sair, seus dados de sessão serão removidos deste dispositivo.
                </p>
            </div>
        </MobileLayout>
    );
}

