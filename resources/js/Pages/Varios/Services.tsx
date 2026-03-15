import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { ClockIcon } from '@heroicons/react/24/outline';

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
            <div className="space-y-4 sm:space-y-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Cultos e horários</h1>
                    {churchName && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{churchName}</p>
                    )}
                </div>
                {services.length === 0 ? (
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                        <p className="text-zinc-500 dark:text-zinc-400">
                            Nenhum horário de culto cadastrado. A igreja pode configurar em Painel → Igrejas.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedDays.map((day) => (
                            <section
                                key={day}
                                className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                            >
                                <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white">{day}</h2>
                                </div>
                                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {byDay[day].map((s) => (
                                        <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                                            <ClockIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
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
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
