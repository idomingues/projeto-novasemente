import { router } from '@inertiajs/react';
import { CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { MouseEvent } from 'react';

type Props = {
    kind: 'inbox' | 'app';
    /** ID numérico em `user_inbox_notifications` ou `app_notifications`. */
    recordId: number;
    compact?: boolean;
    /** `seen` = Já vi (padrão); `delete` = Excluir da minha lista. */
    appearance?: 'seen' | 'delete';
};

/** Remove da lista do usuário: inbox apaga o registro; aviso da igreja só oculta para esta conta. */
export default function DismissNotificationButton({
    kind,
    recordId,
    compact = true,
    appearance = 'seen',
}: Props) {
    const isDelete = appearance === 'delete';
    const label = isDelete ? 'Excluir notificação' : 'Marcar notificação como vista';
    const Icon = isDelete ? TrashIcon : CheckCircleIcon;

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
            title={isDelete ? 'Excluir' : 'Já vi'}
            aria-label={label}
            onClick={handleClick}
            className={
                compact
                    ? `flex shrink-0 cursor-pointer items-center justify-center self-stretch border-l border-zinc-100 px-2.5 transition dark:border-zinc-800 ${
                          isDelete
                              ? 'text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400'
                              : 'text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400'
                      }`
                    : `inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                          isDelete
                              ? 'border-zinc-200 text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300'
                              : 'border-zinc-200 text-zinc-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300'
                      }`
            }
        >
            <Icon className={compact ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden />
            {!compact && <span>{isDelete ? 'Excluir' : 'Já vi'}</span>}
        </button>
    );
}
