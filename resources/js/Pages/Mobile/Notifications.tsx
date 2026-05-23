import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import DismissNotificationButton from '@/Components/DismissNotificationButton';
import { BellAlertIcon } from '@heroicons/react/24/outline';

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

function formatTimeAgo(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (sec < 60) return 'Agora';
    if (sec < 3600) return `${Math.floor(sec / 60)} min`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} h`;
    if (sec < 2592000) return `${Math.floor(sec / 86400)} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function removeTarget(n: NotificationEntry): { kind: 'inbox' | 'app'; id: number } | null {
    if (!n.can_remove) return null;
    if (n.kind === 'inbox' && typeof n.inbox_notification_id === 'number') {
        return { kind: 'inbox', id: n.inbox_notification_id };
    }
    if (n.kind === 'app' && typeof n.app_notification_id === 'number') {
        return { kind: 'app', id: n.app_notification_id };
    }
    return null;
}

function NotificationActions({ n }: { n: NotificationEntry }) {
    const target = removeTarget(n);
    const inboxId = n.inbox_notification_id;
    const showMark = n.kind === 'inbox' && n.inbox_unread && typeof inboxId === 'number';

    if (!showMark && !target) return null;

    return (
        <div className="flex shrink-0">
            {showMark ? <MarkInboxNotificationReadButton notificationId={inboxId} /> : null}
            {target ? <DismissNotificationButton kind={target.kind} recordId={target.id} /> : null}
        </div>
    );
}

export default function MobileNotifications({ notifications }: Props) {
    return (
        <MobileLayout>
            <Head title="Notificações" />
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Notificações</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Avisos da igreja e da sua conta</p>
                </div>

                {notifications.length === 0 ? (
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                            <BellAlertIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="font-semibold text-zinc-900 dark:text-white mb-2">Nenhuma notificação</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
                            Quando houver avisos ou novidades, eles aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {notifications.map((n) => {
                            const inner = (
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                        <BellAlertIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-zinc-900 dark:text-white">{n.title}</p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{n.body}</p>
                                        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                                            {formatTimeAgo(n.created_at)}
                                            {n.author?.name && ` · ${n.author.name}`}
                                            {n.kind === 'inbox' && ' · Pessoal'}
                                        </p>
                                    </div>
                                </div>
                            );

                            const hasActions = removeTarget(n) !== null || (n.kind === 'inbox' && n.inbox_unread);
                            const cardClass =
                                n.kind === 'inbox'
                                    ? 'border-primary-200 dark:border-primary-900'
                                    : 'border-zinc-200 dark:border-zinc-800';

                            if (n.kind === 'inbox' && n.href) {
                                return (
                                    <li key={n.id}>
                                        <div
                                            className={`flex overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900 ${cardClass}`}
                                        >
                                            <Link
                                                href={notificationLinkHref(n.href)}
                                                className="min-w-0 flex-1 p-4 text-left transition-transform active:scale-[0.99]"
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
