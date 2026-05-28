import UserListAvatar from '@/Components/UserListAvatar';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type StageColumn = { id: number; name: string; volunteer_count: number };

type VolunteerCard = {
    id: number;
    name: string | null;
    photoUrl?: string | null;
    hasUserAccount?: boolean;
    email: string | null;
    phone: string | null;
    stageId: number | undefined;
    adminWorkflowStageId?: number | null;
    pendingInvite?: boolean;
    stageName: string;
};

type ColumnKey = number | 'blank' | 'unset';

type Props = {
    stages: StageColumn[];
    volunteers: VolunteerCard[];
    canVolunteerManage: boolean;
    canMoveCards: boolean;
    onOpenVolunteer: (id: number) => void;
    totalCount?: number;
};

const ADMIN_WORKFLOW_NAMES = new Set(['interessado', 'encaminhado', 'atuante', 'finalizado']);

function isAdminWorkflowStage(name: string): boolean {
    return ADMIN_WORKFLOW_NAMES.has(name.trim().toLowerCase());
}

function volunteerColumnKey(v: VolunteerCard, adminView: boolean): ColumnKey {
    if (adminView) {
        return v.adminWorkflowStageId ?? 'blank';
    }

    return v.stageId ?? 'unset';
}

export default function VolunteerPipelineKanban({
    stages,
    volunteers,
    canVolunteerManage,
    canMoveCards,
    onOpenVolunteer,
    totalCount,
}: Props) {
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<ColumnKey | null>(null);

    const columns = useMemo(() => {
        const pipelineStages = canVolunteerManage ? stages.filter((s) => isAdminWorkflowStage(s.name)) : stages;

        const cols: { key: ColumnKey; label: string; count: number }[] = pipelineStages.map((s) => ({
            key: s.id,
            label: s.name,
            count: s.volunteer_count,
        }));

        if (canVolunteerManage) {
            cols.push({ key: 'blank', label: 'Sem fase principal', count: 0 });
        } else {
            cols.unshift({ key: 'unset', label: 'Não definido', count: 0 });
        }

        return cols;
    }, [stages, canVolunteerManage]);

    const cardsByColumn = useMemo(() => {
        const map = new Map<string, VolunteerCard[]>();
        for (const col of columns) {
            map.set(String(col.key), []);
        }
        for (const v of volunteers) {
            const key = volunteerColumnKey(v, canVolunteerManage);
            const bucket = map.get(String(key)) ?? [];
            bucket.push(v);
            map.set(String(key), bucket);
        }
        return map;
    }, [volunteers, columns, canVolunteerManage]);

    const moveToStage = (volunteerId: number, stageId: number) => {
        router.patch(
            route('ministry-lead.volunteers.pipeline.stage', volunteerId),
            { stage_id: stageId },
            { preserveScroll: true },
        );
    };

    const handleDrop = (columnKey: ColumnKey) => {
        setDropTarget(null);
        if (draggingId === null || !canMoveCards) {
            return;
        }
        if (columnKey === 'blank' || columnKey === 'unset') {
            setDraggingId(null);
            return;
        }
        const volunteer = volunteers.find((v) => v.id === draggingId);
        if (!volunteer) {
            setDraggingId(null);
            return;
        }
        const current = volunteerColumnKey(volunteer, canVolunteerManage);
        if (current === columnKey) {
            setDraggingId(null);
            return;
        }
        moveToStage(draggingId, columnKey);
        setDraggingId(null);
    };

    const loadedCount = volunteers.length;
    const showTruncationHint =
        typeof totalCount === 'number' && totalCount > loadedCount && loadedCount > 0;

    return (
        <div className="space-y-3">
            {showTruncationHint ? (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    Exibindo {loadedCount} de {totalCount} registros no kanban. Refine os filtros ou use a lista para ver
                    todos com paginação.
                </p>
            ) : null}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((col) => {
                    const cards = cardsByColumn.get(String(col.key)) ?? [];
                    const isDropActive = dropTarget === col.key;
                    const dropEnabled = canMoveCards && col.key !== 'blank' && col.key !== 'unset';

                    return (
                        <div
                            key={String(col.key)}
                            className="flex w-[min(100%,18rem)] shrink-0 flex-col"
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
                            <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{col.label}</h3>
                                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    {typeof totalCount === 'number' ? col.count : cards.length}
                                </span>
                            </div>
                            <div
                                className={`flex min-h-[12rem] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors ${
                                    isDropActive
                                        ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-950/30'
                                        : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40'
                                }`}
                            >
                                {cards.length === 0 ? (
                                    <p className="p-3 text-center text-xs text-zinc-500">Nenhum voluntário</p>
                                ) : (
                                    cards.map((v) => (
                                        <div
                                            key={v.id}
                                            draggable={canMoveCards && dropEnabled}
                                            onDragStart={() => setDraggingId(v.id)}
                                            onDragEnd={() => {
                                                setDraggingId(null);
                                                setDropTarget(null);
                                            }}
                                            className={`rounded-lg border bg-white p-3 shadow-sm dark:bg-zinc-900 ${
                                                v.pendingInvite
                                                    ? 'border-amber-200 dark:border-amber-900/50'
                                                    : 'border-zinc-200 dark:border-zinc-700'
                                            } ${draggingId === v.id ? 'opacity-50' : ''} ${
                                                canMoveCards ? 'cursor-grab active:cursor-grabbing' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="flex w-full items-start gap-2 text-left"
                                                onClick={() => onOpenVolunteer(v.id)}
                                            >
                                                <UserListAvatar name={v.name} photoUrl={v.photoUrl} size="sm" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">
                                                        {v.name ?? '—'}
                                                    </span>
                                                    {v.hasUserAccount ? (
                                                        <span className="mt-1 inline-block rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                                                            Com conta
                                                        </span>
                                                    ) : null}
                                                    {v.email || v.phone ? (
                                                        <span className="mt-1 block truncate text-xs text-zinc-500">
                                                            {v.email ?? v.phone}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </button>
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
