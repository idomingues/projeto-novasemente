import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ClockIcon } from '@heroicons/react/24/outline';
import WeeklyProgramSchedule, { type WeeklyProgramScheduleItem } from '@/Components/WeeklyProgramSchedule';

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
    weeklyProgram?: WeeklyProgramScheduleItem[];
}

export default function MobileServices({ churchName, services, weeklyProgram = [] }: Props) {
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
            <Head title="Horários" />
            <div className="mx-auto w-full max-w-lg space-y-8 pb-6 sm:max-w-xl">
                <header>
                    <Link
                        href={route('mobile.conheca')}
                        className="cursor-pointer text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← Conheça a Nova Semente
                    </Link>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Horários
                    </h1>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {churchName
                            ? `Programação semanal da ${churchName}.`
                            : 'Programação semanal da igreja.'}
                    </p>
                </header>

                <WeeklyProgramSchedule churchName={churchName ?? 'Nova Semente'} items={weeklyProgram} />

                {services.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="px-1 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                            Outros horários
                        </h2>
                        <div className="space-y-3">
                            {sortedDays.map((day) => (
                                <div
                                    key={day}
                                    className="overflow-hidden rounded-[1.35rem] border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{day}</h3>
                                    </div>
                                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {byDay[day].map((s) => (
                                            <li key={s.id} className="flex items-start gap-3 px-4 py-3.5">
                                                <ClockIcon
                                                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400"
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
        </MobileLayout>
    );
}
