import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import {
    isActionNotificationIntent,
    type NotificationIntent,
    normalizeNotificationIntent,
} from '@/utils/notificationIntent';

type Props = {
    intent?: string | null;
    className?: string;
    /** compact = chip pequeno; pill = padrão nas listas */
    size?: 'compact' | 'pill';
};

export function notificationIntentLabel(intent?: string | null): string {
    return isActionNotificationIntent(intent) ? 'Para atender' : 'Informativo';
}

/** Classes do card em páginas de lista (ação com acento, sem lavar a tela de amarelo). */
export function notificationIntentSurfaceClass(intent?: string | null, unread = false): string {
    const normalized = normalizeNotificationIntent(intent);
    if (normalized === 'action') {
        return unread
            ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white dark:border-amber-800/60 dark:from-amber-950/35 dark:to-zinc-900'
            : 'border-amber-200/60 bg-gradient-to-r from-amber-50/50 to-white dark:border-amber-900/40 dark:from-amber-950/20 dark:to-zinc-900';
    }

    return unread
        ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
        : 'border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900';
}

export function notificationIntentIconWrapClass(intent?: string | null): string {
    return isActionNotificationIntent(intent)
        ? 'bg-amber-100/90 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800/50'
        : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/60';
}

export default function NotificationIntentBadge({ intent, className = '', size = 'pill' }: Props) {
    const normalized: NotificationIntent = normalizeNotificationIntent(intent);
    const action = normalized === 'action';
    const compact = size === 'compact';

    return (
        <span
            className={`inline-flex items-center gap-1 font-semibold tracking-wide ${
                compact
                    ? 'rounded-full px-2 py-0.5 text-[10px]'
                    : 'rounded-full px-2.5 py-0.5 text-[11px]'
            } ${
                action
                    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/90 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-500/25'
                    : 'bg-zinc-100/90 text-zinc-600 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-700/60'
            } ${className}`}
        >
            {action ? (
                <ExclamationTriangleIcon className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} aria-hidden />
            ) : (
                <InformationCircleIcon className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} aria-hidden />
            )}
            {notificationIntentLabel(normalized)}
        </span>
    );
}
