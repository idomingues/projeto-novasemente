import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { 
    UsersIcon, 
    CalendarIcon, 
    ArrowTrendingUpIcon,
    EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
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

export default function Dashboard({ upcomingEvents = [] }: { upcomingEvents?: UpcomingEvent[] }) {
    const stats = [
        { name: 'Total Membros', value: '1,257', change: '+12%', changeType: 'increase', icon: UsersIcon },
        { name: 'Cultos Realizados', value: '24', change: '-2', changeType: 'decrease', icon: CalendarIcon },
        { name: 'Novos Visitantes', value: '86', change: '+24%', changeType: 'increase', icon: ArrowTrendingUpIcon },
    ];

    return (
        <AdminLayout>
            <Head title="Dashboard" />

            <PageHeader title="Dashboard">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Últimos 30 dias</span>
                </button>
            </PageHeader>

            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat) => (
                        <Card key={stat.name} className="relative overflow-hidden group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900 group-hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-colors">
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className={`flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                                    stat.changeType === 'increase' 
                                    ? 'bg-green-950/30 text-green-400 border border-green-900/50' 
                                    : 'bg-red-950/30 text-red-400 border border-red-900/50'
                                }`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{stat.name}</p>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2 tracking-tight">{stat.value}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Content Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Atividades Recentes</h3>
                            <button className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors">
                                <EllipsisHorizontalIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-start group cursor-pointer">
                                    <div className="flex flex-col items-center mr-4">
                                        <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full group-hover:bg-zinc-900 dark:group-hover:bg-white transition-colors"></div>
                                        {i !== 4 && <div className="w-px h-full bg-zinc-200 dark:bg-zinc-800 my-1 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700"></div>}
                                    </div>
                                    <div className="pb-6">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Novo membro cadastrado</p>
                                        <p className="text-xs text-zinc-500 mt-1">Há {i} horas • Por Admin</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Próximos Eventos</h3>
                            <Link href={route('events.index')} className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">Ver todos →</Link>
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
                                        className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors flex items-center gap-4 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700"
                                    >
                                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-zinc-50 font-bold border border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                                            <span className="text-xs uppercase">{weekday}</span>
                                            <span className="text-lg">{day}</span>
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-zinc-900 dark:text-white">
                                                {ev.title}
                                            </p>
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
