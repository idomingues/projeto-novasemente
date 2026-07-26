import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import { formatNotificationWhen } from '@/utils/formatNotificationWhen';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import DismissNotificationButton from '@/Components/DismissNotificationButton';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

interface NotificationEntry {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href: string;
    kind: string;
    inbox_notification_id?: number;
    inbox_unread?: boolean;
    app_notification_id?: number;
    can_remove?: boolean;
}

interface Props {
    notifications: NotificationEntry[];
}

type ViewFilter = 'unread' | 'all';

const viewFilters: { key: ViewFilter; label: string }[] = [
    { key: 'unread', label: 'Não lidas' },
    { key: 'all', label: 'Todas' },
];

function isUnread(n: NotificationEntry): boolean {
    if (n.kind === 'inbox') {
        return Boolean(n.inbox_unread);
    }
    // Avisos da igreja não têm "lida": enquanto não forem marcados como vistos, contam como não lidos.
    return n.kind === 'app';
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

    const visible = useMemo(() => {
        if (view === 'all') return notifications;
        return notifications.filter(isUnread);
    }, [notifications, view]);

    const unreadCount = useMemo(() => notifications.filter(isUnread).length, [notifications]);

    return (
        <MobileLayout>
            <Head title="Notificações" />
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Notificações</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Avisos da igreja e da sua conta</p>
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
                            {f.key === 'unread' && unreadCount > 0 ? (
                                <span className="ml-1.5 tabular-nums opacity-80">{unreadCount}</span>
                            ) : null}
                        </button>
                    ))}
                </div>

                {visible.length === 0 ? (
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                            <BellAlertIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="font-semibold text-zinc-900 dark:text-white mb-2">
                            {view === 'unread' && notifications.length > 0
                                ? 'Nenhuma não lida'
                                : 'Nenhuma notificação'}
                        </h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
                            {view === 'unread' && notifications.length > 0
                                ? 'Você já viu todos os avisos. Use a tag Todas para revisá-los.'
                                : 'Quando houver avisos ou novidades, eles aparecerão aqui.'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {visible.map((n) => {
                            const inner = (
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                        <BellAlertIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-zinc-900 dark:text-white">{n.title}</p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{n.body}</p>
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
                                (n.kind === 'inbox' && n.inbox_unread) || appDismissTarget(n) !== null;
                            const cardClass =
                                n.kind === 'inbox' && n.inbox_unread
                                    ? 'border-primary-200 dark:border-primary-900'
                                    : 'border-zinc-200 dark:border-zinc-800';

                            if (n.href) {
                                return (
                                    <li key={n.id}>
                                        <div
                                            className={`flex overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900 ${cardClass}`}
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
                                        className={`flex overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900 ${cardClass}`}
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
