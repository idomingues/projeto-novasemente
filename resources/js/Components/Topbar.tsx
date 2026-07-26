import { Link, usePage } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import { formatNotificationWhen } from '@/utils/formatNotificationWhen';
import { BellIcon, SunIcon, MoonIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Dropdown from '@/Components/Dropdown';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import DismissNotificationButton from '@/Components/DismissNotificationButton';
import TopbarEventsLink from '@/Components/TopbarEventsLink';
import { useTheme } from '@/Contexts/ThemeContext';
import { useEffect, useState } from 'react';

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href?: string;
    kind?: string;
    inbox_notification_id?: number;
    inbox_unread?: boolean;
    app_notification_id?: number;
    can_remove?: boolean;
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
    const { auth, recentNotifications = [], unreadInboxNotificationsCount = 0 } = usePage().props as PageProps;
    const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>(
        Array.isArray(recentNotifications) ? recentNotifications : [],
    );
    const [liveUnread, setLiveUnread] = useState<number>(
        typeof unreadInboxNotificationsCount === 'number' ? unreadInboxNotificationsCount : 0,
    );
    const user = auth?.user ?? null;
    const permissions = auth?.permissions ?? [];
    const adminSidebarUnrestricted = auth?.adminSidebarUnrestricted === true;
    const notifications = liveNotifications;
    const unread = liveUnread;
    /** Número no sino: notificações de caixa por ler (servidor). */
    const badgeCount = unread > 0 ? Math.min(99, unread) : 0;
    const showRecentDot = badgeCount === 0 && notifications.length > 0;
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

        window.addEventListener('ns:notifications-feed', handleFeedUpdate as EventListener);
        return () => {
            window.removeEventListener('ns:notifications-feed', handleFeedUpdate as EventListener);
        };
    }, []);

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
                                    contentClasses="py-0 max-h-[min(70vh,400px)] overflow-hidden flex min-h-0 min-w-0 flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                                >
                                    <div className="flex shrink-0 min-w-0 items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800 sm:gap-3 sm:px-4 sm:py-3">
                                        <div className="min-w-0 flex-1">
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="truncate font-semibold text-zinc-900 dark:text-white">
                                                    Notificações
                                                </span>
                                                {unread > 0 ? (
                                                    <span className="shrink-0 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold tabular-nums text-white dark:bg-rose-500">
                                                        {unread > 99 ? '99+' : unread}
                                                    </span>
                                                ) : null}
                                            </span>
                                        </div>
                                        <Link
                                            href={route('varios.notifications')}
                                            className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-zinc-100 dark:text-primary-400 dark:hover:bg-zinc-800 sm:text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="hidden sm:inline">Ver todas</span>
                                            <span className="sm:hidden">Todas</span>
                                            <ChevronRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        </Link>
                                        <Dropdown.CloseButton />
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                                Nenhuma notificação
                                            </div>
                                        ) : (
                                            notifications.map((n) => {
                                                const rawHref = n.href ?? route('varios.notifications');
                                                const href = notificationLinkHref(rawHref);
                                                const Row = (
                                                    <>
                                                        <p className="font-medium text-zinc-900 dark:text-white text-sm line-clamp-1">
                                                            {n.title}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                                            {n.body}
                                                        </p>
                                                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                                            {formatNotificationWhen(n.created_at)}
                                                        </p>
                                                    </>
                                                );
                                                const inboxId = n.inbox_notification_id;
                                                const showMark =
                                                    n.kind === 'inbox' &&
                                                    n.inbox_unread &&
                                                    typeof inboxId === 'number';
                                                const removeTarget =
                                                    n.can_remove && n.kind === 'inbox' && typeof inboxId === 'number'
                                                        ? ({ kind: 'inbox' as const, id: inboxId })
                                                        : n.can_remove &&
                                                            n.kind === 'app' &&
                                                            typeof n.app_notification_id === 'number'
                                                          ? ({ kind: 'app' as const, id: n.app_notification_id })
                                                          : null;

                                                return (
                                                    <div
                                                        key={n.id}
                                                        className="flex border-b border-zinc-100 dark:border-zinc-800/50"
                                                    >
                                                        <Link
                                                            href={href}
                                                            className="min-w-0 flex-1 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                        >
                                                            {Row}
                                                        </Link>
                                                        {showMark ? (
                                                            <MarkInboxNotificationReadButton notificationId={inboxId} />
                                                        ) : null}
                                                        {removeTarget ? (
                                                            <DismissNotificationButton
                                                                kind={removeTarget.kind}
                                                                recordId={removeTarget.id}
                                                            />
                                                        ) : null}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>

                            <Link
                                href={profileHref}
                                className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 focus:outline-none group"
                                aria-label="Abrir meu perfil"
                                title="Meu perfil"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">{user.name}</p>
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
