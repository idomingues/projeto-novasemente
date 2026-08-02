import { Link, usePage } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import { formatNotificationWhen } from '@/utils/formatNotificationWhen';
import { isActionNotificationIntent } from '@/utils/notificationIntent';
import {
    BellAlertIcon,
    BellIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
    MoonIcon,
    SunIcon,
} from '@heroicons/react/24/outline';
import Dropdown from '@/Components/Dropdown';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import NotificationIntentBadge from '@/Components/NotificationIntentBadge';
import TopbarEventsLink from '@/Components/TopbarEventsLink';
import { useTheme } from '@/Contexts/ThemeContext';
import { useEffect, useMemo, useState } from 'react';
import { markAllInboxNotificationsReadRequest } from '@/utils/notificationFeedActions';

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href?: string;
    kind?: string;
    intent?: string;
    inbox_notification_id?: number;
    inbox_unread?: boolean;
    app_notification_id?: number;
    can_remove?: boolean;
    inbox_group_count?: number;
}

interface TopbarProps {
    onMenuClick?: () => void;
}

interface AuthUser {
    name: string;
    photo_url?: string | null;
    is_ministry_leader?: boolean;
}

type PageProps = {
    auth: {
        user?: AuthUser | null;
        roleLabel?: string;
        permissions?: string[];
        adminSidebarUnrestricted?: boolean;
        isMinistryLeaderAccount?: boolean;
    };
    recentNotifications?: NotificationItem[];
    unreadInboxNotificationsCount?: number;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
    const page = usePage();
    const { auth, recentNotifications = [], unreadInboxNotificationsCount = 0 } = page.props as PageProps;
    // NS Conecta usa header próprio — nunca mostrar a Topbar global nesse módulo.
    const isNsConecta =
        (typeof page.component === 'string' && page.component.startsWith('Mobile/NsWhats/')) ||
        (typeof page.url === 'string' &&
            (page.url.startsWith('/mobile/ns-whats') || page.url.includes('/mobile/ns-whats?')));
    const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>(
        Array.isArray(recentNotifications) ? recentNotifications : [],
    );
    const [liveUnread, setLiveUnread] = useState<number>(
        typeof unreadInboxNotificationsCount === 'number' ? unreadInboxNotificationsCount : 0,
    );
    const user = auth?.user ?? null;
    const [markingAll, setMarkingAll] = useState(false);
    /** Sino: só tipos de aviso pessoal ainda não lidos (ordem cronológica). */
    const notifications = useMemo(() => {
        const items = liveNotifications.filter(
            (n) => n.kind === 'inbox' && Boolean(n.inbox_unread),
        );
        return [...items].sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return tb - ta;
        });
    }, [liveNotifications]);
    const actionCount = useMemo(
        () => notifications.filter((n) => isActionNotificationIntent(n.intent)).length,
        [notifications],
    );
    const unread = liveUnread;
    /** Número no sino: tipos de caixa pessoal não lida (não o total de linhas). */
    const badgeCount = unread > 0 ? Math.min(99, unread) : 0;
    const showRecentDot = false;
    const roleLabel = auth?.roleLabel ?? 'Membro';
    const isMinistryLeader = auth?.isMinistryLeaderAccount === true || user?.is_ministry_leader === true;
    /** Evita duplicar com o pill cinza quando o papel principal já é «Líder de ministério». */
    const showMinistryLeaderAccentBadge = isMinistryLeader && roleLabel !== 'Líder de ministério';
    const { theme, toggleTheme } = useTheme();
    /** Hub de perfil (opções); evita ir direto ao formulário Breeze no PC. */
    const profileHref = route().has('mobile.profile') ? route('mobile.profile') : route('profile.edit');

    useEffect(() => {
        setLiveNotifications(Array.isArray(recentNotifications) ? recentNotifications : []);
    }, [recentNotifications]);

    useEffect(() => {
        setLiveUnread(typeof unreadInboxNotificationsCount === 'number' ? unreadInboxNotificationsCount : 0);
    }, [unreadInboxNotificationsCount]);

    useEffect(() => {
        const handleFeedUpdate = (event: Event) => {
            const custom = event as CustomEvent<{
                recentNotifications?: NotificationItem[];
                unreadInboxNotificationsCount?: number;
            }>;
            const detail = custom.detail;
            if (!detail) {
                return;
            }
            if (Array.isArray(detail.recentNotifications)) {
                setLiveNotifications(detail.recentNotifications);
            }
            if (typeof detail.unreadInboxNotificationsCount === 'number') {
                setLiveUnread(detail.unreadInboxNotificationsCount);
            }
        };

        const handleMarkedRead = (event: Event) => {
            const recordId = (event as CustomEvent<{ recordId?: number }>).detail?.recordId;
            if (typeof recordId !== 'number') return;
            setLiveNotifications((prev) => {
                const hit = prev.find((n) => n.inbox_notification_id === recordId);
                if (!hit) {
                    return prev.filter((n) => n.inbox_notification_id !== recordId);
                }
                // Mesmo título = mesmo grupo (o POST já marcou todas).
                return prev.filter((n) => n.title !== hit.title);
            });
            setLiveUnread((count) => Math.max(0, count - 1));
        };

        const handleMarkedAll = () => {
            setLiveNotifications([]);
            setLiveUnread(0);
        };

        window.addEventListener('ns:notifications-feed', handleFeedUpdate as EventListener);
        window.addEventListener('ns:notification-marked-read', handleMarkedRead as EventListener);
        window.addEventListener('ns:notifications-marked-all-read', handleMarkedAll);
        return () => {
            window.removeEventListener('ns:notifications-feed', handleFeedUpdate as EventListener);
            window.removeEventListener('ns:notification-marked-read', handleMarkedRead as EventListener);
            window.removeEventListener('ns:notifications-marked-all-read', handleMarkedAll);
        };
    }, []);

    const markAllRead = async () => {
        if (markingAll || unread <= 0) return;
        setMarkingAll(true);
        try {
            await markAllInboxNotificationsReadRequest();
        } finally {
            setMarkingAll(false);
        }
    };

    if (isNsConecta) {
        return null;
    }

    return (
        <header
            className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 fixed top-0 right-0 left-0 z-40 transition-all duration-300 h-[calc(4rem+env(safe-area-inset-top,0px))] md:h-[calc(6rem+env(safe-area-inset-top,0px))]"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="flex items-center justify-between h-16 md:h-24 px-4 md:px-8">
                {/* Menu button (mobile) + Search / Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {onMenuClick ? (
                        <button
                            type="button"
                            onClick={onMenuClick}
                            className="flex-shrink-0 rounded-xl p-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            aria-label="Abrir menu lateral"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    ) : null}
                    <div className="flex-1 min-w-0" />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 sm:gap-4">
                    <TopbarEventsLink className="flex-shrink-0" />

                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        {theme === 'dark' ? (
                            <SunIcon className="w-5 h-5" />
                        ) : (
                            <MoonIcon className="w-5 h-5" />
                        )}
                    </button>

                    {user ? (
                        <>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                                        aria-label={
                                            badgeCount > 0
                                                ? `Notificações, ${badgeCount} por ler`
                                                : showRecentDot
                                                  ? 'Notificações (ver recentes)'
                                                  : 'Notificações'
                                        }
                                    >
                                        <BellIcon className="h-5 w-5" />
                                        {badgeCount > 0 ? (
                                            <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
                                                {badgeCount > 99 ? '99+' : badgeCount}
                                            </span>
                                        ) : showRecentDot ? (
                                            <span
                                                className="absolute right-1 top-1 z-10 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900"
                                                aria-hidden
                                            />
                                        ) : null}
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content
                                    align="right"
                                    width="96"
                                    viewport
                                    contentClasses="!ring-0 border-0 py-0 max-h-[min(78vh,520px)] overflow-hidden flex min-h-0 min-w-0 flex-col rounded-2xl bg-white shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-zinc-700/80 text-zinc-700 dark:text-zinc-300"
                                >
                                    <div className="shrink-0 border-b border-zinc-100 bg-gradient-to-b from-zinc-50/90 to-white px-4 py-3 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900">
                                        <div className="flex min-w-0 items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
                                                    Notificações
                                                </h2>
                                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {unread > 0
                                                        ? `${unread} para revisar`
                                                        : 'Tudo em dia'}
                                                    {actionCount > 0 ? ` · ${actionCount} para atender` : ''}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                {unread > 0 ? (
                                                    <span className="mr-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold tabular-nums text-white shadow-sm shadow-rose-600/25">
                                                        {unread > 99 ? '99+' : unread}
                                                    </span>
                                                ) : null}
                                                <Dropdown.CloseButton />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {unread > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        void markAllRead();
                                                    }}
                                                    disabled={markingAll}
                                                    className="inline-flex cursor-pointer items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                                                >
                                                    {markingAll ? 'Marcando…' : 'Marcar todas'}
                                                </button>
                                            ) : null}
                                            <Link
                                                href={route('varios.notifications')}
                                                className="inline-flex cursor-pointer items-center gap-0.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Ver todas
                                                <ChevronRightIcon className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center px-6 py-12 text-center">
                                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                                                    <BellIcon className="h-6 w-6" />
                                                </div>
                                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                                    Nenhuma notificação
                                                </p>
                                                <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    Quando algo precisar da sua atenção, aparece aqui.
                                                </p>
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                                {notifications.map((n) => (
                                                    <TopbarNotificationRow key={n.id} n={n} />
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>

                            <Link
                                href={profileHref}
                                className="group flex cursor-pointer items-center gap-3 border-l border-zinc-200 pl-4 focus:outline-none dark:border-zinc-800"
                                aria-label="Abrir meu perfil"
                                title="Meu perfil"
                            >
                                <div className="hidden text-right sm:block">
                                    <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300">
                                        {user.name}
                                    </p>
                                    <div className="mt-0.5 flex items-center justify-end gap-1.5">
                                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800">
                                            {roleLabel}
                                        </span>
                                        {showMinistryLeaderAccentBadge ? (
                                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
                                                Líder de ministério
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                {user.photo_url ? (
                                    <img
                                        src={user.photo_url}
                                        alt=""
                                        className="h-10 w-10 rounded-full object-cover ring-4 ring-zinc-100 transition-all group-hover:ring-zinc-200 dark:ring-zinc-900 dark:group-hover:ring-zinc-800"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white ring-4 ring-zinc-100 transition-all group-hover:ring-zinc-200 dark:bg-zinc-700 dark:text-white dark:ring-zinc-900 dark:group-hover:ring-zinc-800">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </Link>
                        </>
                    ) : (
                        <Link
                            href={route('login')}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-l border-zinc-200 dark:border-zinc-800 pl-6"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}

function TopbarNotificationRow({ n }: { n: NotificationItem }) {
    const action = isActionNotificationIntent(n.intent);
    const rawHref = n.href ?? route('varios.notifications');
    const href = notificationLinkHref(rawHref);
    const groupCount =
        typeof n.inbox_group_count === 'number' && n.inbox_group_count > 1 ? n.inbox_group_count : 0;
    const inboxId = n.inbox_notification_id;
    const showMark = n.kind === 'inbox' && n.inbox_unread && typeof inboxId === 'number';

    return (
        <li
            className={`group flex transition-colors ${
                action
                    ? 'bg-gradient-to-r from-amber-50/70 via-white to-white hover:from-amber-50 dark:from-amber-950/25 dark:via-zinc-900 dark:to-zinc-900 dark:hover:from-amber-950/40'
                    : 'bg-white hover:bg-zinc-50/90 dark:bg-zinc-900 dark:hover:bg-zinc-800/50'
            }`}
        >
            <Link
                href={href}
                className="relative flex min-w-0 flex-1 cursor-pointer gap-3 px-4 py-3.5 text-left"
            >
                {action ? (
                    <span
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-500/90 dark:bg-amber-400/80"
                        aria-hidden
                    />
                ) : null}
                <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        action
                            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-900/45 dark:text-amber-200 dark:ring-amber-800/40'
                            : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/50'
                    }`}
                >
                    {action ? (
                        <ExclamationTriangleIcon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                    ) : (
                        <BellAlertIcon className="h-[18px] w-[18px]" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="mb-1">
                        <NotificationIntentBadge intent={n.intent} size="compact" />
                    </div>
                    <p
                        className={`line-clamp-1 text-[13px] leading-snug ${
                            action
                                ? 'font-semibold text-zinc-900 dark:text-amber-50'
                                : 'font-medium text-zinc-900 dark:text-zinc-100'
                        }`}
                    >
                        {n.title}
                        {groupCount > 0 ? (
                            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[10px] font-bold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {groupCount}
                            </span>
                        ) : null}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {n.body}
                    </p>
                    <p className="mt-1.5 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                        {formatNotificationWhen(n.created_at)}
                    </p>
                </div>
            </Link>
            {showMark ? <MarkInboxNotificationReadButton notificationId={inboxId} /> : null}
        </li>
    );
}
