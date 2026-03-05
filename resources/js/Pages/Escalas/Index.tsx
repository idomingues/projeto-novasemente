import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, CheckCircleIcon, ClockIcon, XCircleIcon, TrashIcon, UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getMinistryIcon } from '@/lib/ministryIcons';
import { useState, useMemo } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import PageHeader from '@/Components/PageHeader';

export type Assignment = {
    id: number;
    memberId: number;
    memberName: string;
    memberPhotoUrl: string | null;
    roleId: number | null;
    roleName: string | null;
    scheduleDate: string | null;
    saturdayNumber: number | null;
    status: 'pending' | 'confirmed' | 'refused';
    startTime: string | null;
    endTime: string | null;
    checkedInAt: string | null;
};

interface Member { id: number; name: string; }
interface Ministry { id: number; name: string; }

interface Props {
    assignments: Assignment[];
    checkinEnabledDates: string[];
    month: number;
    year: number;
    ministryId: number | null;
    ministries: Ministry[];
    canEdit: boolean;
    members: Member[];
}

function getSaturdays(year: number, month: number): Date[] {
    const out: Date[] = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
        if (d.getDay() === 6) out.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return out;
}

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function EscalasIndex({
    assignments,
    checkinEnabledDates,
    month,
    year,
    ministryId,
    ministries,
    canEdit,
    members,
}: Props) {
    const [localExtraDates, setLocalExtraDates] = useState<string[]>([]);

    const saturdays = useMemo(() => getSaturdays(year, month), [year, month]);

    const selectDepartment = (id: number | '') => {
        const mid = id === '' ? undefined : id;
        router.get(route('escalas.index'), { month, year, ministry_id: mid }, { preserveState: false });
    };

    const apiExtraDates = useMemo(() => {
        const set = new Set<string>();
        assignments.forEach((a) => {
            if (a.saturdayNumber === null && a.scheduleDate) set.add(a.scheduleDate);
        });
        return Array.from(set).sort();
    }, [assignments]);

    const allExtraDates = useMemo(() => {
        return Array.from(new Set([...apiExtraDates, ...localExtraDates])).sort();
    }, [apiExtraDates, localExtraDates]);

    const reload = (m: number, y: number) => {
        router.get(route('escalas.index'), { month: m, year: y, ministry_id: ministryId ?? undefined }, { preserveState: false });
    };

    const prevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) { m = 12; y--; }
        setLocalExtraDates([]);
        reload(m, y);
    };

    const nextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) { m = 1; y++; }
        setLocalExtraDates([]);
        reload(m, y);
    };

    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));

    const isCheckinEnabled = (date: Date) => checkinEnabledDates.includes(formatDateKey(date));

    const handleToggleCheckin = (date: Date, currentlyEnabled: boolean) => {
        router.post(route('escalas.checkin-toggle'), {
            schedule_date: formatDateKey(date),
            enabled: !currentlyEnabled,
        });
    };

    const handleCheckin = (assignmentId: number) => {
        router.post(route('escalas.checkin'), { assignment_id: assignmentId });
    };

    const handleRemove = (assignmentId: number) => {
        if (confirm('Remover esta escala?')) {
            router.delete(route('escalas.destroy', assignmentId));
        }
    };

    const handleAddExtraDate = (dateStr: string) => {
        if (!allExtraDates.includes(dateStr)) setLocalExtraDates((prev) => [...prev, dateStr]);
    };

    return (
        <AdminLayout>
            <Head title="Escalas" />
            <div className="space-y-6">
                <PageHeader title="Escala" />

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                        Selecione o departamento para ver e editar a escala de voluntários
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {ministries.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => selectDepartment(ministryId === m.id ? '' : m.id)}
                                className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all text-left ${
                                    ministryId === m.id
                                        ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800 shadow-inner'
                                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    ministryId === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                }`}>
                                    {(() => {
                                        const Icon = getMinistryIcon(m.name);
                                        return <Icon className="w-6 h-6" />;
                                    })()}
                                </div>
                                <span className={`font-medium text-sm truncate w-full text-center ${
                                    ministryId === m.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
                                }`}>
                                    {m.name}
                                </span>
                            </button>
                        ))}
                    </div>
                    {ministries.length === 0 && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum departamento cadastrado. Cadastre em Departamentos no menu.</p>
                    )}
                </div>

                {!ministryId && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-8 text-center text-zinc-500 dark:text-zinc-400">
                        Nenhum departamento selecionado. Escolha um departamento acima para continuar.
                    </div>
                )}

                {ministryId && (
                <>
                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={prevMonth}
                        className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white capitalize">{monthName}</h2>
                    <button
                        type="button"
                        onClick={nextMonth}
                        className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label="Próximo mês"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-8">
                    {saturdays.map((saturday, idx) => {
                        const saturdayNumber = idx + 1;
                        const dayAssignments = assignments.filter((a) => a.saturdayNumber === saturdayNumber);
                        return (
                            <section key={saturday.toISOString()} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white">{saturdayNumber}º SÁBADO</h3>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCheckin(saturday, isCheckinEnabled(saturday))}
                                            className={`text-sm px-3 py-1.5 rounded-lg border ${
                                                isCheckinEnabled(saturday)
                                                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                            }`}
                                        >
                                            {isCheckinEnabled(saturday) ? 'Check-in aberto' : 'Liberar check-in'}
                                        </button>
                                    )}
                                </div>
                                <EscalaGrid
                                    assignments={dayAssignments}
                                    checkinEnabled={isCheckinEnabled(saturday)}
                                    canEdit={canEdit}
                                    onCheckin={handleCheckin}
                                    onRemove={handleRemove}
                                    onAdd={(memberId, options) => {
                                        router.post(route('escalas.store'), {
                                            ministry_id: ministryId,
                                            member_id: memberId,
                                            schedule_role_id: null,
                                            saturday_number: saturdayNumber,
                                            schedule_date: null,
                                            recurring: options?.recurring ?? true,
                                            assignment_month: options?.assignment_month ?? null,
                                            assignment_year: options?.assignment_year ?? null,
                                            status: 'pending',
                                        });
                                    }}
                                    members={members}
                                    month={month}
                                    year={year}
                                    saturdayNumber={saturdayNumber}
                                />
                            </section>
                        );
                    })}

                    {allExtraDates.map((scheduleDate) => {
                        const date = new Date(scheduleDate + 'T12:00:00');
                        const dayAssignments = assignments.filter(
                            (a) => a.saturdayNumber === null && a.scheduleDate === scheduleDate
                        );
                        const formatted = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
                        return (
                            <section key={scheduleDate} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white">{formatted} — Escala extra</h3>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCheckin(date, isCheckinEnabled(date))}
                                            className={`text-sm px-3 py-1.5 rounded-lg border ${
                                                isCheckinEnabled(date)
                                                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                            }`}
                                        >
                                            {isCheckinEnabled(date) ? 'Check-in aberto' : 'Liberar check-in'}
                                        </button>
                                    )}
                                </div>
                                <EscalaGrid
                                    assignments={dayAssignments}
                                    checkinEnabled={isCheckinEnabled(date)}
                                    canEdit={canEdit}
                                    onCheckin={handleCheckin}
                                    onRemove={handleRemove}
                                    onAdd={(memberId) => {
                                        router.post(route('escalas.store'), {
                                            ministry_id: ministryId,
                                            member_id: memberId,
                                            schedule_role_id: null,
                                            saturday_number: null,
                                            schedule_date: scheduleDate,
                                            status: 'pending',
                                        });
                                    }}
                                    members={members}
                                />
                            </section>
                        );
                    })}

                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v) handleAddExtraDate(v);
                                }}
                            />
                            <span className="text-sm text-zinc-500">Adicionar data extra</span>
                        </div>
                    )}
                </div>
                </>
                )}
            </div>
        </AdminLayout>
    );
}

interface EscalaGridAddOptions {
    recurring?: boolean;
    assignment_month?: number;
    assignment_year?: number;
}

function EscalaGrid({
    assignments,
    checkinEnabled,
    canEdit,
    onCheckin,
    onRemove,
    onAdd,
    members,
    month,
    year,
    saturdayNumber,
}: {
    assignments: Assignment[];
    checkinEnabled: boolean;
    canEdit: boolean;
    onCheckin: (id: number) => void;
    onRemove: (id: number) => void;
    onAdd: (memberId: number, options?: EscalaGridAddOptions) => void;
    members: Member[];
    month?: number;
    year?: number;
    saturdayNumber?: number;
}) {
    const [memberFilter, setMemberFilter] = useState('');
    const [addRecurring, setAddRecurring] = useState(true);
    const existingIds = assignments.map((a) => a.memberId);
    const availableMembers = members.filter((m) => !existingIds.includes(m.id));
    const filteredMembers = useMemo(() => {
        if (!memberFilter.trim()) return availableMembers;
        const q = memberFilter.trim().toLowerCase();
        return availableMembers.filter((m) => m.name.toLowerCase().includes(q));
    }, [availableMembers, memberFilter]);

    const pickMember = (memberId: number) => {
        const options: EscalaGridAddOptions | undefined =
            saturdayNumber != null && month != null && year != null
                ? {
                      recurring: addRecurring,
                      assignment_month: addRecurring ? undefined : month,
                      assignment_year: addRecurring ? undefined : year,
                  }
                : undefined;
        onAdd(memberId, options);
        setMemberFilter('');
    };

    return (
        <div className="flex flex-wrap gap-3">
            {assignments.map((a) => (
                <div
                    key={a.id}
                    className="w-40 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 flex flex-col items-center gap-2"
                >
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {a.memberName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white truncate w-full text-center">{a.memberName}</span>
                    {a.status === 'confirmed' && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Confirmado
                        </span>
                    )}
                    {a.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <ClockIcon className="w-3.5 h-3.5" /> Pendente
                        </span>
                    )}
                    {a.status === 'refused' && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <XCircleIcon className="w-3.5 h-3.5" /> Não pode
                        </span>
                    )}
                    {checkinEnabled && (
                        <div className="mt-1">
                            {a.checkedInAt ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                    <CheckCircleIcon className="w-3.5 h-3.5" /> Presente
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onCheckin(a.id)}
                                    className="text-xs px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                >
                                    Check-in
                                </button>
                            )}
                        </div>
                    )}
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => onRemove(a.id)}
                            className="mt-auto text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                            aria-label="Remover"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}

            {canEdit && (
                <Popover className="relative">
                    <PopoverButton
                        onClick={() => setMemberFilter('')}
                        className="w-40 h-32 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                    >
                        <UserPlusIcon className="w-8 h-8" />
                        <span className="text-sm font-medium">Adicionar</span>
                    </PopoverButton>
                    <PopoverPanel
                        anchor="bottom start"
                        className="z-50 mt-2 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg overflow-hidden"
                    >
                        {({ close }) => (
                            <>
                                {saturdayNumber != null && month != null && year != null && (
                                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={addRecurring}
                                                onChange={(e) => setAddRecurring(e.target.checked)}
                                                className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                            />
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Incluir em todos os meses</span>
                                        </label>
                                        {!addRecurring && (
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Apenas para {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Escolha o voluntário</p>
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            value={memberFilter}
                                            onChange={(e) => setMemberFilter(e.target.value)}
                                            placeholder="Buscar por nome..."
                                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto p-1">
                                    {filteredMembers.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                            {availableMembers.length === 0 ? 'Todos já estão na escala' : 'Nenhum resultado'}
                                        </p>
                                    ) : (
                                        <ul className="space-y-0.5">
                                            {filteredMembers.map((m) => (
                                                <li key={m.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            pickMember(m.id);
                                                            setMemberFilter('');
                                                            close();
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/80 flex items-center gap-2"
                                                    >
                                                        <span className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-600 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                                                            {m.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        {m.name}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </PopoverPanel>
                </Popover>
            )}
        </div>
    );
}
