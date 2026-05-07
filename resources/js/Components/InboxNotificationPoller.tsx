import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

type InboxFeedItem = {
    id?: string;
    title: string;
    body: string;
    created_at: string;
    kind?: string;
};

type PollerPageProps = {
    auth?: { user?: unknown };
    recentNotifications?: InboxFeedItem[];
    unreadInboxNotificationsCount?: number;
};

/**
 * Atualiza o sino periodicamente e mostra um aviso quando surgem notificações
 * de caixa (inbox) por ler, sem depender de WebSockets.
 */
export default function InboxNotificationPoller() {
    const { auth, recentNotifications = [], unreadInboxNotificationsCount = 0 } =
        usePage().props as PollerPageProps;
    const prevUnread = useRef<number | null>(null);
    const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
    const [visible, setVisible] = useState(true);

    const isLoggedIn = Boolean(auth?.user);

    useEffect(() => {
        if (!isLoggedIn) {
            return;
        }

        if (prevUnread.current === null) {
            prevUnread.current = unreadInboxNotificationsCount;
            return;
        }

        if (unreadInboxNotificationsCount > prevUnread.current) {
            const inboxItems = recentNotifications
                .filter((n) => n.kind === 'inbox')
                .sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                );
            const head = inboxItems[0];
            setToast({
                title: head?.title ?? 'Nova notificação',
                body: head?.body ?? 'Abra o sino para ver as notificações por ler.',
            });
            setVisible(true);
        }

        prevUnread.current = unreadInboxNotificationsCount;
    }, [isLoggedIn, unreadInboxNotificationsCount, recentNotifications]);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const t = setTimeout(() => setVisible(false), 6000);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        if (!isLoggedIn) {
            return;
        }
        const poll = router.poll(
            45_000,
            {
                only: ['recentNotifications', 'unreadInboxNotificationsCount'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                async: true,
                showProgress: false,
            },
            { keepAlive: true, autoStart: true },
        );

        return () => poll.stop();
    }, [isLoggedIn]);

    if (!isLoggedIn || !toast || !visible) {
        return null;
    }

    return (
        <div className="fixed bottom-24 right-6 z-[60] pointer-events-none max-sm:left-4 max-sm:right-4 md:bottom-28">
            <div className="pointer-events-auto rounded-2xl border border-sky-800/80 bg-sky-950/90 px-4 py-3 text-sm text-sky-50 shadow-lg max-sm:max-w-none max-w-sm">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="font-medium text-sky-100">{toast.title}</p>
                        <p className="mt-0.5 text-sky-200/90">{toast.body}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setVisible(false)}
                        className="shrink-0 text-xs text-sky-300 hover:text-sky-50"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
