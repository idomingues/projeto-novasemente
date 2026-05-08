import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

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
    const [liveRecentNotifications, setLiveRecentNotifications] = useState<InboxFeedItem[]>(recentNotifications);
    const [liveUnreadInboxCount, setLiveUnreadInboxCount] = useState<number>(unreadInboxNotificationsCount);

    const isLoggedIn = Boolean(auth?.user);

    useEffect(() => {
        setLiveRecentNotifications(recentNotifications);
    }, [recentNotifications]);

    useEffect(() => {
        setLiveUnreadInboxCount(unreadInboxNotificationsCount);
    }, [unreadInboxNotificationsCount]);

    useEffect(() => {
        if (!isLoggedIn) {
            return;
        }

        if (prevUnread.current === null) {
            prevUnread.current = liveUnreadInboxCount;
            return;
        }

        if (liveUnreadInboxCount > prevUnread.current) {
            const inboxItems = liveRecentNotifications
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

        prevUnread.current = liveUnreadInboxCount;
    }, [isLoggedIn, liveUnreadInboxCount, liveRecentNotifications]);

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
        let cancelled = false;
        let timer: number | null = null;

        const dispatchFeedUpdate = (payload: {
            recentNotifications: InboxFeedItem[];
            unreadInboxNotificationsCount: number;
        }) => {
            if (typeof window === 'undefined') {
                return;
            }
            window.dispatchEvent(new CustomEvent('ns:notifications-feed', { detail: payload }));
        };

        const fetchFeed = async () => {
            try {
                const res = await fetch(route('notifications.feed'), {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                if (!res.ok) {
                    return;
                }
                const payload = (await res.json()) as {
                    recentNotifications?: InboxFeedItem[];
                    unreadInboxNotificationsCount?: number;
                };
                if (cancelled) {
                    return;
                }

                const nextRecent = Array.isArray(payload.recentNotifications)
                    ? payload.recentNotifications
                    : [];
                const nextUnread = typeof payload.unreadInboxNotificationsCount === 'number'
                    ? payload.unreadInboxNotificationsCount
                    : 0;

                setLiveRecentNotifications(nextRecent);
                setLiveUnreadInboxCount(nextUnread);
                dispatchFeedUpdate({
                    recentNotifications: nextRecent,
                    unreadInboxNotificationsCount: nextUnread,
                });
            } catch {
                // Mantém silencioso; próxima rodada tenta novamente.
            }
        };

        void fetchFeed();
        timer = window.setInterval(() => {
            void fetchFeed();
        }, 45_000);

        return () => {
            cancelled = true;
            if (timer !== null) {
                window.clearInterval(timer);
            }
        };
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
