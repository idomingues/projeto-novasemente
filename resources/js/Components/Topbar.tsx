import { Link, usePage } from '@inertiajs/react';
import { BellIcon, SunIcon, MoonIcon, FilmIcon, NewspaperIcon, CalendarDaysIcon, HandRaisedIcon, Squares2X2Icon, ChevronRightIcon, LifebuoyIcon } from '@heroicons/react/24/outline';
import Dropdown from '@/Components/Dropdown';
import AppVersionTrigger from '@/Components/AppVersionTrigger';
import { useTheme } from '@/Contexts/ThemeContext';

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    created_at: string;
    author: { name: string } | null;
    href?: string;
    kind?: string;
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
    { name: 'Culto', route: 'mobile.culto', icon: FilmIcon },
    { name: 'Notícias', route: 'mobile.news', icon: NewspaperIcon },
    { name: 'Eventos', route: 'mobile.events', icon: CalendarDaysIcon },
    { name: 'Dízimos e Ofertas', route: 'mobile.offerings', icon: HandRaisedIcon },
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
    auth: { user?: AuthUser | null; roleLabel?: string };
    recentNotifications?: NotificationItem[];
    unreadInboxNotificationsCount?: number;
};

export default function Topbar({ onMenuClick, hasSidebar = true }: TopbarProps) {
    const { auth, recentNotifications = [], unreadInboxNotificationsCount = 0 } = usePage().props as PageProps;
    const user = auth?.user ?? null;
    const notifications = Array.isArray(recentNotifications) ? recentNotifications : [];
    const unread = typeof unreadInboxNotificationsCount === 'number' ? unreadInboxNotificationsCount : 0;
    const badgeCount = unread > 0 ? unread : notifications.length > 0 ? 1 : 0;
    const roleLabel = auth?.roleLabel ?? 'Utilizador';
    const { theme, toggleTheme } = useTheme();
    const supportRouteName = route().has('support.index') ? 'support.index' : 'mobile.support.index';

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
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        {theme === 'dark' ? (
                            <SunIcon className="w-6 h-6" />
                        ) : (
                            <MoonIcon className="w-6 h-6" />
                        )}
                    </button>

                    {user ? (
                        <>
                            <Link
                                href={route(supportRouteName)}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                aria-label="Suporte"
                                title="Suporte"
                            >
                                <LifebuoyIcon className="w-6 h-6" />
                            </Link>

                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors relative"
                                        aria-label="Notificações"
                                    >
                                        <BellIcon className="w-6 h-6" />
                                        {badgeCount > 0 && (
                                            <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary-500 text-white text-xs font-semibold rounded-full border-2 border-white dark:border-zinc-900">
                                                {badgeCount > 9 ? '9+' : badgeCount}
                                            </span>
                                        )}
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content align="right" width="96" contentClasses="py-0 max-h-[min(70vh,400px)] overflow-hidden flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                        <span className="font-semibold text-zinc-900 dark:text-white">Notificações</span>
                                        <Link
                                            href={route('varios.notifications')}
                                            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5"
                                        >
                                            Ver todas
                                            <ChevronRightIcon className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                                Nenhuma notificação
                                            </div>
                                        ) : (
                                            notifications.map((n) => {
                                                const href = n.href ?? route('varios.notifications');
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
                                                if (n.kind === 'inbox' && n.href) {
                                                    return (
                                                        <a
                                                            key={n.id}
                                                            href={href}
                                                            className="block px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                                        >
                                                            {Row}
                                                        </a>
                                                    );
                                                }
                                                return (
                                                    <Link
                                                        key={n.id}
                                                        href={href}
                                                        className="block px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                                    >
                                                        {Row}
                                                    </Link>
                                                );
                                            })
                                        )}
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>

                            <div className="relative">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button
                                            type="button"
                                            className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 focus:outline-none group"
                                        >
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">{user.name}</p>
                                                <p className="text-xs text-zinc-500">{roleLabel}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm ring-4 ring-zinc-100 dark:ring-zinc-900 group-hover:ring-zinc-200 dark:group-hover:ring-zinc-800 transition-all">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        </button>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content contentClasses="py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                                        <Dropdown.Link href={route(supportRouteName)} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white">Suporte</Dropdown.Link>
                                        <Dropdown.Link href={route('profile.edit')} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white">Perfil</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white">
                                            Sair
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
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
