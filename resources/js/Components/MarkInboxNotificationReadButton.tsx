import { router } from '@inertiajs/react';
import { CheckIcon } from '@heroicons/react/20/solid';

type Props = {
    notificationId: number;
    /** Estilo compacto (ex.: lista do sino). */
    compact?: boolean;
};

/** Marca uma notificação de caixa (inbox) como lida sem abrir o destino. */
export default function MarkInboxNotificationReadButton({ notificationId, compact = true }: Props) {
    return (
        <button
            type="button"
            title="Marcar como lida"
            aria-label="Marcar como lida"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.post(
                    route('notifications.inbox.read'),
                    { id: notificationId },
                    { preserveScroll: true, preserveState: true },
                );
            }}
            className={
                compact
                    ? 'flex shrink-0 items-center justify-center self-stretch border-l border-zinc-100 px-2.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-600 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-emerald-400'
                    : 'inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }
        >
            <CheckIcon className={compact ? 'h-5 w-5' : 'h-4 w-4'} />
            {!compact && <span>Marcar lida</span>}
        </button>
    );
}
