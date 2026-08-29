import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    XCircleIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import VolunteerAddPopover, {
    scheduleIconButtonClass,
    type ScheduleRoleOption,
    type ScheduleVolunteerOption,
} from '@/Components/Escalas/VolunteerAddPopover';
import CoordinatorSlot, { type CoordinatorFace } from '@/Components/Escalas/CoordinatorAssignPopover';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { getMinistryIcon } from '@/lib/ministryIcons';
import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/Components/PageHeader';
import { confirmAction } from '@/utils/confirmDialog';

const checkinActiveIconClass =
    'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/40';

export type Assignment = {
    id: number;
    memberId: number | null;
    volunteerId: number | null;
    participantKey: string;
    memberName: string;
    memberPhotoUrl: string | null;
    ministryName?: string | null;
    roleId: number | null;
    roleName: string | null;
    scheduleDate: string | null;
    saturdayNumber: number | null;
    /** Série recorrente (todos os meses) — permite remover/alterar só uma data */
    recurringSeries?: boolean;
    status: 'pending' | 'confirmed' | 'refused';
    startTime: string | null;
    endTime: string | null;
    checkedInAt: string | null;
};

export type ScheduleCoordinator = {
    id: number;
    volunteerId: number;
    memberId: number | null;
    memberName: string;
    memberPhotoUrl: string | null;
    hasAppAccount: boolean;
    saturdayNumber: number | null;
    scheduleDate: string | null;
    recurringSeries: boolean;
};

interface Ministry { id: number; name: string; usesSchedule?: boolean; }

interface Props {
    assignments: Assignment[];
    coordinators?: ScheduleCoordinator[];
    checkinEnabledDates: string[];
    month: number;
    year: number;
    ministryId: number | null;
    ministries: Ministry[];
    canEdit: boolean;
    canAssignCoordinator?: boolean;
    editableSaturdayNumbers?: number[];
    editableExtraDates?: string[];
    scheduleVolunteers: ScheduleVolunteerOption[];
    scheduleRoles: ScheduleRoleOption[];
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

export default function EscalasIndex({
    assignments,
    coordinators = [],
    checkinEnabledDates,
    month,
    year,
    ministryId,
    ministries,
    canEdit,
    canAssignCoordinator = false,
    editableSaturdayNumbers = [],
    editableExtraDates = [],
    scheduleVolunteers,
    scheduleRoles,
}: Props) {
    const auth = (usePage().props as { auth?: { user?: { id?: number }; volunteerId?: number | null } }).auth;
    const currentUserId = auth?.user?.id ?? null;
    const [localExtraDates, setLocalExtraDates] = useState<string[]>([]);
    const [roleModalAssignment, setRoleModalAssignment] = useState<Assignment | null>(null);
    const [roleModalRoleId, setRoleModalRoleId] = useState<string>('');
    const [roleScope, setRoleScope] = useState<'occurrence' | 'series'>('series');
    const [newRoleName, setNewRoleName] = useState('');
    const [checkinConfirmDate, setCheckinConfirmDate] = useState<Date | null>(null);
    const [removeModalAssignment, setRemoveModalAssignment] = useState<Assignment | null>(null);
    const [removeCoordinator, setRemoveCoordinator] = useState<CoordinatorFace | null>(null);
    /** Atalho 1º–5º em destaque (verde); atualiza ao clicar e reinicia ao mudar mês/departamento. */
    const [highlightedSaturday, setHighlightedSaturday] = useState(1);

    useEffect(() => {
        if (!roleModalAssignment) {
            setRoleModalRoleId('');
            setRoleScope('series');
            return;
        }
        setRoleModalRoleId(roleModalAssignment.roleId != null ? String(roleModalAssignment.roleId) : '');
        setRoleScope(roleModalAssignment.recurringSeries ? 'occurrence' : 'series');
    }, [roleModalAssignment]);

    const saturdays = useMemo(() => getSaturdays(year, month), [year, month]);

    const todayKey = useMemo(() => formatDateKey(new Date()), []);

    useEffect(() => {
        // Seleciona automaticamente o "sábado corrente" (próximo sábado do mês), quando estamos no mês atual.
        const now = new Date();
        const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
        if (!isCurrentMonth || saturdays.length === 0) {
            setHighlightedSaturday(1);
            return;
        }

        const nextIdx = saturdays.findIndex((d) => formatDateKey(d) >= todayKey);
        setHighlightedSaturday(nextIdx === -1 ? saturdays.length : nextIdx + 1);
    }, [month, year, ministryId, saturdays.length]);

    useEffect(() => {
        // Faz scroll para o sábado selecionado ao abrir/trocar mês/departamento.
        const el = document.getElementById(`escala-sabado-${highlightedSaturday}`);
        if (!el) return;
        const t = window.setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        return () => window.clearTimeout(t);
    }, [highlightedSaturday, month, year, ministryId]);

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

    const timelineEntries = useMemo(() => {
        const saturdayEntries = saturdays.map((d, idx) => ({
            kind: 'saturday' as const,
            date: d,
            dateKey: formatDateKey(d),
            saturdayNumber: idx + 1,
        }));
        const extraEntries = allExtraDates.map((scheduleDate) => ({
            kind: 'extra' as const,
            scheduleDate,
            dateKey: scheduleDate,
        }));
        return [...saturdayEntries, ...extraEntries].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }, [saturdays, allExtraDates]);

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

    const inertiaScrollOpts = { preserveScroll: true };

    const handleToggleCheckin = async (date: Date, currentlyEnabled: boolean) => {
        if (currentlyEnabled) {
            const ok = await confirmAction({
                title: 'Desativar check-in?',
                text: 'O check-in deixará de estar disponível para este dia.',
                confirmButtonText: 'Desativar',
                danger: true,
                icon: 'warning',
            });
            if (ok) {
                router.post(
                    route('escalas.checkin-toggle'),
                    { schedule_date: formatDateKey(date), enabled: false },
                    inertiaScrollOpts,
                );
            }
            return;
        }
        setCheckinConfirmDate(date);
    };

    const confirmEnableCheckin = () => {
        if (!checkinConfirmDate) return;
        router.post(
            route('escalas.checkin-toggle'),
            { schedule_date: formatDateKey(checkinConfirmDate), enabled: true },
            {
                ...inertiaScrollOpts,
                onSuccess: () => setCheckinConfirmDate(null),
            },
        );
    };

    const handleCheckin = (assignmentId: number, scheduleDate: string) => {
        // Nesta tela, check-in é uma ação de gestão (líder/admin). O backend já faz toggle (marcar/desmarcar).
        router.post(
            route('escalas.checkin'),
            { assignment_id: assignmentId, schedule_date: scheduleDate },
            { ...inertiaScrollOpts, preserveState: false },
        );
    };

    const handleRemove = async (a: Assignment) => {
        if (!a.recurringSeries) {
            const ok = await confirmAction({
                title: 'Remover esta escala?',
                text: 'Esta ação não pode ser desfeita.',
                confirmButtonText: 'Remover',
                danger: true,
                icon: 'warning',
            });
            if (ok) {
                router.delete(route('escalas.destroy', a.id), {
                    preserveScroll: true,
                    data: { scope: 'all' },
                });
            }
            return;
        }
        setRemoveModalAssignment(a);
    };

    const confirmRemoveAssignment = (scope: 'single' | 'all') => {
        const a = removeModalAssignment;
        if (!a) return;
        if (scope === 'single' && !a.scheduleDate) return;
        router.delete(route('escalas.destroy', a.id), {
            preserveScroll: true,
            data:
                scope === 'single'
                    ? { scope: 'single', occurrence_date: a.scheduleDate }
                    : { scope: 'all' },
            onSuccess: () => setRemoveModalAssignment(null),
        });
    };

    const coordinatorForSaturday = (saturdayNumber: number): ScheduleCoordinator | null =>
        coordinators.find((c) => c.saturdayNumber === saturdayNumber) ?? null;

    const coordinatorForExtra = (scheduleDate: string): ScheduleCoordinator | null =>
        coordinators.find((c) => c.saturdayNumber === null && c.scheduleDate === scheduleDate) ?? null;

    const canEditSaturdayDay = (saturdayNumber: number, isPast: boolean): boolean =>
        !isPast && (canAssignCoordinator || editableSaturdayNumbers.includes(saturdayNumber));

    const canEditExtraDay = (scheduleDate: string, isPast: boolean): boolean =>
        !isPast && (canAssignCoordinator || editableExtraDates.includes(scheduleDate));

    const postCoordinator = (
        volunteerId: number,
        payload: {
            saturday_number?: number | null;
            schedule_date?: string | null;
            recurring?: boolean;
            assignment_month?: number | null;
            assignment_year?: number | null;
        },
    ) => {
        router.post(
            route('escalas.coordinators.store'),
            {
                ministry_id: ministryId,
                volunteer_id: volunteerId,
                saturday_number: payload.saturday_number ?? null,
                schedule_date: payload.schedule_date ?? null,
                recurring: payload.recurring ?? true,
                assignment_month: payload.assignment_month ?? null,
                assignment_year: payload.assignment_year ?? null,
                view_month: month,
                view_year: year,
            },
            { ...inertiaScrollOpts, preserveState: false },
        );
    };

    const confirmRemoveCoordinator = (scope: 'single' | 'all') => {
        const c = removeCoordinator;
        if (!c) return;
        router.delete(route('escalas.coordinators.destroy', c.id), {
            preserveScroll: true,
            data:
                scope === 'single'
                    ? { scope: 'single', occurrence_date: c.scheduleDate }
                    : { scope: 'all' },
            onSuccess: () => setRemoveCoordinator(null),
        });
    };

    const handleRemoveCoordinator = async (c: CoordinatorFace) => {
        if (!c.recurringSeries) {
            const ok = await confirmAction({
                title: 'Remover coordenador?',
                text: 'Esta ação não pode ser desfeita.',
                confirmButtonText: 'Remover',
                danger: true,
                icon: 'warning',
            });
            if (ok) {
                router.delete(route('escalas.coordinators.destroy', c.id), {
                    preserveScroll: true,
                    data: { scope: 'all' },
                });
            }
            return;
        }
        setRemoveCoordinator(c);
    };

    const handleAddExtraDate = (dateStr: string) => {
        if (!allExtraDates.includes(dateStr)) setLocalExtraDates((prev) => [...prev, dateStr]);
    };

    return (
        <AdminLayout>
            <Head title="Escalas" />
            <div className="space-y-6">
                <PageHeader title="Escala" />

                {ministries.length > 1 && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Selecione o departamento para ver e editar a escala de voluntários
                        </p>
                        <p className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40" aria-hidden />
                                Com pessoas na escala
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50" aria-hidden />
                                Sem pessoas na escala
                            </span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {ministries.map((m) => {
                                const isSelected = ministryId === m.id;
                                const usesSchedule = m.usesSchedule === true;
                                return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => selectDepartment(isSelected ? '' : m.id)}
                                    className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all text-left ${
                                        isSelected
                                            ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800 shadow-inner'
                                            : usesSchedule
                                              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50'
                                              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        isSelected
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                                            : usesSchedule
                                              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}>
                                        {(() => {
                                            const Icon = getMinistryIcon(m.name);
                                            return <Icon className="w-6 h-6" />;
                                        })()}
                                    </div>
                                    <span className={`font-medium text-sm truncate w-full text-center ${
                                        isSelected
                                            ? 'text-zinc-900 dark:text-white'
                                            : usesSchedule
                                              ? 'text-emerald-900 dark:text-emerald-100'
                                              : 'text-zinc-700 dark:text-zinc-300'
                                    }`}>
                                        {m.name}
                                    </span>
                                </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {ministries.length === 0 && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum departamento cadastrado. Cadastre em Departamentos no menu.</p>
                    </div>
                )}

                {!ministryId && ministries.length !== 1 && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-8 text-center text-zinc-500 dark:text-zinc-400">
                        Nenhum departamento selecionado. Escolha um departamento acima para continuar.
                    </div>
                )}

                {ministryId && (
                <>
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-2 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <button
                        type="button"
                        onClick={prevMonth}
                        className="rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h2 className="px-2 text-center text-base font-semibold capitalize text-zinc-900 dark:text-white sm:text-lg">
                        {monthName}
                    </h2>
                    <button
                        type="button"
                        onClick={nextMonth}
                        className="rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        aria-label="Próximo mês"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/40">
                    <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Ir ao sábado
                    </p>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {[1, 2, 3, 4, 5].map((n) => {
                            const exists = n <= saturdays.length;
                            const selected = exists && n === highlightedSaturday;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    disabled={!exists}
                                    title={exists ? `Ir ao ${n}º sábado` : 'Este mês não tem este sábado'}
                                    onClick={() => {
                                        if (!exists) return;
                                        setHighlightedSaturday(n);
                                        document.getElementById(`escala-sabado-${n}`)?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'start',
                                        });
                                    }}
                                    className={`flex min-h-[3.75rem] items-center justify-center rounded-2xl text-xl font-bold tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-[4.5rem] sm:text-2xl md:text-3xl ${
                                        !exists
                                            ? 'cursor-not-allowed border border-zinc-200/80 bg-zinc-100 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600'
                                            : selected
                                              ? 'cursor-pointer border-2 border-brand-700 bg-brand-600 text-white shadow-md hover:border-brand-800 hover:bg-brand-700 focus-visible:ring-brand-500 active:scale-[0.98] dark:border-brand-500 dark:bg-brand-600 dark:hover:border-brand-400 dark:hover:bg-brand-500'
                                              : 'cursor-pointer border-2 border-zinc-200 bg-white text-zinc-900 shadow-sm hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-zinc-400 active:scale-[0.98] dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    {n}º
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-8">
                    {timelineEntries.map((entry) => {
                        if (entry.kind === 'saturday') {
                            const saturday = entry.date;
                            const saturdayNumber = entry.saturdayNumber;
                            const saturdayKey = entry.dateKey;
                            const isPast = saturdayKey < todayKey;
                            const dayAssignments = assignments.filter((a) => a.saturdayNumber === saturdayNumber);
                            const confirmedCount = dayAssignments.filter((a) => a.status === 'confirmed').length;
                            const totalCount = dayAssignments.length;
                            const progressPct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;
                            const checkinOpen = isCheckinEnabled(saturday);
                            const canEditThisDay = canEditSaturdayDay(saturdayNumber, isPast);
                            const canManageDayOps = canAssignCoordinator && !isPast;
                            const dayCoordinator = coordinatorForSaturday(saturdayNumber);
                            const formatted = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
                                saturday,
                            );

                            return (
                                <section
                                    id={`escala-sabado-${saturdayNumber}`}
                                    key={`sat-${saturdayKey}`}
                                    className={`scroll-mt-24 overflow-hidden rounded-xl border p-4 ${
                                        isPast
                                            ? 'border-zinc-200 bg-zinc-50/70 ring-1 ring-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900/60 dark:ring-zinc-900/60'
                                            : checkinOpen
                                              ? 'border-brand-300 bg-white ring-1 ring-brand-400/20 dark:border-brand-700 dark:bg-zinc-900 dark:ring-brand-500/20'
                                              : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                                    }`}
                                >
                                    <div
                                        className={`-m-4 mb-4 flex items-center justify-between gap-2 border-b px-4 py-3 ${
                                            isPast
                                                ? 'border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900'
                                                : checkinOpen
                                                  ? 'border-brand-200 bg-brand-50/70 dark:border-brand-900/40 dark:bg-brand-950/25'
                                                  : 'border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-zinc-900 dark:text-white">
                                                {saturdayNumber}º Sábado - {formatted}
                                            </h3>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-wide ${
                                                    isPast
                                                        ? 'border border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                                                        : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                                }`}
                                            >
                                                Confirmados {confirmedCount}/{totalCount}
                                            </span>
                                            {checkinOpen && (
                                                <span className="inline-flex items-center rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-brand-500">
                                                    Check-in aberto
                                                </span>
                                            )}
                                        </div>
                                        {canEditThisDay && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {canManageDayOps && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCheckin(saturday, checkinOpen)}
                                                    className={`${scheduleIconButtonClass} ${
                                                        checkinOpen ? checkinActiveIconClass : ''
                                                    }`}
                                                    title={checkinOpen ? 'Check-in aberto' : 'Liberar check-in'}
                                                    aria-label={
                                                        checkinOpen
                                                            ? 'Check-in aberto para este dia'
                                                            : 'Liberar check-in para este dia'
                                                    }
                                                >
                                                    {checkinOpen ? (
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    ) : (
                                                        <ClipboardDocumentCheckIcon className="h-5 w-5" />
                                                    )}
                                                </button>
                                                )}
                                                <VolunteerAddPopover
                                                    scheduleVolunteers={scheduleVolunteers}
                                                    existingParticipantKeys={dayAssignments.map((a) => a.participantKey)}
                                                    canEdit={canEditThisDay}
                                                    canAssignCoordinator={canManageDayOps}
                                                    saturdayNumber={saturdayNumber}
                                                    month={month}
                                                    year={year}
                                                    scheduleRoles={scheduleRoles}
                                                    onPick={(volunteerId, options) => {
                                                        router.post(
                                                            route('escalas.store'),
                                                            {
                                                                ministry_id: ministryId,
                                                                volunteer_id: volunteerId,
                                                                schedule_role_id: options?.schedule_role_id ?? null,
                                                                saturday_number: saturdayNumber,
                                                                schedule_date: null,
                                                                recurring: options?.recurring ?? true,
                                                                assignment_month: options?.assignment_month ?? null,
                                                                assignment_year: options?.assignment_year ?? null,
                                                                view_month: month,
                                                                view_year: year,
                                                                status: 'pending',
                                                            },
                                                            {
                                                                ...inertiaScrollOpts,
                                                                preserveState: false,
                                                                onSuccess: () => {
                                                                    if (options?.asCoordinator) {
                                                                        postCoordinator(volunteerId, {
                                                                            saturday_number: saturdayNumber,
                                                                            schedule_date: null,
                                                                            recurring: options?.recurring ?? true,
                                                                            assignment_month: options?.assignment_month ?? null,
                                                                            assignment_year: options?.assignment_year ?? null,
                                                                        });
                                                                    }
                                                                },
                                                            },
                                                        );
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <CoordinatorSlot
                                        coordinator={dayCoordinator}
                                        canAssign={canManageDayOps}
                                        scheduleVolunteers={scheduleVolunteers}
                                        saturdayNumber={saturdayNumber}
                                        month={month}
                                        year={year}
                                        onPick={(volunteerId, options) => {
                                            postCoordinator(volunteerId, {
                                                saturday_number: saturdayNumber,
                                                schedule_date: null,
                                                recurring: options?.recurring ?? true,
                                                assignment_month: options?.assignment_month ?? null,
                                                assignment_year: options?.assignment_year ?? null,
                                            });
                                        }}
                                        onRemove={(c) => void handleRemoveCoordinator(c)}
                                    />
                                    <EscalaGrid
                                        assignments={dayAssignments}
                                        checkinEnabled={checkinOpen}
                                        canEdit={canEditThisDay}
                                        currentUserId={currentUserId}
                                        onCheckin={(id) => handleCheckin(id, saturdayKey)}
                                        onRemove={handleRemove}
                                        onEditRole={(a) => setRoleModalAssignment(a)}
                                    />
                                </section>
                            );
                        }

                        const scheduleDate = entry.scheduleDate;
                        const date = new Date(scheduleDate + 'T12:00:00');
                        const isPast = scheduleDate < todayKey;
                        const dayAssignments = assignments.filter(
                            (a) => a.saturdayNumber === null && a.scheduleDate === scheduleDate,
                        );
                        const confirmedCount = dayAssignments.filter((a) => a.status === 'confirmed').length;
                        const totalCount = dayAssignments.length;
                        const formatted = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
                        const checkinOpen = isCheckinEnabled(date);
                        const canEditThisDay = canEditExtraDay(scheduleDate, isPast);
                        const canManageDayOps = canAssignCoordinator && !isPast;
                        const dayCoordinator = coordinatorForExtra(scheduleDate);

                        return (
                            <section
                                id={`escala-extra-${scheduleDate}`}
                                key={`extra-${scheduleDate}`}
                                className={`scroll-mt-24 overflow-hidden rounded-xl border p-4 ${
                                    isPast
                                        ? 'border-zinc-200 bg-zinc-50/70 ring-1 ring-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900/60 dark:ring-zinc-900/60'
                                        : checkinOpen
                                          ? 'border-brand-300 bg-white ring-1 ring-brand-400/20 dark:border-brand-700 dark:bg-zinc-900 dark:ring-brand-500/20'
                                          : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                                }`}
                            >
                                <div
                                    className={`-m-4 mb-6 flex items-center justify-between gap-2 border-b px-4 py-3 ${
                                        isPast
                                            ? 'border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900'
                                            : checkinOpen
                                              ? 'border-brand-200 bg-brand-50/70 dark:border-brand-900/40 dark:bg-brand-950/25'
                                              : 'border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white">Escala extra - {formatted}</h3>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-wide ${
                                                isPast
                                                    ? 'border border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                                                    : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                            }`}
                                        >
                                            Confirmados {confirmedCount}/{totalCount}
                                        </span>
                                        {checkinOpen && (
                                            <span className="inline-flex items-center rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-brand-500">
                                                Check-in aberto
                                            </span>
                                        )}
                                    </div>
                                    {canEditThisDay && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {canManageDayOps && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCheckin(date, checkinOpen)}
                                                className={`${scheduleIconButtonClass} ${
                                                    checkinOpen ? checkinActiveIconClass : ''
                                                }`}
                                                title={checkinOpen ? 'Check-in aberto' : 'Liberar check-in'}
                                                aria-label={
                                                    checkinOpen
                                                        ? 'Check-in aberto para este dia'
                                                        : 'Liberar check-in para este dia'
                                                }
                                            >
                                                {checkinOpen ? (
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                ) : (
                                                    <ClipboardDocumentCheckIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                            )}
                                            <VolunteerAddPopover
                                                scheduleVolunteers={scheduleVolunteers}
                                                existingParticipantKeys={dayAssignments.map((a) => a.participantKey)}
                                                canEdit={canEditThisDay}
                                                canAssignCoordinator={canManageDayOps}
                                                scheduleRoles={scheduleRoles}
                                                onPick={(volunteerId, options) => {
                                                    router.post(
                                                        route('escalas.store'),
                                                        {
                                                            ministry_id: ministryId,
                                                            volunteer_id: volunteerId,
                                                            schedule_role_id: options?.schedule_role_id ?? null,
                                                            saturday_number: null,
                                                            schedule_date: scheduleDate,
                                                            view_month: month,
                                                            view_year: year,
                                                            status: 'pending',
                                                        },
                                                        {
                                                            ...inertiaScrollOpts,
                                                            preserveState: false,
                                                            onSuccess: () => {
                                                                if (options?.asCoordinator) {
                                                                    postCoordinator(volunteerId, {
                                                                        saturday_number: null,
                                                                        schedule_date: scheduleDate,
                                                                        recurring: false,
                                                                    });
                                                                }
                                                            },
                                                        },
                                                    );
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <CoordinatorSlot
                                    coordinator={dayCoordinator}
                                    canAssign={canManageDayOps}
                                    scheduleVolunteers={scheduleVolunteers}
                                    emptyLabel="Definir coordenador desta data"
                                    onPick={(volunteerId) => {
                                        postCoordinator(volunteerId, {
                                            saturday_number: null,
                                            schedule_date: scheduleDate,
                                            recurring: false,
                                        });
                                    }}
                                    onRemove={(c) => void handleRemoveCoordinator(c)}
                                />
                                <EscalaGrid
                                    assignments={dayAssignments}
                                    checkinEnabled={checkinOpen}
                                    canEdit={canEditThisDay}
                                    currentUserId={currentUserId}
                                    onCheckin={(id) => handleCheckin(id, scheduleDate)}
                                    onRemove={handleRemove}
                                    onEditRole={(a) => setRoleModalAssignment(a)}
                                />
                            </section>
                        );
                    })}

                    {canAssignCoordinator && (
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

                    {ministryId && canAssignCoordinator && (
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/50 p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Funções na escala</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Funções gerais do sistema e funções criadas só para este departamento. Cadastre abaixo as
                                    específicas do ministério (ex.: Som, Recepção).
                                </p>
                            </div>
                            {scheduleRoles.some((r) => r.ministryId == null) && (
                                <div>
                                    <p className="text-xs font-medium text-zinc-500 mb-1.5">Gerais</p>
                                    <ul className="flex flex-wrap gap-2">
                                        {scheduleRoles
                                            .filter((r) => r.ministryId == null)
                                            .map((r) => (
                                                <li
                                                    key={r.id}
                                                    className="text-xs px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                                                >
                                                    {r.name}
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-1.5">Deste departamento</p>
                                {scheduleRoles.filter((r) => r.ministryId === ministryId).length === 0 ? (
                                    <p className="text-sm text-zinc-400">Nenhuma função específica ainda.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {scheduleRoles
                                            .filter((r) => r.ministryId === ministryId)
                                            .map((r) => (
                                                <li
                                                    key={r.id}
                                                    className="flex items-center justify-between gap-2 text-sm text-zinc-800 dark:text-zinc-200"
                                                >
                                                    <span>{r.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void (async () => {
                                                                const ok = await confirmAction({
                                                                    title: 'Remover função?',
                                                                    text: 'Esta função deixará de estar disponível para escalas deste departamento.',
                                                                    confirmButtonText: 'Remover',
                                                                    danger: true,
                                                                    icon: 'warning',
                                                                });
                                                                if (ok) {
                                                                    router.delete(route('escalas.roles.destroy', r.id), inertiaScrollOpts);
                                                                }
                                                            })();
                                                        }}
                                                        className="p-1.5 shrink-0 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                        title="Remover"
                                                        aria-label="Remover função"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                            <form
                                className="flex flex-col sm:flex-row sm:items-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const name = newRoleName.trim();
                                    if (!name || !ministryId) return;
                                    router.post(
                                        route('escalas.roles.store'),
                                        { ministry_id: ministryId, name },
                                        {
                                            ...inertiaScrollOpts,
                                            onSuccess: () => setNewRoleName(''),
                                        },
                                    );
                                }}
                            >
                                <div className="flex-1 min-w-0">
                                    <InputLabel htmlFor="nova_funcao_escala" value="Nova função (este departamento)" />
                                    <TextInput
                                        id="nova_funcao_escala"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="Ex.: Projeção"
                                    />
                                </div>
                                <PrimaryButton type="submit" className="shrink-0">
                                    Adicionar
                                </PrimaryButton>
                            </form>
                        </div>
                    )}

                    <Link
                        href={route('mobile.schedule', { month, year })}
                        className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-center text-sm font-extrabold uppercase tracking-wider text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                    >
                        Voltar para Minha Escala
                    </Link>
                </div>
                </>
                )}
            </div>

            <Modal
                show={roleModalAssignment !== null}
                onClose={() => setRoleModalAssignment(null)}
                maxWidth="lg"
                footer={
                    roleModalAssignment ? (
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <SecondaryButton type="button" onClick={() => setRoleModalAssignment(null)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                type="button"
                                onClick={() => {
                                    const rid = roleModalRoleId === '' ? null : Number.parseInt(roleModalRoleId, 10);
                                    const payload: Record<string, string | number | null> = {
                                        schedule_role_id: rid !== null && !Number.isNaN(rid) ? rid : null,
                                    };
                                    if (roleModalAssignment.recurringSeries) {
                                        payload.scope = roleScope;
                                        if (roleScope === 'occurrence' && roleModalAssignment.scheduleDate) {
                                            payload.occurrence_date = roleModalAssignment.scheduleDate;
                                        }
                                    }
                                    router.patch(
                                        route('escalas.update', roleModalAssignment.id),
                                        payload,
                                        {
                                            ...inertiaScrollOpts,
                                            onSuccess: () => setRoleModalAssignment(null),
                                        },
                                    );
                                }}
                            >
                                Salvar
                            </PrimaryButton>
                        </div>
                    ) : null
                }
            >
                {roleModalAssignment && (
                    <div className="p-6 sm:p-8">
                        <header className="pb-6 mb-6 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                                Função na escala
                            </h3>
                            <p className="mt-2 text-base text-zinc-600 dark:text-zinc-300 font-medium">
                                {roleModalAssignment.memberName}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Escolha a função e, se for recorrente, defina se a alteração vale só para este dia ou para toda a série.
                            </p>
                        </header>

                        <div className="space-y-6">
                            {canAssignCoordinator && roleModalAssignment.volunteerId != null && (
                                coordinators.some(
                                    (c) =>
                                        c.volunteerId === roleModalAssignment.volunteerId
                                        && (
                                            (roleModalAssignment.saturdayNumber != null
                                                && c.saturdayNumber === roleModalAssignment.saturdayNumber)
                                            || (roleModalAssignment.saturdayNumber == null
                                                && c.scheduleDate === roleModalAssignment.scheduleDate)
                                        ),
                                ) ? (
                                    <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200/90 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-zinc-700">
                                        Esta pessoa já é o coordenador deste sábado.
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const a = roleModalAssignment;
                                            if (a.volunteerId == null) return;
                                            postCoordinator(a.volunteerId, {
                                                saturday_number: a.saturdayNumber,
                                                schedule_date: a.saturdayNumber == null ? a.scheduleDate : null,
                                                recurring: a.recurringSeries ?? a.saturdayNumber != null,
                                                assignment_month: a.recurringSeries ? null : month,
                                                assignment_year: a.recurringSeries ? null : year,
                                            });
                                            setRoleModalAssignment(null);
                                        }}
                                        className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm ring-1 ring-zinc-200/80 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-zinc-900 dark:text-white">
                                                Definir como coordenador deste sábado
                                            </span>
                                            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                                Passa a organizar a equipe neste dia, sem sair da escala.
                                            </span>
                                        </span>
                                    </button>
                                )
                            )}
                            {canEdit && roleModalAssignment.scheduleDate && (
                                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        Check-in
                                    </p>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                {roleModalAssignment.checkedInAt ? 'Presença confirmada' : 'Presença não registrada'}
                                            </p>
                                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                {new Date(roleModalAssignment.scheduleDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        {checkinEnabledDates.includes(roleModalAssignment.scheduleDate) ? (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!roleModalAssignment?.scheduleDate) return;
                                                    const ok = await confirmAction({
                                                        title: roleModalAssignment.checkedInAt ? 'Desfazer check-in?' : 'Fazer check-in?',
                                                        text: roleModalAssignment.checkedInAt
                                                            ? 'Isso desmarcará a presença desta pessoa.'
                                                            : 'Isso marcará a presença desta pessoa.',
                                                        confirmButtonText: roleModalAssignment.checkedInAt ? 'Desfazer' : 'Confirmar',
                                                        danger: !!roleModalAssignment.checkedInAt,
                                                        icon: roleModalAssignment.checkedInAt ? 'warning' : 'question',
                                                    });
                                                    if (!ok) return;
                                                    handleCheckin(roleModalAssignment.id, roleModalAssignment.scheduleDate);
                                                }}
                                                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                                    roleModalAssignment.checkedInAt
                                                        ? 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600'
                                                        : 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500'
                                                }`}
                                                title={roleModalAssignment.checkedInAt ? 'Desfazer check-in' : 'Fazer check-in'}
                                            >
                                                {roleModalAssignment.checkedInAt ? 'Desfazer' : 'Check-in'}
                                            </button>
                                        ) : canAssignCoordinator ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!roleModalAssignment?.scheduleDate) return;
                                                    const d = new Date(roleModalAssignment.scheduleDate + 'T12:00:00');
                                                    handleToggleCheckin(d, false);
                                                }}
                                                className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                                title="Liberar check-in para esta data"
                                            >
                                                Check-in
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                            <div>
                                <InputLabel htmlFor="modal_schedule_role" value="Função" />
                                <select
                                    id="modal_schedule_role"
                                    value={roleModalRoleId}
                                    onChange={(e) => setRoleModalRoleId(e.target.value)}
                                    className="mt-2 block w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20"
                                >
                                    <option value="">Sem função</option>
                                    {scheduleRoles.map((r) => (
                                        <option key={r.id} value={String(r.id)}>
                                            {r.name}
                                            {r.ministryId == null ? ' (geral)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {roleModalAssignment.recurringSeries && (
                                <fieldset className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40 p-5 space-y-4">
                                    <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 px-1">
                                        Aplicar alteração
                                    </legend>
                                    <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-200 cursor-pointer rounded-xl p-3 -m-1 hover:bg-white/60 dark:hover:bg-zinc-900/40 transition-colors">
                                        <input
                                            type="radio"
                                            name="role_scope"
                                            className="mt-0.5 h-4 w-4 shrink-0 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-white"
                                            checked={roleScope === 'occurrence'}
                                            onChange={() => setRoleScope('occurrence')}
                                        />
                                        <span className="leading-snug">
                                            <span className="font-medium text-zinc-900 dark:text-white">
                                                Apenas esta data
                                            </span>
                                            <span className="block text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                {roleModalAssignment.scheduleDate
                                                    ? new Date(
                                                          roleModalAssignment.scheduleDate + 'T12:00:00',
                                                      ).toLocaleDateString('pt-BR', {
                                                          weekday: 'long',
                                                          day: '2-digit',
                                                          month: 'long',
                                                          year: 'numeric',
                                                      })
                                                    : '—'}
                                            </span>
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-200 cursor-pointer rounded-xl p-3 -m-1 hover:bg-white/60 dark:hover:bg-zinc-900/40 transition-colors">
                                        <input
                                            type="radio"
                                            name="role_scope"
                                            className="mt-0.5 h-4 w-4 shrink-0 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-white"
                                            checked={roleScope === 'series'}
                                            onChange={() => setRoleScope('series')}
                                        />
                                        <span className="leading-snug">
                                            <span className="font-medium text-zinc-900 dark:text-white">
                                                Toda a escala (recorrente)
                                            </span>
                                            <span className="block text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                Altera o modelo da série para os meses seguintes.
                                            </span>
                                        </span>
                                    </label>
                                </fieldset>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                show={checkinConfirmDate !== null}
                onClose={() => setCheckinConfirmDate(null)}
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setCheckinConfirmDate(null)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="button" onClick={confirmEnableCheckin}>
                            Liberar e notificar
                        </PrimaryButton>
                    </div>
                }
            >
                <div className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Liberar check-in</h3>
                    <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
                        <p>
                            Ao confirmar, o check-in ficará disponível para este dia. Todos os voluntários escalados para
                            esta data receberão uma notificação na app (se tiverem conta) e um e-mail no endereço do
                            membro, quando existir.
                        </p>
                        <p>
                            Ao abrir a notificação ou o link do e-mail, abrir-se-á a página para registar a presença
                            (check-in).
                        </p>
                    </div>
                </div>
            </Modal>

            <Modal
                show={removeModalAssignment !== null}
                onClose={() => setRemoveModalAssignment(null)}
                maxWidth="md"
                footer={
                    removeModalAssignment ? (
                        <div className="flex flex-col-reverse gap-2 justify-end sm:flex-row">
                            <SecondaryButton type="button" onClick={() => setRemoveModalAssignment(null)}>
                                Cancelar
                            </SecondaryButton>
                            <SecondaryButton type="button" onClick={() => confirmRemoveAssignment('single')}>
                                Só esta data
                            </SecondaryButton>
                            <PrimaryButton type="button" onClick={() => confirmRemoveAssignment('all')}>
                                Toda a série
                            </PrimaryButton>
                        </div>
                    ) : null
                }
            >
                {removeModalAssignment && (
                    <div className="p-4 sm:p-6">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Remover da escala</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{removeModalAssignment.memberName}</p>
                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                            Esta linha repete em todos os meses. Pode remover só{' '}
                            {removeModalAssignment.scheduleDate
                                ? new Date(removeModalAssignment.scheduleDate + 'T12:00:00').toLocaleDateString('pt-BR')
                                : 'esta data'}{' '}
                            ou excluir toda a série.
                        </p>
                    </div>
                )}
            </Modal>

            <Modal
                show={removeCoordinator !== null}
                onClose={() => setRemoveCoordinator(null)}
                maxWidth="md"
                footer={
                    removeCoordinator ? (
                        <div className="flex flex-col-reverse gap-2 justify-end sm:flex-row">
                            <SecondaryButton type="button" onClick={() => setRemoveCoordinator(null)}>
                                Cancelar
                            </SecondaryButton>
                            <SecondaryButton type="button" onClick={() => confirmRemoveCoordinator('single')}>
                                Só esta data
                            </SecondaryButton>
                            <PrimaryButton type="button" onClick={() => confirmRemoveCoordinator('all')}>
                                Toda a série
                            </PrimaryButton>
                        </div>
                    ) : null
                }
            >
                {removeCoordinator && (
                    <div className="p-4 sm:p-6">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Remover coordenador</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{removeCoordinator.memberName}</p>
                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                            Este coordenador se repete em todos os meses. Pode remover só{' '}
                            {removeCoordinator.scheduleDate
                                ? new Date(removeCoordinator.scheduleDate + 'T12:00:00').toLocaleDateString('pt-BR')
                                : 'esta data'}{' '}
                            ou excluir toda a série.
                        </p>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}

function EscalaGrid({
    assignments,
    checkinEnabled,
    canEdit,
    currentUserId,
    onCheckin,
    onRemove,
    onEditRole,
}: {
    assignments: Assignment[];
    checkinEnabled: boolean;
    canEdit: boolean;
    currentUserId: number | null;
    onCheckin: (id: number) => void;
    onRemove: (a: Assignment) => void;
    onEditRole: (a: Assignment) => void;
}) {
    return (
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
            {assignments.map((a) => {
                const isSelf = currentUserId != null && a.memberId != null && a.memberId === currentUserId;
                return (
                    <div
                    key={a.id}
                    role={canEdit ? 'button' : undefined}
                    tabIndex={canEdit ? 0 : undefined}
                    onClick={canEdit ? () => onEditRole(a) : undefined}
                    onKeyDown={
                        canEdit
                            ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      onEditRole(a);
                                  }
                              }
                            : undefined
                    }
                    className={`flex w-full flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50 sm:w-40 ${
                        a.status === 'pending' ? 'border-l-4 border-l-amber-400 pl-2.5' : ''
                    } ${canEdit ? 'cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-100/80 dark:hover:bg-zinc-800' : ''}`}
                >
                    {a.memberPhotoUrl ? (
                        <img
                            src={a.memberPhotoUrl}
                            alt=""
                            className="w-14 h-14 rounded-full object-cover border border-zinc-200 dark:border-zinc-600"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                            {a.memberName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-medium text-zinc-900 dark:text-white truncate w-full text-center">
                        {a.memberName}
                    </span>
                    {a.roleName ? (
                        <span className="text-xs font-medium text-brand-800 dark:text-brand-200 bg-brand-100 dark:bg-brand-900/40 px-2 py-0.5 rounded-md text-center max-w-full truncate">
                            {a.roleName}
                        </span>
                    ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Sem função</span>
                    )}
                    {a.checkedInAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 whitespace-nowrap dark:bg-green-950/30 dark:text-green-200 dark:ring-green-900/50">
                            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" /> Presente
                        </span>
                    ) : a.status === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Confirmado
                        </span>
                    ) : a.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <ClockIcon className="w-3.5 h-3.5" /> Pendente
                        </span>
                    ) : a.status === 'refused' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <XCircleIcon className="w-3.5 h-3.5" /> Não pode
                        </span>
                    ) : null}
                    {((checkinEnabled && (canEdit || isSelf || a.checkedInAt)) || canEdit) && (
                        <div
                            className={`mt-auto flex w-full flex-row flex-wrap items-center gap-2 pt-1 ${
                                !checkinEnabled && canEdit ? 'justify-center' : 'justify-between'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {checkinEnabled && (
                                <div className="flex min-w-0 flex-1 items-center justify-center">
                                    {!a.checkedInAt && (canEdit || isSelf) ? (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const ok = await confirmAction({
                                                    title: 'Fazer check-in?',
                                                    text: 'Confirme para marcar a presença desta pessoa.',
                                                    confirmButtonText: 'Confirmar',
                                                    icon: 'question',
                                                });
                                                if (!ok) return;
                                                onCheckin(a.id);
                                            }}
                                            className="text-xs px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                        >
                                            Check-in
                                        </button>
                                    ) : null}
                                </div>
                            )}
                            {checkinEnabled && (canEdit || isSelf) && a.checkedInAt && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const ok = await confirmAction({
                                            title: 'Desfazer check-in?',
                                            text: 'Confirme para desmarcar a presença desta pessoa.',
                                            confirmButtonText: 'Desfazer',
                                            danger: true,
                                            icon: 'warning',
                                        });
                                        if (!ok) return;
                                        onCheckin(a.id);
                                    }}
                                    className="text-xs px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                    aria-label="Desfazer check-in"
                                >
                                    Desfazer
                                </button>
                            )}
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(a);
                                    }}
                                    className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-200/80 hover:text-red-600 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                                    aria-label="Remover"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                );
            })}
        </div>
    );
}
