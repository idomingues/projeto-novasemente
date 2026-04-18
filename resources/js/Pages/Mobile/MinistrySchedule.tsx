import MobileLayout from '@/Layouts/MobileLayout';
import VolunteerAddPopover, {
    scheduleIconButtonClass,
    type ScheduleRoleOption,
    type ScheduleVolunteerOption,
} from '@/Components/Escalas/VolunteerAddPopover';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CheckCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { getMinistryIcon } from '@/lib/ministryIcons';
import { confirmAction } from '@/utils/confirmDialog';
import { useEffect, useMemo, useState } from 'react';

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
    recurringSeries?: boolean;
    status: 'pending' | 'confirmed' | 'refused';
    startTime: string | null;
    endTime: string | null;
    checkedInAt: string | null;
};

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
    canEdit: boolean;
    scheduleVolunteers: ScheduleVolunteerOption[];
    scheduleRoles: ScheduleRoleOption[];
}

const checkinActiveIconClass =
    'border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-100 dark:hover:bg-brand-900/50';

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

function monthTitle(year: number, month: number): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export default function MinistrySchedule({
    assignments,
    checkinEnabledDates,
    month,
    year,
    ministryId,
    ministries,
    canEdit,
    scheduleVolunteers,
    scheduleRoles,
}: Props) {
    const page = usePage();
    const currentChurch = (page.props as { currentChurch?: { name?: string; logo_url?: string | null } | null })
        .currentChurch;
    const authUser = (page.props as { auth?: { user?: { name?: string } } }).auth?.user;

    const saturdays = useMemo(() => getSaturdays(year, month), [year, month]);
    const [activeSaturday, setActiveSaturday] = useState(1);
    const [roleModalAssignment, setRoleModalAssignment] = useState<Assignment | null>(null);
    const [roleModalRoleId, setRoleModalRoleId] = useState('');
    const [roleScope, setRoleScope] = useState<'occurrence' | 'series'>('series');
    const [checkinConfirmDate, setCheckinConfirmDate] = useState<Date | null>(null);
    const [removeModalAssignment, setRemoveModalAssignment] = useState<Assignment | null>(null);

    useEffect(() => {
        if (activeSaturday > saturdays.length) {
            setActiveSaturday(saturdays.length > 0 ? saturdays.length : 1);
        }
    }, [saturdays.length, activeSaturday]);

    useEffect(() => {
        if (!roleModalAssignment) {
            setRoleModalRoleId('');
            setRoleScope('series');
            return;
        }
        setRoleModalRoleId(roleModalAssignment.roleId != null ? String(roleModalAssignment.roleId) : '');
        setRoleScope(roleModalAssignment.recurringSeries ? 'occurrence' : 'series');
    }, [roleModalAssignment]);

    const inertiaScrollOpts = { preserveScroll: true };

    const selectMinistry = (id: number | '') => {
        router.get(
            route('mobile.schedule'),
            { month, year, ministry_id: id === '' ? undefined : id },
            { preserveState: false },
        );
    };

    const reloadMonth = (m: number, y: number) => {
        router.get(route('mobile.schedule'), { month: m, year: y, ministry_id: ministryId ?? undefined }, { preserveState: false });
    };

    const prevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) {
            m = 12;
            y--;
        }
        reloadMonth(m, y);
    };

    const nextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y++;
        }
        reloadMonth(m, y);
    };

    const selectedSaturdayDate = saturdays[activeSaturday - 1] ?? null;
    const dayAssignments = useMemo(
        () => assignments.filter((a) => a.saturdayNumber === activeSaturday),
        [assignments, activeSaturday],
    );

    const confirmedCount = dayAssignments.filter((a) => a.status === 'confirmed').length;
    const totalCount = dayAssignments.length;
    const progressPct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

    const isCheckinEnabled = (date: Date) => checkinEnabledDates.includes(formatDateKey(date));

    const handleToggleCheckin = async (date: Date, currentlyEnabled: boolean) => {
        if (!canEdit) return;
        if (currentlyEnabled) {
            const ok = await confirmAction({
                title: 'Desativar check-in?',
                text: 'O check-in deixará de estar disponível para este dia.',
                confirmButtonText: 'Desativar',
                danger: true,
                icon: 'warning',
            });
            if (ok) {
                router.post(route('escalas.checkin-toggle'), { schedule_date: formatDateKey(date), enabled: false }, inertiaScrollOpts);
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
            { ...inertiaScrollOpts, onSuccess: () => setCheckinConfirmDate(null) },
        );
    };

    const handleCheckin = (assignmentId: number) => {
        router.post(route('escalas.checkin'), { assignment_id: assignmentId }, inertiaScrollOpts);
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
                router.delete(route('escalas.destroy', a.id), { preserveScroll: true, data: { scope: 'all' } });
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
                scope === 'single' ? { scope: 'single', occurrence_date: a.scheduleDate } : { scope: 'all' },
            onSuccess: () => setRemoveModalAssignment(null),
        });
    };

    const churchName = currentChurch?.name ?? 'Nova Semente';
    const userInitial = (authUser?.name ?? '?').trim().charAt(0).toUpperCase() || '?';

    return (
        <MobileLayout>
            <Head title="Escala" />

            <div className="max-w-lg mx-auto w-full space-y-4 pb-4">
                <header className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <img
                            src={currentChurch?.logo_url ?? '/logo-ns.png'}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-brand-600/20"
                        />
                        <span className="truncate font-semibold text-zinc-900 dark:text-white">{churchName}</span>
                    </div>
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
                        aria-hidden
                    >
                        {userInitial}
                    </div>
                </header>

                {ministries.length > 1 && (
                    <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                        {ministries.map((m) => {
                            const Icon = getMinistryIcon(m.name);
                            const sel = ministryId === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => selectMinistry(sel ? '' : m.id)}
                                    className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2 ${
                                        sel
                                            ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40'
                                            : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                                    }`}
                                >
                                    <Icon className={`h-5 w-5 ${sel ? 'text-brand-700 dark:text-brand-300' : 'text-zinc-500'}`} />
                                    <span className={`max-w-[5.5rem] truncate text-center text-[11px] font-medium ${sel ? 'text-brand-900 dark:text-brand-100' : 'text-zinc-600 dark:text-zinc-300'}`}>
                                        {m.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {ministries.length === 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum departamento cadastrado.</p>
                )}

                {!ministryId && ministries.length !== 1 && ministries.length > 0 && (
                    <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
                        Selecione um departamento para ver a escala.
                    </p>
                )}

                {ministryId && (
                    <>
                        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-2 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                aria-label="Mês anterior"
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <span className="px-2 text-center text-sm font-semibold capitalize text-zinc-900 dark:text-white">
                                {monthTitle(year, month)}
                            </span>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                aria-label="Próximo mês"
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            {saturdays.map((_, idx) => {
                                const n = idx + 1;
                                const active = activeSaturday === n;
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setActiveSaturday(n)}
                                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                                            active
                                                ? 'bg-brand-700 text-white shadow-md dark:bg-brand-600'
                                                : 'bg-white text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200'
                                        }`}
                                    >
                                        {n}º
                                    </button>
                                );
                            })}
                        </div>

                        {selectedSaturdayDate && (
                            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                                            Status da escala
                                        </p>
                                        <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{activeSaturday}º sábado</h2>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                            {confirmedCount}/{totalCount || '0'} confirmados
                                        </span>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCheckin(selectedSaturdayDate, isCheckinEnabled(selectedSaturdayDate))}
                                                className={`${scheduleIconButtonClass} ${
                                                    isCheckinEnabled(selectedSaturdayDate) ? checkinActiveIconClass : ''
                                                }`}
                                                title={isCheckinEnabled(selectedSaturdayDate) ? 'Check-in aberto' : 'Liberar check-in'}
                                            >
                                                {isCheckinEnabled(selectedSaturdayDate) ? (
                                                    <CheckCircleIcon className="h-5 w-5 text-brand-600" />
                                                ) : (
                                                    <ClipboardDocumentCheckIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-brand-600 transition-all dark:bg-brand-500"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </section>
                        )}

                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Voluntários escalados</h3>
                            {canEdit && selectedSaturdayDate ? (
                                <div className="flex items-center gap-1.5 text-brand-700 dark:text-brand-300">
                                    <VolunteerAddPopover
                                        scheduleVolunteers={scheduleVolunteers}
                                        existingParticipantKeys={dayAssignments.map((a) => a.participantKey)}
                                        canEdit={canEdit}
                                        saturdayNumber={activeSaturday}
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
                                                    saturday_number: activeSaturday,
                                                    schedule_date: null,
                                                    recurring: options?.recurring ?? true,
                                                    assignment_month: options?.assignment_month ?? null,
                                                    assignment_year: options?.assignment_year ?? null,
                                                    status: 'pending',
                                                },
                                                inertiaScrollOpts,
                                            );
                                        }}
                                    />
                                    <span className="text-sm font-semibold">Adicionar</span>
                                </div>
                            ) : null}
                        </div>

                        <ul className="space-y-3">
                            {dayAssignments.length === 0 ? (
                                <li className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                    Nenhum voluntário neste sábado.
                                </li>
                            ) : (
                                dayAssignments.map((a) => {
                                    const pending = a.status === 'pending';
                                    const confirmed = a.status === 'confirmed';
                                    const refused = a.status === 'refused';
                                    return (
                                        <li
                                            key={a.id}
                                            className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
                                                pending && !refused ? 'border-l-4 border-l-amber-400 pl-2.5' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="flex w-full items-center gap-3 text-left"
                                                onClick={() => canEdit && setRoleModalAssignment(a)}
                                                disabled={!canEdit}
                                            >
                                                <div className="relative shrink-0">
                                                    {a.memberPhotoUrl ? (
                                                        <img
                                                            src={a.memberPhotoUrl}
                                                            alt=""
                                                            className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800"
                                                        />
                                                    ) : (
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                                                            {a.memberName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span
                                                        className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow dark:border-zinc-900 ${
                                                            confirmed
                                                                ? 'bg-brand-600 text-white'
                                                                : refused
                                                                  ? 'bg-red-600 text-white'
                                                                  : 'bg-amber-400 text-white'
                                                        }`}
                                                    >
                                                        {confirmed ? (
                                                            <CheckCircleIcon className="h-3.5 w-3.5" />
                                                        ) : refused ? (
                                                            <XCircleIcon className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <ClockIcon className="h-3.5 w-3.5" />
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-zinc-900 dark:text-white">{a.memberName}</p>
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{a.roleName ?? 'Sem função'}</p>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                                        confirmed
                                                            ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200'
                                                            : a.status === 'refused'
                                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                                                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100'
                                                    }`}
                                                >
                                                    {confirmed ? 'Confirmado' : a.status === 'refused' ? 'Recusado' : 'Pendente'}
                                                </span>
                                            </button>
                                            {selectedSaturdayDate && (isCheckinEnabled(selectedSaturdayDate) || canEdit) && (
                                                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                                    {isCheckinEnabled(selectedSaturdayDate) && (
                                                        <div className="flex-1 text-center">
                                                            {a.checkedInAt ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-300">
                                                                    <CheckCircleIcon className="h-4 w-4" />
                                                                    Presente
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCheckin(a.id)}
                                                                    className="text-xs font-semibold text-brand-700 underline dark:text-brand-300"
                                                                >
                                                                    Check-in
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleRemove(a);
                                                            }}
                                                            className="text-xs font-medium text-red-600 dark:text-red-400"
                                                        >
                                                            Remover
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })
                            )}
                        </ul>

                        <Link
                            href={route('escalas.index', { month, year, ministry_id: ministryId })}
                            className="block text-center text-sm font-medium text-brand-700 underline dark:text-brand-300"
                        >
                            Abrir visão completa no painel
                        </Link>
                    </>
                )}
            </div>

            <Modal show={roleModalAssignment !== null} onClose={() => setRoleModalAssignment(null)} maxWidth="md">
                {roleModalAssignment && (
                    <div className="p-5">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Função na escala</h3>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{roleModalAssignment.memberName}</p>
                        <div className="mt-4 space-y-3">
                            <InputLabel htmlFor="mob_role" value="Função" />
                            <select
                                id="mob_role"
                                value={roleModalRoleId}
                                onChange={(e) => setRoleModalRoleId(e.target.value)}
                                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <option value="">Sem função</option>
                                {scheduleRoles.map((r) => (
                                    <option key={r.id} value={String(r.id)}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {roleModalAssignment.recurringSeries && (
                            <fieldset className="mt-4 space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                                <legend className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Aplicar</legend>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={roleScope === 'occurrence'}
                                        onChange={() => setRoleScope('occurrence')}
                                    />
                                    Só esta data
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="radio" checked={roleScope === 'series'} onChange={() => setRoleScope('series')} />
                                    Toda a série
                                </label>
                            </fieldset>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
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
                                        payload.scope = roleScope === 'occurrence' ? 'single' : 'all';
                                        if (roleScope === 'occurrence' && roleModalAssignment.scheduleDate) {
                                            payload.occurrence_date = roleModalAssignment.scheduleDate;
                                        }
                                    }
                                    router.patch(route('escalas.update', roleModalAssignment.id), payload, {
                                        ...inertiaScrollOpts,
                                        onSuccess: () => setRoleModalAssignment(null),
                                    });
                                }}
                            >
                                Salvar
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal show={checkinConfirmDate !== null} onClose={() => setCheckinConfirmDate(null)} maxWidth="md">
                <div className="p-5">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Liberar check-in</h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Os voluntários escalados serão notificados na app e por e-mail (quando existir).
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setCheckinConfirmDate(null)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="button" onClick={confirmEnableCheckin}>
                            Liberar e notificar
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            <Modal show={removeModalAssignment !== null} onClose={() => setRemoveModalAssignment(null)} maxWidth="md">
                {removeModalAssignment && (
                    <div className="p-5">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Remover da escala</h3>
                        <p className="mt-2 text-sm text-zinc-500">{removeModalAssignment.memberName}</p>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                    </div>
                )}
            </Modal>
        </MobileLayout>
    );
}
