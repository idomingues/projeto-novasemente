import AdminLayout from '@/Layouts/AdminLayout';
import ScheduleLoginGate from '@/Components/ScheduleLoginGate';
import { Head, router } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getMinistryIcon } from '@/lib/ministryIcons';
import { useMemo } from 'react';

interface Assignment {
    id: number;
    memberName: string;
    memberPhotoUrl: string | null;
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
    canViewSchedule?: boolean;
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

function AssignmentRow({ a }: { a: Assignment }) {
    return (
        <li className="px-4 py-3 flex gap-4 items-center border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
            {a.memberPhotoUrl ? (
                <img
                    src={a.memberPhotoUrl}
                    alt=""
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-zinc-200 dark:border-zinc-700"
                />
            ) : (
                <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xl font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                    {a.memberName.charAt(0).toUpperCase()}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900 dark:text-white leading-snug">{a.memberName}</p>
                {a.roleName ? (
                    <p className="text-sm text-brand-700 dark:text-brand-300 mt-0.5 font-medium">{a.roleName}</p>
                ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Sem função definida</p>
                )}
            </div>
        </li>
    );
}

export default function VariosSchedule({
    assignments,
    month,
    year,
    ministryId,
    ministries,
    canViewSchedule = true,
}: Props) {
    const saturdays = useMemo(() => getSaturdays(year, month), [year, month]);

    const extraDateGroups = useMemo(() => {
        const map = new Map<string, Assignment[]>();
        for (const a of assignments) {
            if (a.saturdayNumber != null) continue;
            if (!a.scheduleDate) continue;
            const list = map.get(a.scheduleDate) ?? [];
            list.push(a);
            map.set(a.scheduleDate, list);
        }
        return Array.from(map.entries()).sort(([d1], [d2]) => d1.localeCompare(d2));
    }, [assignments]);

    const selectMinistry = (id: number | '') => {
        router.get(route('varios.schedule'), {
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
        router.get(route('varios.schedule'), { month: m, year: y, ministry_id: ministryId ?? undefined });
    };

    const nextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        router.get(route('varios.schedule'), { month: m, year: y, ministry_id: ministryId ?? undefined });
    };

    return (
        <AdminLayout>
            <Head title="Escala" />
            <div className="space-y-4 sm:space-y-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Escala</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {canViewSchedule
                            ? 'Selecione o departamento para ver a escala do mês.'
                            : 'A escala de voluntários está disponível apenas para usuários cadastrados. Faça login para consultar.'}
                    </p>
                </div>

                {!canViewSchedule && <ScheduleLoginGate />}

                {canViewSchedule && (
                <>
                <div className="flex flex-wrap gap-2">
                    {ministries.map((m) => {
                        const Icon = getMinistryIcon(m.name);
                        const isSelected = ministryId === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => selectMinistry(isSelected ? '' : m.id)}
                                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 min-w-[80px] transition-colors ${
                                    isSelected
                                        ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800'
                                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600'
                                }`}
                            >
                                <Icon
                                    className={`w-6 h-6 ${
                                        isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
                                    }`}
                                />
                                <span
                                    className={`text-xs font-medium truncate w-full text-center ${
                                        isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'
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
                                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
                                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
                                        <ul className="divide-y-0">
                                            {dayAssignments.length === 0 ? (
                                                <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                                                    Nenhum voluntário escalado
                                                </li>
                                            ) : (
                                                dayAssignments.map((a) => <AssignmentRow key={a.id} a={a} />)
                                            )}
                                        </ul>
                                    </section>
                                );
                            })}

                            {extraDateGroups.map(([scheduleDate, items]) => {
                                const label = new Date(scheduleDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                });
                                return (
                                    <section
                                        key={scheduleDate}
                                        className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden scroll-mt-20"
                                    >
                                        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                            <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">
                                                Escala extra · {label}
                                            </h2>
                                        </div>
                                        <ul>{items.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
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
                </>
                )}
            </div>
        </AdminLayout>
    );
}
