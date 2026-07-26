/** Atualiza o sino/lista sem visita Inertia (mantém o painel de notificações aberto). */

export type NotificationsFeedPayload = {
    recentNotifications: unknown[];
    unreadInboxNotificationsCount: number;
};

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
        (window as unknown as { Laravel?: { csrfToken?: string } }).Laravel?.csrfToken ??
        ''
    );
}

export function dispatchNotificationsFeed(payload: NotificationsFeedPayload): void {
    window.dispatchEvent(new CustomEvent('ns:notifications-feed', { detail: payload }));
}

export function dispatchNotificationItemGone(detail: {
    kind: 'inbox' | 'app';
    recordId: number;
}): void {
    window.dispatchEvent(new CustomEvent('ns:notification-item-gone', { detail }));
}

export async function refreshNotificationsFeed(): Promise<NotificationsFeedPayload | null> {
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
            return null;
        }
        const payload = (await res.json()) as {
            recentNotifications?: unknown[];
            unreadInboxNotificationsCount?: number;
        };
        const next: NotificationsFeedPayload = {
            recentNotifications: Array.isArray(payload.recentNotifications)
                ? payload.recentNotifications
                : [],
            unreadInboxNotificationsCount:
                typeof payload.unreadInboxNotificationsCount === 'number'
                    ? payload.unreadInboxNotificationsCount
                    : 0,
        };
        dispatchNotificationsFeed(next);

        return next;
    } catch {
        return null;
    }
}

async function postJson(url: string, body: Record<string, unknown>): Promise<boolean> {
    try {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrfToken(),
            },
            body: JSON.stringify(body),
        });

        return res.ok;
    } catch {
        return false;
    }
}

export async function markInboxNotificationReadRequest(notificationId: number): Promise<boolean> {
    const ok = await postJson(route('notifications.inbox.read'), { id: notificationId });
    if (ok) {
        window.dispatchEvent(
            new CustomEvent('ns:notification-marked-read', { detail: { recordId: notificationId } }),
        );
        await refreshNotificationsFeed();
    }

    return ok;
}

export async function markAllInboxNotificationsReadRequest(): Promise<boolean> {
    const ok = await postJson(route('notifications.inbox.read-all'), {});
    if (ok) {
        window.dispatchEvent(new CustomEvent('ns:notifications-marked-all-read'));
        await refreshNotificationsFeed();
    }

    return ok;
}

export async function removeNotificationRequest(
    kind: 'inbox' | 'app',
    recordId: number,
): Promise<boolean> {
    const ok = await postJson(route('notifications.remove'), { kind, id: recordId });
    if (ok) {
        dispatchNotificationItemGone({ kind, recordId });
        await refreshNotificationsFeed();
    }

    return ok;
}
