import { CheckIcon } from '@heroicons/react/20/solid';
import { useState, type MouseEvent } from 'react';
import { markInboxNotificationReadRequest } from '@/utils/notificationFeedActions';

type Props = {
    notificationId: number;
    /** Estilo compacto (ex.: lista do sino). */
    compact?: boolean;
};

/** Marca uma notificação de caixa (inbox) como lida sem abrir o destino. */
export default function MarkInboxNotificationReadButton({ notificationId, compact = true }: Props) {
    const [busy, setBusy] = useState(false);

    const handleClick = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        setBusy(true);
        try {
            await markInboxNotificationReadRequest(notificationId);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            title="Marcar como lida"
            aria-label="Marcar como lida"
            disabled={busy}
            onClick={handleClick}
            className={
                compact
                    ? 'flex shrink-0 cursor-pointer items-center justify-center self-stretch border-l border-zinc-200/90 px-3 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                    : 'inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }
        >
            <CheckIcon className={compact ? 'h-5 w-5' : 'h-4 w-4'} />
            {!compact && <span>Marcar lida</span>}
        </button>
    );
}
