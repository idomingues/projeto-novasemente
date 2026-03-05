import MobileLayout from '@/Layouts/MobileLayout';
import { Head, router } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getMinistryIcon } from '@/lib/ministryIcons';
import { useMemo } from 'react';

interface Assignment {
    id: number;
    memberName: string;
    roleName: string | null;
    scheduleDate: string | null;
    saturdayNumber: number | null;
}

interface Ministry {
    id: number;
    name: string;
}

interface Props {
    assignments: Assignment[];
    checkinEnabledDates: string[];
    month: number;
    year: number;
    ministryId: number | null;
    ministries: Ministry[];
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getSaturdays(year: number, month: number): Date[] {
    const out: Date[] = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
        if (d.getDay() === 6) out.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return out;
}

export default function MobileSchedule({
    assignments,
    month,
    year,
    ministryId,
    ministries,
}: Props) {
    const saturdays = useMemo(() => getSaturdays(year, month), [year, month]);

    const selectMinistry = (id: number | '') => {
        router.get(route('mobile.schedule'), {
            month,
            year,
            ministry_id: id === '' ? undefined : id,
        });
    };

    const prevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) {
            m = 12;
            y -= 1;
        }
        router.get(route('mobile.schedule'), { month: m, year: y, ministry_id: ministryId ?? undefined });
    };

    const nextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        router.get(route('mobile.schedule'), { month: m, year: y, ministry_id: ministryId ?? undefined });
    };

    return (
        <MobileLayout>
            <Head title="Escala" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Escala</h1>

                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Selecione o departamento para ver a escala do mês.
                </p>

                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1">
                    {ministries.map((m) => {
                        const Icon = getMinistryIcon(m.name);
                        const isSelected = ministryId === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => selectMinistry(isSelected ? '' : m.id)}
                                className={`flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 min-w-[80px] ${
                                    isSelected
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                                }`}
                            >
                                <Icon
                                    className={`w-6 h-6 ${
                                        isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-500 dark:text-zinc-400'
                                    }`}
                                />
                                <span
                                    className={`text-xs font-medium truncate w-full text-center ${
                                        isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400'
                                    }`}
                                >
                                    {m.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {ministries.length === 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4">
                        Nenhum departamento cadastrado.
                    </p>
                )}

                {ministryId && (
                    <>
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                                aria-label="Mês anterior"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="font-semibold text-zinc-900 dark:text-white capitalize">
                                {MONTH_NAMES[month - 1]} {year}
                            </span>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                                aria-label="Próximo mês"
                            >
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {saturdays.map((sat, idx) => {
                                const saturdayNumber = idx + 1;
                                const dayAssignments = assignments.filter(
                                    (a) => a.saturdayNumber === saturdayNumber
                                );
                                const dateStr = sat.toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                });
                                return (
                                    <section
                                        key={sat.toISOString()}
                                        className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                                    >
                                        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                            <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">
                                                {saturdayNumber}º sábado · {dateStr}
                                            </h2>
                                        </div>
                                        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                            {dayAssignments.length === 0 ? (
                                                <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                                    Nenhum voluntário escalado
                                                </li>
                                            ) : (
                                                dayAssignments.map((a) => (
                                                    <li
                                                        key={a.id}
                                                        className="px-4 py-3 flex justify-between items-center"
                                                    >
                                                        <span className="font-medium text-zinc-900 dark:text-white">
                                                            {a.memberName}
                                                        </span>
                                                        {a.roleName && (
                                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                                                {a.roleName}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </section>
                                );
                            })}
                        </div>
                    </>
                )}

                {!ministryId && ministries.length > 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
                        Selecione um departamento acima para ver a escala.
                    </p>
                )}
            </div>
        </MobileLayout>
    );
}
