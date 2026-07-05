import UserListAvatar from '@/Components/UserListAvatar';
import { missionOverdueCardClass } from '@/utils/missionOverdueStyles';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type PhaseColumn = {
    id: number;
    name: string;
    sla_days: number;
    volunteer_count: number;
    overdue_count: number;
};

type VolunteerCard = {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
    photoUrl: string | null;
    phaseId: number | null;
    hasEmail: boolean;
    daysInPhase: number;
    slaDays: number | null;
    isOverdue: boolean;
    daysOverdue: number | null;
    phaseEnteredAt: string | null;
    phaseEnteredAtLabel: string | null;
    canEditPhase: boolean;
};

type ColumnKey = number | 'unset';

type Props = {
    phases: PhaseColumn[];
    volunteers: VolunteerCard[];
    operablePhaseIds: number[] | null;
    onOpenVolunteer: (id: number) => void;
    totalCount?: number;
};

function canDropOnPhase(operablePhaseIds: number[] | null, phaseId: number): boolean {
    if (operablePhaseIds === null) {
        return true;
    }

    return operablePhaseIds.includes(phaseId);
}

function slaProgressPercent(daysInPhase: number, slaDays: number | null): number {
    if (slaDays === null || slaDays < 1) {
        return 0;
    }

    return Math.min(100, Math.round((daysInPhase / slaDays) * 100));
}

function sortCardsForColumn(cards: VolunteerCard[]): VolunteerCard[] {
    return [...cards].sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) {
            return a.isOverdue ? -1 : 1;
        }

        return (b.daysInPhase ?? 0) - (a.daysInPhase ?? 0);
    });
}

function SlaProgressBar({ row }: { row: VolunteerCard }) {
    const sla = row.slaDays;
    if (sla === null || sla < 1) {
        return null;
    }

    const pct = slaProgressPercent(row.daysInPhase, sla);
    const barTone = row.isOverdue
        ? 'bg-red-500 dark:bg-red-400'
        : pct >= 85
          ? 'bg-amber-500 dark:bg-amber-400'
          : 'bg-teal-600 dark:bg-teal-400';

    return (
        <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                <span>
                    {row.daysInPhase} de {sla} dias na fase
                </span>
                <span className={row.isOverdue ? 'font-semibold text-red-700 dark:text-red-300' : ''}>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200/90 dark:bg-zinc-700">
                <div
                    className={`h-full rounded-full transition-[width] ${barTone}`}
                    style={{ width: `${Math.max(row.isOverdue ? 100 : pct, 4)}%` }}
                />
            </div>
        </div>
    );
}

function MissionKanbanCard({
    row,
    dragging,
    onOpen,
}: {
    row: VolunteerCard;
    dragging: boolean;
    onOpen: () => void;
}) {
    const arrivedLabel = row.phaseEnteredAtLabel ?? '—';

    return (
        <article
            className={`group rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md ${missionOverdueCardClass(row.isOverdue)} ${
                dragging ? 'opacity-50' : ''
            } ${row.canEditPhase ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <button type="button" className="flex w-full flex-col gap-2 text-left" onClick={onOpen}>
                <div className="flex items-start gap-2.5">
                    <UserListAvatar name={row.fullName} photoUrl={row.photoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 group-hover:text-teal-800 dark:text-white dark:group-hover:text-teal-300">
                            {row.fullName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                            {!row.hasEmail ? (
                                <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
                                    Sem e-mail
                                </span>
                            ) : null}
                            {row.isOverdue && row.daysOverdue !== null ? (
                                <span className="inline-flex rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-red-500">
                                    {row.daysOverdue} {row.daysOverdue === 1 ? 'dia' : 'dias'} atrasado
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg bg-zinc-100/80 px-2 py-1.5 text-[11px] text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                    <CalendarIcon />
                    <span>
                        Chegou em <span className="font-semibold text-zinc-800 dark:text-zinc-100">{arrivedLabel}</span>
                    </span>
                </div>

                <SlaProgressBar row={row} />

                {row.phone || row.email ? (
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{row.phone ?? row.email}</p>
                ) : null}
            </button>
        </article>
    );
}

function CalendarIcon() {
    return (
        <svg className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
                fillRule="evenodd"
                d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h1.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H6V2.75A.75.75 0 016.75 2h-1zm-1 6.5v6.75c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V8.5h-13z"
                clipRule="evenodd"
            />
        </svg>
    );
}

export default function MissionKanban({ phases, volunteers, operablePhaseIds, onOpenVolunteer, totalCount }: Props) {
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<ColumnKey | null>(null);

    const columns = useMemo(() => {
        const cols = phases.map((p) => ({
            key: p.id as ColumnKey,
            label: p.name,
            slaDays: p.sla_days,
            overdueCount: p.overdue_count,
            totalInPhase: p.volunteer_count,
        }));
        cols.push({ key: 'unset', label: 'Não definido', slaDays: 0, overdueCount: 0, totalInPhase: 0 });

        return cols;
    }, [phases]);

    const cardsByColumn = useMemo(() => {
        const map = new Map<string, VolunteerCard[]>();
        for (const col of columns) {
            map.set(String(col.key), []);
        }
        for (const v of volunteers) {
            const key = v.phaseId ?? 'unset';
            const bucket = map.get(String(key)) ?? [];
            bucket.push(v);
            map.set(String(key), bucket);
        }
        for (const [key, cards] of map) {
            map.set(key, sortCardsForColumn(cards));
        }

        return map;
    }, [volunteers, columns]);

    const moveToPhase = (volunteerId: number, phaseId: number) => {
        router.patch(route('mission.volunteers.phase', volunteerId), { mission_phase_id: phaseId }, { preserveScroll: true });
    };

    const handleDrop = (columnKey: ColumnKey) => {
        setDropTarget(null);
        if (draggingId === null || columnKey === 'unset') {
            setDraggingId(null);
            return;
        }
        if (!canDropOnPhase(operablePhaseIds, columnKey)) {
            setDraggingId(null);
            return;
        }
        const volunteer = volunteers.find((v) => v.id === draggingId);
        if (!volunteer || volunteer.phaseId === columnKey) {
            setDraggingId(null);
            return;
        }
        moveToPhase(draggingId, columnKey);
        setDraggingId(null);
    };

    const loadedCount = volunteers.length;
    const showTruncationHint =
        typeof totalCount === 'number' && totalCount > loadedCount && loadedCount > 0;

    return (
        <div className="space-y-4">
            {showTruncationHint ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                    Exibindo <strong>{loadedCount}</strong> de <strong>{totalCount}</strong> cadastros no kanban. Refine a
                    busca ou use a lista com paginação.
                </div>
            ) : null}

            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">
                {columns.map((col) => {
                    const cards = cardsByColumn.get(String(col.key)) ?? [];
                    const isDropActive = dropTarget === col.key;
                    const dropEnabled = col.key !== 'unset' && canDropOnPhase(operablePhaseIds, col.key as number);
                    const hasOverdue = col.overdueCount > 0;

                    return (
                        <div
                            key={String(col.key)}
                            className="flex max-h-[calc(100dvh-17rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] w-[min(100%,20.5rem)] shrink-0 snap-start flex-col md:max-h-[calc(100dvh-13rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]"
                            onDragOver={(e) => {
                                if (!dropEnabled || draggingId === null) return;
                                e.preventDefault();
                                setDropTarget(col.key);
                            }}
                            onDragLeave={() => {
                                if (dropTarget === col.key) setDropTarget(null);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleDrop(col.key);
                            }}
                        >
                            <div
                                className={`mb-3 shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-zinc-900 ${
                                    hasOverdue
                                        ? 'border-red-200/90 dark:border-red-900/50'
                                        : 'border-zinc-200 dark:border-zinc-700'
                                }`}
                            >
                                <div
                                    className={`h-1 ${
                                        hasOverdue
                                            ? 'bg-gradient-to-r from-red-500 to-red-400'
                                            : 'bg-gradient-to-r from-teal-600 to-teal-400'
                                    }`}
                                />
                                <div className="px-3 py-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                                            {col.label}
                                        </h3>
                                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                            {cards.length}
                                        </span>
                                    </div>
                                    {col.key !== 'unset' ? (
                                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                            SLA {col.slaDays} dias
                                            {hasOverdue ? (
                                                <span className="ml-1.5 font-semibold text-red-600 dark:text-red-400">
                                                    · {col.overdueCount} atrasado{col.overdueCount === 1 ? '' : 's'}
                                                </span>
                                            ) : null}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div
                                className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain rounded-xl border p-2 transition-all [scrollbar-gutter:stable] ${
                                    isDropActive
                                        ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-400/40 dark:border-teal-400 dark:bg-teal-950/40'
                                        : 'border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/30'
                                }`}
                            >
                                {cards.length === 0 ? (
                                    <div className="flex min-h-[14rem] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200/80 px-3 py-8 text-center dark:border-zinc-700">
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Nenhum cadastro</p>
                                        <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                                            Arraste um card para esta fase
                                        </p>
                                    </div>
                                ) : (
                                    cards.map((v) => (
                                        <div
                                            key={v.id}
                                            draggable={v.canEditPhase}
                                            onDragStart={() => setDraggingId(v.id)}
                                            onDragEnd={() => {
                                                setDraggingId(null);
                                                setDropTarget(null);
                                            }}
                                        >
                                            <MissionKanbanCard
                                                row={v}
                                                dragging={draggingId === v.id}
                                                onOpen={() => onOpenVolunteer(v.id)}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
