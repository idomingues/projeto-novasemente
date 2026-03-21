import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ClockIcon } from '@heroicons/react/24/outline';
import WeeklyAgendaNovaSemente from '@/Components/WeeklyAgendaNovaSemente';

interface ServiceItem {
    id: number;
    day_of_week: number;
    day_name: string;
    name: string;
    start_time: string;
    end_time: string | null;
}

interface Props {
    churchName: string | null;
    services: ServiceItem[];
}

export default function MobileServices({ churchName, services }: Props) {
    const byDay = services.reduce<Record<string, ServiceItem[]>>((acc, s) => {
        const key = s.day_name;
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
    }, {});
    const dayOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const sortedDays = Object.keys(byDay).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    return (
        <MobileLayout>
            <Head title="Cultos e horários" />
            <div className="space-y-6">
                <div>
                    <Link
                        href={route('mobile.more')}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        ← Mais
                    </Link>
                    <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">Cultos e horários</h1>
                    {churchName && (
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{churchName}</p>
                    )}
                </div>

                <WeeklyAgendaNovaSemente churchName={churchName ?? 'Nova Semente'} />

                {services.length > 0 && (
                    <section>
                        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Outros horários cadastrados
                        </h2>
                        <div className="space-y-4">
                            {sortedDays.map((day) => (
                                <div
                                    key={day}
                                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-800/50">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white">{day}</h3>
                                    </div>
                                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {byDay[day].map((s) => (
                                            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                                                <ClockIcon className="h-5 w-5 flex-shrink-0 text-zinc-400" />
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-medium text-zinc-900 dark:text-white">
                                                        {s.name}
                                                    </span>
                                                    <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                                                        {s.start_time}
                                                        {s.end_time ? ` – ${s.end_time}` : ''}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </MobileLayout>
    );
}
