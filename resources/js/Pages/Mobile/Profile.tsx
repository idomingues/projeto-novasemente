import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRightOnRectangleIcon,
    Cog6ToothIcon,
    ClockIcon,
    InboxIcon,
    CalendarDaysIcon,
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    LifebuoyIcon,
    UserCircleIcon,
    ChevronDownIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface Props {
    church: { name: string } | null;
    user: { name: string; email: string };
}

type Row = {
    title: string;
    description: string;
    icon: typeof InboxIcon;
    href?: string;
    onClick?: 'logout';
    tone?: 'member' | 'public' | 'critical';
};

function RowItem({ row }: { row: Row }) {
    const Icon = row.icon;

    if (row.onClick === 'logout') {
        return (
            <Link
                href={route('logout')}
                method="post"
                as="button"
                className="w-full text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40">
                        <ArrowRightOnRectangleIcon className="h-6 w-6 text-rose-700 dark:text-rose-300" />
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
            ? 'block rounded-2xl border border-amber-300 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/25 p-4 shadow-sm transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/40'
            : tone === 'member'
              ? 'block rounded-2xl border border-primary-200 dark:border-primary-900 bg-primary-50/80 dark:bg-primary-950/30 p-4 shadow-sm transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/45'
              : 'block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40';
    const iconWrapClass =
        tone === 'critical'
            ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30'
            : tone === 'member'
              ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/40'
              : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800';
    const iconClass =
        tone === 'critical'
            ? 'h-6 w-6 text-amber-800 dark:text-amber-200'
            : tone === 'member'
              ? 'h-6 w-6 text-primary-700 dark:text-primary-200'
              : 'h-6 w-6 text-zinc-700 dark:text-zinc-200';

    return (
        <Link
            href={row.href ?? '#'}
            className={cardClass}
        >
            <div className="flex items-center gap-4">
                <div className={iconWrapClass}>
                    <Icon className={iconClass} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <div className="font-semibold text-zinc-900 dark:text-white">{row.title}</div>
                        {tone === 'critical' ? (
                            <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                                Painel
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{row.description}</div>
                </div>
            </div>
        </Link>
    );
}

export default function MobileProfile({ church, user }: Props) {
    const page = usePage();
    const auth = (page.props as { auth?: { permissions?: string[]; canAccessAdminMenu?: boolean; pastoralAgendaMenuVisible?: boolean; user?: { is_volunteer?: boolean } } }).auth;
    const permissions = auth?.permissions ?? [];
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const isVolunteer = auth?.user?.is_volunteer === true;
    const pastoralAgendaMenuVisible =
        auth?.pastoralAgendaMenuVisible === true ||
        canAccessAdminMenu ||
        permissions.includes('pastors.view') ||
        permissions.includes('pastors.manage') ||
        permissions.includes('pastoral_appointments.manage');

    const canAccessSolicitationsAdmin =
        canAccessAdminMenu || permissions.includes('solicitations.view') || permissions.includes('solicitations.manage');

    const memberRows: Row[] = [
        {
            title: 'Notificações',
            description: 'Avisos de eventos e notícias',
            icon: InboxIcon,
            href: route('mobile.notifications'),
            tone: 'member',
        },
        {
            title: 'Minha Escala',
            description: 'Escala de voluntários',
            icon: CalendarDaysIcon,
            href: route('mobile.schedule'),
            tone: 'member',
        },
        {
            title: 'Falar com um Líder',
            description: 'Conversa com líder de ministério (membro logado)',
            icon: ChatBubbleLeftRightIcon,
            href: route('mobile.contact'),
            tone: 'member',
        },
        {
            title: 'Solicitações',
            description: 'Batismo, apresentação, visita pastoral',
            icon: SparklesIcon,
            href: route('mobile.solicitations.hub'),
            tone: 'member',
        },
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
        ...(canAccessSolicitationsAdmin
            ? ([
                  {
                      title: 'Atendimento',
                      description: 'Solicitações e pedidos de batismo (painel)',
                      icon: InboxIcon,
                      href: route('solicitations.index'),
                      tone: 'critical',
                  },
              ] as Row[])
            : []),
        ...(pastoralAgendaMenuVisible
            ? ([
                  {
                      title: 'Agenda pastoral',
                      description: 'Disponibilidade semanal (painel)',
                      icon: ClockIcon,
                      href: route('pastoral-agenda.index'),
                      tone: 'critical',
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
                <div className="flex items-start justify-between gap-4 rounded-3xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-5">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-300">
                            <UserCircleIcon className="h-10 w-10" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                <ChevronDownIcon className="h-4 w-4" aria-hidden />
                                <span>Meu perfil</span>
                            </div>
                            <div className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                                {user.name}
                            </div>
                            <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                {church?.name ?? 'Igreja'}
                            </div>
                        </div>
                    </div>

                    <Link
                        href={route('mobile.profile.edit')}
                        className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <PencilSquareIcon className="h-4 w-4" aria-hidden />
                        Editar perfil
                    </Link>
                </div>

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

                <div className="pt-1">
                    <RowItem row={logoutRow} />
                </div>

                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 px-4 pb-6">
                    Ao sair, seus dados de sessão serão removidos deste dispositivo.
                </p>
            </div>
        </MobileLayout>
    );
}

