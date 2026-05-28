import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export type CommunicationKanbanRow = {
    id: number;
    subject: string;
    message_preview: string;
    status: string;
    status_label: string;
    demand_type_label: string;
    priority_label: string;
    requester_name: string | null;
    can_edit: boolean;
};

type StatusColumn = {
    value: string;
    label: string;
};

type Props = {
    columns: StatusColumn[];
    rows: CommunicationKanbanRow[];
    canManage: boolean;
    updateUrl: (id: number) => string;
    onOpenRow: (id: number) => void;
};

export default function CommunicationRequestsKanban({ columns, rows, canManage, updateUrl, onOpenRow }: Props) {
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [suppressClickUntil, setSuppressClickUntil] = useState(0);
    const [localRows, setLocalRows] = useState<CommunicationKanbanRow[]>(rows);

    useEffect(() => {
        setLocalRows(rows);
    }, [rows]);

    const statusLabelFor = (status: string): string =>
        columns.find((c) => c.value === status)?.label ?? status;

    const cardsByColumn = useMemo(() => {
        const map = new Map<string, CommunicationKanbanRow[]>();
        for (const col of columns) {
            map.set(col.value, []);
        }
        for (const row of localRows) {
            const bucket = map.get(row.status) ?? [];
            bucket.push(row);
            map.set(row.status, bucket);
        }
        return map;
    }, [localRows, columns]);

    const moveToStatus = (id: number, status: string) => {
        setLocalRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status, status_label: statusLabelFor(status) } : r)),
        );

        router.patch(
            updateUrl(id),
            { status },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    // Em caso de falha, volta ao estado do servidor.
                    setLocalRows(rows);
                },
            },
        );
    };

    const canDragRow = (row: CommunicationKanbanRow) => canManage && row.can_edit;

    const handleDrop = (status: string) => {
        setDropTarget(null);
        if (draggingId === null) return;

        const row = localRows.find((r) => r.id === draggingId);
        if (!row) {
            setDraggingId(null);
            return;
        }
        if (!canDragRow(row) || row.status === status) {
            setDraggingId(null);
            return;
        }

        moveToStatus(draggingId, status);
        setDraggingId(null);
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => {
                const cards = cardsByColumn.get(col.value) ?? [];
                const isDropActive = dropTarget === col.value;

                return (
                    <div
                        key={col.value}
                        className="flex w-[min(100%,18rem)] shrink-0 flex-col"
                        onDragOver={(e) => {
                            if (draggingId === null) return;
                            const row = localRows.find((r) => r.id === draggingId);
                            if (!row || !canDragRow(row)) return;
                            e.preventDefault();
                            setDropTarget(col.value);
                        }}
                        onDragLeave={() => {
                            if (dropTarget === col.value) setDropTarget(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(col.value);
                        }}
                    >
                        <div className="mb-2 flex items-center justify-between gap-2 px-1">
                            <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{col.label}</h3>
                            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {cards.length}
                            </span>
                        </div>
                        <div
                            className={`flex min-h-[12rem] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors ${
                                isDropActive
                                    ? 'border-zinc-900 bg-zinc-100/80 dark:border-white dark:bg-zinc-800/60'
                                    : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40'
                            }`}
                        >
                            {cards.length === 0 ? (
                                <p className="p-3 text-center text-xs text-zinc-500">Nenhuma solicitação</p>
                            ) : (
                                cards.map((row) => {
                                    const draggable = canDragRow(row);
                                    return (
                                        <div
                                            key={row.id}
                                            draggable={draggable}
                                            onDragStart={() => {
                                                if (!draggable) return;
                                                setDraggingId(row.id);
                                                setSuppressClickUntil(Date.now() + 600);
                                            }}
                                            onDragEnd={() => {
                                                setDraggingId(null);
                                                setDropTarget(null);
                                                setSuppressClickUntil(Date.now() + 350);
                                            }}
                                            className={`rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
                                                draggingId === row.id ? 'opacity-50' : ''
                                            } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                        >
                                            <button
                                                type="button"
                                                className="w-full cursor-pointer text-left"
                                                onClick={() => {
                                                    if (Date.now() < suppressClickUntil) return;
                                                    if (draggingId !== null) return;
                                                    onOpenRow(row.id);
                                                }}
                                            >
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                                        {row.priority_label}
                                                    </span>
                                                    {row.demand_type_label !== '—' ? (
                                                        <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                                                            {row.demand_type_label}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                                                    {row.subject}
                                                </p>
                                                <p className="mt-1 line-clamp-3 text-xs text-zinc-600 dark:text-zinc-300">
                                                    {row.message_preview}
                                                </p>
                                                {row.requester_name ? (
                                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                        {row.requester_name}
                                                    </p>
                                                ) : null}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
