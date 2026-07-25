import { router } from '@inertiajs/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import type { MouseEvent } from 'react';

type Props = {
    kind: 'inbox' | 'app';
    /** ID numérico em `user_inbox_notifications` ou `app_notifications`. */
    recordId: number;
    compact?: boolean;
};

/** Remove da lista do usuário: inbox apaga o registro; aviso da igreja só oculta para esta conta. */
export default function DismissNotificationButton({ kind, recordId, compact = true }: Props) {
    const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        router.post(
            route('notifications.remove'),
            { kind, id: recordId },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <button
            type="button"
            title="Já vi"
            aria-label="Marcar notificação como vista"
            onClick={handleClick}
            className={
                compact
                    ? 'flex shrink-0 cursor-pointer items-center justify-center self-stretch border-l border-zinc-100 px-2.5 text-zinc-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:border-zinc-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400'
                    : 'inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300'
            }
        >
            <CheckCircleIcon className={compact ? 'h-5 w-5' : 'h-4 w-4'} />
            {!compact && <span>Já vi</span>}
        </button>
    );
}
