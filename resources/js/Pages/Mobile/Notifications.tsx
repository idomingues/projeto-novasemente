import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import { formatNotificationWhen } from '@/utils/formatNotificationWhen';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import DismissNotificationButton from '@/Components/DismissNotificationButton';
import NotificationIntentBadge, {
    notificationIntentIconWrapClass,
    notificationIntentSurfaceClass,
} from '@/Components/NotificationIntentBadge';
import { BellAlertIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';

interface NotificationEntry {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href: string;
    kind: string;
    intent?: string;
    inbox_notification_id?: number;
    inbox_unread?: boolean;
    app_notification_id?: number;
    can_remove?: boolean;
    inbox_group_count?: number;
}

interface Props {
    notifications: NotificationEntry[];
}

type ViewFilter = 'unread' | 'all';

const viewFilters: { key: ViewFilter; label: string }[] = [
    { key: 'unread', label: 'Não lidas' },
    { key: 'all', label: 'Todas' },
];

/** Só caixa pessoal com read_at nulo — avisos da igreja não entram neste contador. */
function isUnread(n: NotificationEntry): boolean {
    return n.kind === 'inbox' && Boolean(n.inbox_unread);
}

/** Uma linha por título (a mais recente), com contagem do grupo. */
function groupUnreadByTitle(items: NotificationEntry[]): NotificationEntry[] {
    const sorted = [...items].filter(isUnread).sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return tb - ta;
    });
    const map = new Map<string, NotificationEntry>();
    for (const n of sorted) {
        const existing = map.get(n.title);
        if (existing) {
            existing.inbox_group_count = (existing.inbox_group_count ?? 1) + 1;
            continue;
        }
        map.set(n.title, { ...n, inbox_group_count: 1 });
    }
    return Array.from(map.values());
}

function appDismissTarget(n: NotificationEntry): number | null {
    if (!n.can_remove || n.kind !== 'app') return null;
    if (typeof n.app_notification_id === 'number') return n.app_notification_id;
    return null;
}

function NotificationActions({ n }: { n: NotificationEntry }) {
    const inboxId = n.inbox_notification_id;
    const showMark = n.kind === 'inbox' && n.inbox_unread && typeof inboxId === 'number';
    const appId = appDismissTarget(n);

    if (!showMark && appId === null) return null;

    return (
        <div className="flex shrink-0">
            {showMark ? <MarkInboxNotificationReadButton notificationId={inboxId} /> : null}
            {appId !== null ? (
                <DismissNotificationButton kind="app" recordId={appId} appearance="seen" />
            ) : null}
        </div>
    );
}

export default function MobileNotifications({ notifications }: Props) {
    const [view, setView] = useState<ViewFilter>('unread');
    const [liveNotifications, setLiveNotifications] = useState(notifications);

    useEffect(() => {
        setLiveNotifications(notifications);
    }, [notifications]);

    useEffect(() => {
        const handleItemGone = (event: Event) => {
            const custom = event as CustomEvent<{ kind?: string; recordId?: number }>;
            const kind = custom.detail?.kind;
            const recordId = custom.detail?.recordId;
            if ((kind !== 'inbox' && kind !== 'app') || typeof recordId !== 'number') {
                return;
            }
            setLiveNotifications((prev) =>
                prev.filter((n) => {
                    if (kind === 'inbox') {
                        return n.inbox_notification_id !== recordId;
                    }
                    return n.app_notification_id !== recordId;
                }),
            );
        };
        window.addEventListener('ns:notification-item-gone', handleItemGone as EventListener);
        const handleMarkedRead = (event: Event) => {
            const recordId = (event as CustomEvent<{ recordId?: number }>).detail?.recordId;
            if (typeof recordId !== 'number') return;
            setLiveNotifications((prev) => {
                const hit = prev.find((n) => n.inbox_notification_id === recordId);
                if (!hit) {
                    return prev.map((n) =>
                        n.inbox_notification_id === recordId ? { ...n, inbox_unread: false } : n,
                    );
                }
                return prev.map((n) =>
                    n.kind === 'inbox' && n.title === hit.title ? { ...n, inbox_unread: false } : n,
                );
            });
        };
        window.addEventListener('ns:notification-marked-read', handleMarkedRead as EventListener);
        const handleMarkedAll = () => {
            setLiveNotifications((prev) =>
                prev.map((n) => (n.kind === 'inbox' ? { ...n, inbox_unread: false } : n)),
            );
        };
        window.addEventListener('ns:notifications-marked-all-read', handleMarkedAll);
        return () => {
            window.removeEventListener('ns:notification-item-gone', handleItemGone as EventListener);
            window.removeEventListener('ns:notification-marked-read', handleMarkedRead as EventListener);
            window.removeEventListener('ns:notifications-marked-all-read', handleMarkedAll);
        };
    }, []);

    const unreadGrouped = useMemo(() => groupUnreadByTitle(liveNotifications), [liveNotifications]);
    const unreadCount = unreadGrouped.length;

    const visible = useMemo(() => {
        if (view === 'all') return liveNotifications;
        return unreadGrouped;
    }, [liveNotifications, unreadGrouped, view]);

    return (
        <MobileLayout>
            <Head title="Notificações" />
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Notificações</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Itens <span className="font-medium text-amber-800 dark:text-amber-200">Para atender</span> pedem
                        ação; os <span className="font-medium text-zinc-700 dark:text-zinc-300">Informativos</span> são
                        avisos.
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {viewFilters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setView(f.key)}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                view === f.key
                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                            }`}
                        >
                            {f.label}
                            <span className="ml-1.5 tabular-nums opacity-80">
                                {f.key === 'unread' ? unreadCount : liveNotifications.length}
                            </span>
                        </button>
                    ))}
                </div>

                {visible.length === 0 ? (
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                            <BellAlertIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="font-semibold text-zinc-900 dark:text-white mb-2">
                            {view === 'unread'
                                ? liveNotifications.length > 0
                                    ? 'Nenhuma não lida'
                                    : 'Nenhuma notificação'
                                : 'Nenhuma notificação'}
                        </h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
                            {view === 'unread'
                                ? liveNotifications.length > 0
                                    ? 'Você já leu os avisos pessoais. Abra Todas para ver o histórico e os avisos da igreja.'
                                    : 'Quando houver avisos ou novidades, eles aparecerão aqui.'
                                : 'Quando houver avisos ou novidades, eles aparecerão aqui.'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {visible.map((n) => {
                            const groupCount =
                                view === 'unread' &&
                                typeof n.inbox_group_count === 'number' &&
                                n.inbox_group_count > 1
                                    ? n.inbox_group_count
                                    : 0;
                            const inner = (
                                <div className="flex gap-3">
                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${notificationIntentIconWrapClass(n.intent)}`}
                                    >
                                        {n.intent === 'action' ? (
                                            <ExclamationTriangleIcon className="h-6 w-6" />
                                        ) : (
                                            <BellAlertIcon className="h-6 w-6" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1.5">
                                            <NotificationIntentBadge intent={n.intent} />
                                        </div>
                                        <p
                                            className={`font-semibold ${
                                                n.intent === 'action'
                                                    ? 'text-base text-amber-950 dark:text-amber-50'
                                                    : 'text-zinc-900 dark:text-white'
                                            }`}
                                        >
                                            {n.title}
                                            {groupCount > 0 ? (
                                                <span className="ml-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                                    · {groupCount}
                                                </span>
                                            ) : null}
                                        </p>
                                        <p
                                            className={`mt-1 leading-relaxed ${
                                                n.intent === 'action'
                                                    ? 'text-sm text-amber-950/90 dark:text-amber-100/90'
                                                    : 'text-sm text-zinc-600 dark:text-zinc-400'
                                            }`}
                                        >
                                            {n.body}
                                        </p>
                                        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                                            {formatNotificationWhen(n.created_at)}
                                            {n.author?.name && ` · ${n.author.name}`}
                                            {n.kind === 'inbox' && ' · Pessoal'}
                                            {n.kind === 'inbox' && !n.inbox_unread ? ' · Lida' : null}
                                        </p>
                                    </div>
                                </div>
                            );

                            const hasActions =
                                (n.kind === 'inbox' && n.inbox_unread) ||
                                (view === 'all' && appDismissTarget(n) !== null);
                            const cardClass = notificationIntentSurfaceClass(
                                n.intent,
                                Boolean(n.kind === 'inbox' && n.inbox_unread),
                            );

                            if (n.href) {
                                return (
                                    <li key={n.id}>
                                        <div
                                            className={`flex overflow-hidden rounded-2xl border shadow-sm ${cardClass} ${
                                                n.intent === 'action' ? 'ring-1 ring-amber-300/60 dark:ring-amber-700/50' : ''
                                            }`}
                                        >
                                            <Link
                                                href={notificationLinkHref(n.href)}
                                                className="min-w-0 flex-1 cursor-pointer p-4 text-left transition-transform active:scale-[0.99]"
                                            >
                                                {inner}
                                            </Link>
                                            {hasActions ? <NotificationActions n={n} /> : null}
                                        </div>
                                    </li>
                                );
                            }

                            return (
                                <li key={n.id}>
                                    <div
                                        className={`flex overflow-hidden rounded-2xl border shadow-sm dark:bg-zinc-900 ${cardClass} ${
                                            n.intent === 'action' ? 'ring-1 ring-amber-300/60 dark:ring-amber-700/50' : ''
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1 p-4">{inner}</div>
                                        {hasActions ? <NotificationActions n={n} /> : null}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
