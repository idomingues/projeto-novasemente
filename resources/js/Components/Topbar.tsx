import { Link, usePage } from '@inertiajs/react';
import { notificationLinkHref } from '@/utils/notificationLinkHref';
import {
    BellIcon,
    SunIcon,
    MoonIcon,
    NewspaperIcon,
    CalendarDaysIcon,
    Squares2X2Icon,
    ChevronRightIcon,
    LifebuoyIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import Dropdown from '@/Components/Dropdown';
import MarkInboxNotificationReadButton from '@/Components/MarkInboxNotificationReadButton';
import AppVersionTrigger from '@/Components/AppVersionTrigger';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import { useTheme } from '@/Contexts/ThemeContext';

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
}

function formatTimeAgo(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (sec < 60) return 'Agora';
    if (sec < 3600) return `${Math.floor(sec / 60)} min`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} h`;
    if (sec < 2592000) return `${Math.floor(sec / 86400)} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const appNavItems = [
    { name: 'News', route: 'mobile.news', icon: NewspaperIcon },
    { name: 'Batismo', route: 'mobile.baptism', icon: SparklesIcon },
    { name: 'Eventos', route: 'mobile.events', icon: CalendarDaysIcon },
    { name: 'Oração', route: 'mobile.prayer', icon: PrayingHandsIcon },
    { name: 'Mais', route: 'more.index', icon: Squares2X2Icon },
] as const;

interface TopbarProps {
    onMenuClick?: () => void;
    hasSidebar?: boolean;
}

interface AuthUser {
    name: string;
}

type PageProps = {
    auth: {
        user?: AuthUser | null;
        roleLabel?: string;
        permissions?: string[];
        adminSidebarUnrestricted?: boolean;
    };
    recentNotifications?: NotificationItem[];
    unreadInboxNotificationsCount?: number;
};

export default function Topbar({ onMenuClick, hasSidebar = true }: TopbarProps) {
    const { auth, recentNotifications = [], unreadInboxNotificationsCount = 0 } = usePage().props as PageProps;
    const user = auth?.user ?? null;
    const permissions = auth?.permissions ?? [];
    const adminSidebarUnrestricted = auth?.adminSidebarUnrestricted === true;
    const notifications = Array.isArray(recentNotifications) ? recentNotifications : [];
    const unread = typeof unreadInboxNotificationsCount === 'number' ? unreadInboxNotificationsCount : 0;
    /** Número no sino: notificações de caixa por ler (servidor). */
    const badgeCount = unread > 0 ? Math.min(99, unread) : 0;
    const showRecentDot = badgeCount === 0 && notifications.length > 0;
    const roleLabel = auth?.roleLabel ?? 'Utilizador';
    const { theme, toggleTheme } = useTheme();
    const canAccessSupportAdmin =
        adminSidebarUnrestricted || permissions.includes('support.view') || permissions.includes('support.manage');
    const supportRouteName =
        canAccessSupportAdmin && route().has('support.index') ? 'support.index' : 'mobile.support.index';

    return (
        <header className={`bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 h-16 md:h-24 fixed top-0 right-0 left-0 z-40 transition-all duration-300 ${hasSidebar ? 'md:left-72' : ''}`}>
            <div className="flex items-center justify-between h-full px-4 md:px-8">
                {/* Menu button (mobile) + Search / Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {hasSidebar && (
                        <button
                            type="button"
                            onClick={onMenuClick}
                            className="md:hidden p-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
                            aria-label="Abrir menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
                    <div className="hidden">
                        {appNavItems.map(({ name, route: routeName, icon: Icon }) => (
                            <Link
                                key={routeName}
                                href={route(routeName)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium">{name}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="md:hidden flex-1 min-w-0" />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 sm:gap-4">
                    <AppVersionTrigger className="flex-shrink-0" />

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
                            <Link
                                href={route(supportRouteName)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                aria-label="Suporte do app"
                                title="Suporte do app"
                            >
                                <LifebuoyIcon className="w-5 h-5" />
                            </Link>

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
                                    contentClasses="py-0 max-h-[min(70vh,400px)] overflow-hidden flex min-w-0 flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                                >
                                    <div className="flex min-w-0 items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800 sm:gap-3 sm:px-4 sm:py-3">
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
                                            className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-zinc-100 dark:text-primary-400 dark:hover:bg-zinc-800 sm:text-sm"
                                        >
                                            <span className="hidden sm:inline">Ver todas</span>
                                            <span className="sm:hidden">Todas</span>
                                            <ChevronRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        </Link>
                                        <Dropdown.CloseButton />
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                                Nenhuma notificação
                                            </div>
                                        ) : (
                                            notifications.map((n) => {
                                                const rawHref = n.href ?? route('varios.notifications');
                                                const href =
                                                    n.kind === 'inbox' ? notificationLinkHref(rawHref) : rawHref;
                                                const Row = (
                                                    <>
                                                        <p className="font-medium text-zinc-900 dark:text-white text-sm line-clamp-1">
                                                            {n.title}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                                            {n.body}
                                                        </p>
                                                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                                            {formatTimeAgo(n.created_at)}
                                                        </p>
                                                    </>
                                                );
                                                const inboxId = n.inbox_notification_id;
                                                const showMark =
                                                    n.kind === 'inbox' &&
                                                    n.inbox_unread &&
                                                    typeof inboxId === 'number';

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
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>

                            <Link
                                href={route('mobile.profile')}
                                className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 focus:outline-none group"
                                aria-label="Abrir meu perfil"
                                title="Meu perfil"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">{user.name}</p>
                                    <p className="text-xs text-zinc-500">{roleLabel}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm ring-4 ring-zinc-100 dark:ring-zinc-900 group-hover:ring-zinc-200 dark:group-hover:ring-zinc-800 transition-all">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
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
