import { router } from '@inertiajs/react';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { MouseEvent } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

type Props = {
    kind: 'inbox' | 'app';
    /** ID numérico em `user_inbox_notifications` ou `app_notifications`. */
    recordId: number;
    compact?: boolean;
};

/** Remove da lista do usuário: inbox apaga o registro; aviso da igreja só oculta para esta conta. */
export default function DismissNotificationButton({ kind, recordId, compact = true }: Props) {
    const handleClick = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const ok = await confirmAction({
            title: 'Excluir notificação?',
            text:
                kind === 'inbox'
                    ? 'Esta notificação será removida da sua lista.'
                    : 'O aviso deixará de aparecer para você. Outras pessoas continuam vendo.',
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar',
        });
        if (!ok) return;

        router.post(
            route('notifications.remove'),
            { kind, id: recordId },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <button
            type="button"
            title="Excluir notificação"
            aria-label="Excluir notificação"
            onClick={handleClick}
            className={
                compact
                    ? 'flex shrink-0 items-center justify-center self-stretch border-l border-zinc-100 px-2.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:border-zinc-800 dark:hover:bg-red-950/40 dark:hover:text-red-400'
                    : 'inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300'
            }
        >
            <TrashIcon className={compact ? 'h-5 w-5' : 'h-4 w-4'} />
            {!compact && <span>Excluir</span>}
        </button>
    );
}
