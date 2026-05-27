import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export type SupportKanbanTicket = {
    publicToken: string;
    typeLabel: string;
    demandCategoryLabel: string;
    priority: string;
    priorityLabel: string;
    status: string;
    statusLabel: string;
    message: string;
    forecastAt: string | null;
    ownerLabel: string;
    createdAt: string;
};

type StatusColumn = {
    value: string;
    label: string;
};

type Props = {
    columns: StatusColumn[];
    tickets: SupportKanbanTicket[];
    canManageTickets: boolean;
    supportUpdateUrlPattern: (token: string) => string;
    onOpenTicket: (token: string) => void;
};

function priorityTone(priority: string): string {
    switch (priority) {
        case 'urgent':
            return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
        case 'high':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
        case 'low':
            return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
        default:
            return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    }
}

function formatForecastDate(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SupportKanban({
    columns,
    tickets,
    canManageTickets,
    supportUpdateUrlPattern,
    onOpenTicket,
}: Props) {
    const [draggingToken, setDraggingToken] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);

    const cardsByColumn = useMemo(() => {
        const map = new Map<string, SupportKanbanTicket[]>();
        for (const col of columns) {
            map.set(col.value, []);
        }
        for (const ticket of tickets) {
            const bucket = map.get(ticket.status) ?? [];
            bucket.push(ticket);
            map.set(ticket.status, bucket);
        }
        return map;
    }, [tickets, columns]);

    const moveToStatus = (token: string, status: string) => {
        router.patch(
            supportUpdateUrlPattern(token),
            { status },
            { preserveScroll: true },
        );
    };

    const handleDrop = (status: string) => {
        setDropTarget(null);
        if (!draggingToken || !canManageTickets) {
            return;
        }
        const ticket = tickets.find((t) => t.publicToken === draggingToken);
        if (!ticket || ticket.status === status) {
            setDraggingToken(null);
            return;
        }
        moveToStatus(draggingToken, status);
        setDraggingToken(null);
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
                            if (!canManageTickets || draggingToken === null) return;
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
                                <p className="p-3 text-center text-xs text-zinc-500">Nenhuma demanda</p>
                            ) : (
                                cards.map((ticket) => (
                                    <div
                                        key={ticket.publicToken}
                                        draggable={canManageTickets}
                                        onDragStart={() => setDraggingToken(ticket.publicToken)}
                                        onDragEnd={() => {
                                            setDraggingToken(null);
                                            setDropTarget(null);
                                        }}
                                        className={`rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
                                            draggingToken === ticket.publicToken ? 'opacity-50' : ''
                                        } ${canManageTickets ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            className="w-full text-left"
                                            onClick={() => onOpenTicket(ticket.publicToken)}
                                        >
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityTone(ticket.priority)}`}
                                                >
                                                    {ticket.priorityLabel}
                                                </span>
                                                {ticket.demandCategoryLabel !== '—' ? (
                                                    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                                                        {ticket.demandCategoryLabel}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-2 line-clamp-3 text-sm font-medium leading-snug text-zinc-900 dark:text-white">
                                                {ticket.message}
                                            </p>
                                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{ticket.ownerLabel}</p>
                                            {ticket.forecastAt ? (
                                                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                                                    Previsão: {formatForecastDate(ticket.forecastAt)}
                                                </p>
                                            ) : null}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
