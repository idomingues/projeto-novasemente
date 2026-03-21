import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import { Head } from '@inertiajs/react';
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

export default function VariosServices({ churchName, services }: Props) {
    const byDay = services.reduce<Record<string, ServiceItem[]>>((acc, s) => {
        const key = s.day_name;
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
    }, {});
    const dayOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const sortedDays = Object.keys(byDay).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    return (
        <AdminLayout>
            <Head title="Cultos e horários" />
            <div className="space-y-6 sm:space-y-8">
                <PageHeader title="Cultos e horários" subtitle={churchName ?? undefined} />

                <WeeklyAgendaNovaSemente churchName={churchName ?? 'Nova Semente'} />

                {services.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Outros horários cadastrados
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {sortedDays.map((day) => (
                                <div
                                    key={day}
                                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{day}</h3>
                                    </div>
                                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {byDay[day].map((s) => (
                                            <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                                                <ClockIcon
                                                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500 dark:text-brand-400"
                                                    aria-hidden
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-medium text-zinc-900 dark:text-white">
                                                        {s.name}
                                                    </span>
                                                    <span className="mt-0.5 block text-sm font-medium tabular-nums text-brand-700 dark:text-brand-300">
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
        </AdminLayout>
    );
}
