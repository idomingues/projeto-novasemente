import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { UsersIcon, UserGroupIcon, EllipsisHorizontalIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';

interface UpcomingEvent {
    id: number;
    title: string;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    location: string | null;
}

interface DashboardStats {
    members: number;
    volunteers: number;
    prayerRequests: number;
}

interface TopPageRow {
    routeName: string;
    label: string;
    views: number;
}

function formatEventDayLabel(iso: string): { weekday: string; day: string } {
    const d = new Date(iso);
    const weekday = d
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .slice(0, 3)
        .toUpperCase();
    const day = String(d.getDate());
    return { weekday, day };
}

function formatEventTimeRange(ev: UpcomingEvent): string {
    const start = new Date(ev.starts_at);
    if (ev.all_day) {
        return 'Dia todo';
    }
    const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (!ev.ends_at) {
        return startTime;
    }
    const end = new Date(ev.ends_at);
    const endTime = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
}

function formatStat(n: number): string {
    return n.toLocaleString('pt-BR');
}

const defaultStats: DashboardStats = { members: 0, volunteers: 0, prayerRequests: 0 };

export default function Dashboard({
    upcomingEvents = [],
    stats = defaultStats,
    churchName = null,
    topPages = [],
    pageViewsPeriodDays = null,
}: {
    upcomingEvents?: UpcomingEvent[];
    stats?: DashboardStats;
    churchName?: string | null;
    topPages?: TopPageRow[];
    pageViewsPeriodDays?: number | null;
}) {
    const statCards = [
        {
            name: 'Usuários',
            value: formatStat(stats.members),
            icon: UsersIcon,
            href: route('users.index'),
            linkLabel: 'Ver membros',
        },
        {
            name: 'Voluntários',
            value: formatStat(stats.volunteers),
            icon: UserGroupIcon,
            href: route('ministry-lead.volunteers.central'),
            linkLabel: 'Ver voluntários',
        },
        {
            name: 'Pedidos de oração',
            value: formatStat(stats.prayerRequests),
            icon: PrayingHandsIcon,
            href: route('prayer.index'),
            linkLabel: 'Ver pedidos',
        },
    ];

    return (
        <AdminLayout>
            <Head title="Dashboard" />

            <PageHeader
                title="Dashboard"
                subtitle={
                    churchName ? (
                        <>
                            Dados da igreja: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{churchName}</span>
                        </>
                    ) : (
                        'Nenhuma igreja ativa selecionada'
                    )
                }
            />

            <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {statCards.map((stat) => (
                        <Card key={stat.name} className="group relative overflow-hidden">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-900 transition-colors group-hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
                                    <stat.icon className="h-6 w-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{stat.name}</p>
                                <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                    {stat.value}
                                </p>
                                <Link
                                    href={stat.href}
                                    className="mt-3 inline-flex text-sm font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-400"
                                >
                                    {stat.linkLabel} →
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>

                {pageViewsPeriodDays !== null && (
                    <Card>
                        <div className="mb-4 flex items-start gap-3">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
                                <ChartBarIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Páginas mais vistas</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Páginas de conteúdo mais abertas nos últimos {pageViewsPeriodDays} dias (sem abas da
                                    barra inferior, Dashboard nem feeds técnicos).
                                </p>
                            </div>
                        </div>
                        {topPages.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Ainda não há visualizações registradas neste período.
                            </p>
                        ) : (
                            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {topPages.map((row, idx) => (
                                    <li
                                        key={`${row.routeName}-${idx}`}
                                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                                {row.label}
                                            </p>
                                            <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-500">
                                                {row.routeName}
                                            </p>
                                        </div>
                                        <span className="flex-shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold tabular-nums text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                            {row.views.toLocaleString('pt-BR')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <Card>
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Atividades Recentes</h3>
                            <button
                                type="button"
                                className="text-zinc-400 transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white"
                                aria-label="Mais opções"
                            >
                                <EllipsisHorizontalIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="group flex cursor-pointer items-start">
                                    <div className="mr-4 flex flex-col items-center">
                                        <div className="h-2 w-2 rounded-full bg-zinc-300 transition-colors group-hover:bg-zinc-900 dark:bg-zinc-700 dark:group-hover:bg-white"></div>
                                        {i !== 4 && (
                                            <div className="my-1 h-full w-px bg-zinc-200 transition-colors group-hover:bg-zinc-300 dark:bg-zinc-800 dark:group-hover:bg-zinc-700"></div>
                                        )}
                                    </div>
                                    <div className="pb-6">
                                        <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-white">
                                            Novo membro cadastrado
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">Há {i} horas • Por Admin</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Próximos Eventos</h3>
                            <Link
                                href={route('events.index')}
                                className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                                Ver todos →
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {upcomingEvents.length === 0 && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Nenhum evento futuro cadastrado.
                                </p>
                            )}
                            {upcomingEvents.map((ev) => {
                                const { weekday, day } = formatEventDayLabel(ev.starts_at);
                                return (
                                    <div
                                        key={ev.id}
                                        className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                                    >
                                        <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 font-bold text-zinc-50 dark:bg-zinc-900 dark:text-zinc-300">
                                            <span className="text-xs uppercase">{weekday}</span>
                                            <span className="text-lg">{day}</span>
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-zinc-900 dark:text-white">{ev.title}</p>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-500">
                                                {formatEventTimeRange(ev)}
                                                {ev.location ? ` - ${ev.location}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
