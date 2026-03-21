import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
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
} from '@/Components/Escalas/VolunteerAddPopover';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { getMinistryIcon } from '@/lib/ministryIcons';
import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/Components/PageHeader';

const checkinActiveIconClass =
    'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/40';

export type Assignment = {
    id: number;
    memberId: number;
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
    checkinEnabledDates,
    month,
    year,
    ministryId,
    ministries,
    canEdit,
    members,
    scheduleRoles,
}: Props) {
    const [localExtraDates, setLocalExtraDates] = useState<string[]>([]);
    const [roleModalAssignment, setRoleModalAssignment] = useState<Assignment | null>(null);
    const [roleModalRoleId, setRoleModalRoleId] = useState<string>('');
    const [roleScope, setRoleScope] = useState<'occurrence' | 'series'>('series');
    const [newRoleName, setNewRoleName] = useState('');
    const [checkinConfirmDate, setCheckinConfirmDate] = useState<Date | null>(null);
    const [removeModalAssignment, setRemoveModalAssignment] = useState<Assignment | null>(null);

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

    const inertiaScrollOpts = { preserveScroll: true };

    const handleToggleCheckin = (date: Date, currentlyEnabled: boolean) => {
        if (currentlyEnabled) {
            if (confirm('Desativar o check-in para este dia?')) {
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

    const handleCheckin = (assignmentId: number) => {
        router.post(route('escalas.checkin'), { assignment_id: assignmentId }, inertiaScrollOpts);
    };

    const handleRemove = (a: Assignment) => {
        if (!a.recurringSeries) {
            if (confirm('Remover esta escala?')) {
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
                            <section
                                id={`escala-sabado-${saturdayNumber}`}
                                key={saturday.toISOString()}
                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 scroll-mt-24"
                            >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white">{saturdayNumber}º SÁBADO</h3>
                                    {canEdit && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCheckin(saturday, isCheckinEnabled(saturday))}
                                                className={`${scheduleIconButtonClass} ${
                                                    isCheckinEnabled(saturday) ? checkinActiveIconClass : ''
                                                }`}
                                                title={isCheckinEnabled(saturday) ? 'Check-in aberto' : 'Liberar check-in'}
                                                aria-label={
                                                    isCheckinEnabled(saturday)
                                                        ? 'Check-in aberto para este dia'
                                                        : 'Liberar check-in para este dia'
                                                }
                                            >
                                                {isCheckinEnabled(saturday) ? (
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                ) : (
                                                    <ClipboardDocumentCheckIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                            <VolunteerAddPopover
                                                members={members}
                                                existingMemberIds={dayAssignments.map((a) => a.memberId)}
                                                canEdit={canEdit}
                                                saturdayNumber={saturdayNumber}
                                                month={month}
                                                year={year}
                                                scheduleRoles={scheduleRoles}
                                                onPick={(memberId, options) => {
                                                    router.post(
                                                        route('escalas.store'),
                                                        {
                                                            ministry_id: ministryId,
                                                            member_id: memberId,
                                                            schedule_role_id: options?.schedule_role_id ?? null,
                                                            saturday_number: saturdayNumber,
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
                                        </div>
                                    )}
                                </div>
                                <EscalaGrid
                                    assignments={dayAssignments}
                                    checkinEnabled={isCheckinEnabled(saturday)}
                                    canEdit={canEdit}
                                    onCheckin={handleCheckin}
                                    onRemove={handleRemove}
                                    onEditRole={(a) => setRoleModalAssignment(a)}
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
                            <section
                                id={`escala-extra-${scheduleDate}`}
                                key={scheduleDate}
                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 scroll-mt-24"
                            >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white">{formatted} — Escala extra</h3>
                                    {canEdit && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCheckin(date, isCheckinEnabled(date))}
                                                className={`${scheduleIconButtonClass} ${
                                                    isCheckinEnabled(date) ? checkinActiveIconClass : ''
                                                }`}
                                                title={isCheckinEnabled(date) ? 'Check-in aberto' : 'Liberar check-in'}
                                                aria-label={
                                                    isCheckinEnabled(date)
                                                        ? 'Check-in aberto para este dia'
                                                        : 'Liberar check-in para este dia'
                                                }
                                            >
                                                {isCheckinEnabled(date) ? (
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                ) : (
                                                    <ClipboardDocumentCheckIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                            <VolunteerAddPopover
                                                members={members}
                                                existingMemberIds={dayAssignments.map((a) => a.memberId)}
                                                canEdit={canEdit}
                                                scheduleRoles={scheduleRoles}
                                                onPick={(memberId, options) => {
                                                    router.post(
                                                        route('escalas.store'),
                                                        {
                                                            ministry_id: ministryId,
                                                            member_id: memberId,
                                                            schedule_role_id: options?.schedule_role_id ?? null,
                                                            saturday_number: null,
                                                            schedule_date: scheduleDate,
                                                            status: 'pending',
                                                        },
                                                        inertiaScrollOpts,
                                                    );
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <EscalaGrid
                                    assignments={dayAssignments}
                                    checkinEnabled={isCheckinEnabled(date)}
                                    canEdit={canEdit}
                                    onCheckin={handleCheckin}
                                    onRemove={handleRemove}
                                    onEditRole={(a) => setRoleModalAssignment(a)}
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

                    {ministryId && canEdit && (
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
                                                            if (confirm('Remover esta função?')) {
                                                                router.delete(route('escalas.roles.destroy', r.id), inertiaScrollOpts);
                                                            }
                                                        }}
                                                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                                                    >
                                                        Remover
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
                </div>
                </>
                )}
            </div>

            <Modal show={roleModalAssignment !== null} onClose={() => setRoleModalAssignment(null)} maxWidth="md">
                {roleModalAssignment && (
                    <div className="p-1">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Função na escala</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{roleModalAssignment.memberName}</p>
                        <div className="mt-4">
                            <InputLabel htmlFor="modal_schedule_role" value="Função" />
                            <select
                                id="modal_schedule_role"
                                value={roleModalRoleId}
                                onChange={(e) => setRoleModalRoleId(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
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
                            <fieldset className="mt-4 space-y-2">
                                <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Aplicar alteração
                                </legend>
                                <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role_scope"
                                        className="mt-1"
                                        checked={roleScope === 'occurrence'}
                                        onChange={() => setRoleScope('occurrence')}
                                    />
                                    <span>
                                        Apenas esta data (
                                        {roleModalAssignment.scheduleDate
                                            ? new Date(
                                                  roleModalAssignment.scheduleDate + 'T12:00:00',
                                              ).toLocaleDateString('pt-BR')
                                            : '—'}
                                        )
                                    </span>
                                </label>
                                <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role_scope"
                                        className="mt-1"
                                        checked={roleScope === 'series'}
                                        onChange={() => setRoleScope('series')}
                                    />
                                    <span>Toda a escala (recorrente)</span>
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
                                Guardar
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal show={checkinConfirmDate !== null} onClose={() => setCheckinConfirmDate(null)} maxWidth="md">
                <div className="p-1">
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
                    <div className="p-1">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Remover da escala</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{removeModalAssignment.memberName}</p>
                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                            Esta linha repete em todos os meses. Pode remover só{' '}
                            {removeModalAssignment.scheduleDate
                                ? new Date(removeModalAssignment.scheduleDate + 'T12:00:00').toLocaleDateString('pt-BR')
                                : 'esta data'}{' '}
                            ou eliminar toda a série.
                        </p>
                        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 justify-end">
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
        </AdminLayout>
    );
}

function EscalaGrid({
    assignments,
    checkinEnabled,
    canEdit,
    onCheckin,
    onRemove,
    onEditRole,
}: {
    assignments: Assignment[];
    checkinEnabled: boolean;
    canEdit: boolean;
    onCheckin: (id: number) => void;
    onRemove: (a: Assignment) => void;
    onEditRole: (a: Assignment) => void;
}) {
    return (
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
            {assignments.map((a) => (
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
                    className={`w-full sm:w-40 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 flex flex-col items-center gap-2 ${
                        canEdit ? 'cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-100/80 dark:hover:bg-zinc-800' : ''
                    }`}
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
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
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
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(a);
                            }}
                            className="mt-auto text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                            aria-label="Remover"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
