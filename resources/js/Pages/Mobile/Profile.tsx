import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRightOnRectangleIcon,
    Cog6ToothIcon,
    ClockIcon,
    CurrencyDollarIcon,
    InboxIcon,
    CalendarDaysIcon,
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    UserPlusIcon,
    LifebuoyIcon,
    UserCircleIcon,
    ChevronDownIcon,
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

    return (
        <Link
            href={row.href ?? '#'}
            className="block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <Icon className="h-6 w-6 text-zinc-700 dark:text-zinc-200" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-zinc-900 dark:text-white">{row.title}</div>
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

    const rows: Row[] = [
        {
            title: 'Notificações',
            description: 'Avisos de eventos e notícias',
            icon: InboxIcon,
            href: route('mobile.notifications'),
        },
        {
            title: 'Solicitações',
            description: 'Batismo, apresentação, visita pastoral',
            icon: SparklesIcon,
            href: route('mobile.solicitations.hub'),
        },
        {
            title: 'Agendar com pastor',
            description: 'Os meus pedidos e novo agendamento',
            icon: ClockIcon,
            href: route('mobile.pastoral-appointments.request'),
        },
        {
            title: 'Falar com líder',
            description: 'Conversa com líder de ministério (membro logado)',
            icon: ChatBubbleLeftRightIcon,
            href: route('mobile.contact'),
        },
        ...(!isVolunteer
            ? ([
                  {
                      title: 'Cadastro de voluntário',
                      description: 'Quero servir em ministérios (formulário completo)',
                      icon: UserPlusIcon,
                      href: route('volunteers.public-signup.page'),
                  },
              ] as Row[])
            : []),
        {
            title: 'Escala',
            description: 'Escala de voluntários',
            icon: CalendarDaysIcon,
            href: route('mobile.schedule'),
        },
        {
            title: 'Dízimos e Ofertas',
            description: 'Contribuições e ofertas',
            icon: CurrencyDollarIcon,
            href: route('mobile.offerings'),
        },
        {
            title: 'Suporte do app',
            description: 'Problema ou sugestão sobre a aplicação',
            icon: LifebuoyIcon,
            href: route('mobile.support.index'),
        },
        {
            title: 'Configurações',
            description: 'Tema e preferências',
            icon: Cog6ToothIcon,
            href: route('mobile.settings'),
        },
        ...(canAccessSolicitationsAdmin
            ? ([
                  {
                      title: 'Atendimento',
                      description: 'Gestão de solicitações (painel)',
                      icon: InboxIcon,
                      href: route('solicitations.index'),
                  },
                  {
                      title: 'Pedidos de batismo',
                      description: 'Tratamento de pedidos de batismo (painel)',
                      icon: SparklesIcon,
                      href: route('baptism-requests.index'),
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
                  },
              ] as Row[])
            : []),
        {
            title: 'Sair',
            description: 'Encerrar sessão nesta conta',
            icon: ArrowRightOnRectangleIcon,
            onClick: 'logout',
        },
    ];

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
                </div>

                <div className="space-y-3">
                    {rows.slice(0, -1).map((r) => (
                        <RowItem key={r.title} row={r} />
                    ))}
                </div>

                <div className="pt-1">
                    <RowItem row={rows[rows.length - 1]} />
                </div>

                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 px-4 pb-6">
                    Ao sair, seus dados de sessão serão removidos deste dispositivo.
                </p>
            </div>
        </MobileLayout>
    );
}

