import { PropsWithChildren, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    FilmIcon,
    NewspaperIcon,
    CalendarDaysIcon,
    Cog6ToothIcon,
    HandRaisedIcon,
    Squares2X2Icon,
    Bars3Icon,
    XMarkIcon,
    HomeIcon,
    UserGroupIcon,
    UsersIcon,
    BuildingOfficeIcon,
    BuildingOffice2Icon,
    ArchiveBoxIcon,
    CalendarIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';
import {
    FilmIcon as FilmIconSolid,
    NewspaperIcon as NewspaperIconSolid,
    CalendarDaysIcon as CalendarDaysIconSolid,
    HandRaisedIcon as HandRaisedIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';
import FlashMessages from '@/Components/FlashMessages';

const adminRouteToPermissions: Record<string, string[]> = {
    dashboard: [],
    'members.index': ['members.view', 'members.manage'],
    'departments.index': ['departments.view', 'departments.manage'],
    'escalas.index': ['escalas.view', 'escalas.manage'],
    'volunteers.index': ['volunteers.view', 'volunteers.manage'],
    'rooms.index': ['rooms.view', 'rooms.manage'],
    'inventory.index': ['inventory.view', 'inventory.manage'],
    'users.index': ['users.view', 'users.manage'],
    'roles.index': ['roles.manage'],
    'news.index': ['news.view', 'news.manage'],
    'events.index': ['events.view', 'events.manage'],
    'culto.index': ['culto.manage'],
    'churches.index': ['churches.manage'],
    'settings.index': [],
};

const adminMenuItems = [
    { name: 'Dashboard', route: 'dashboard', icon: HomeIcon },
    { name: 'Eventos', route: 'events.index', icon: CalendarDaysIcon },
    { name: 'Membros', route: 'members.index', icon: UserGroupIcon },
    { name: 'Departamentos', route: 'departments.index', icon: BuildingOffice2Icon },
    { name: 'Escalas', route: 'escalas.index', icon: CalendarIcon },
    { name: 'Voluntários', route: 'volunteers.index', icon: UsersIcon },
    { name: 'Usuários', route: 'users.index', icon: KeyIcon },
    { name: 'Perfis', route: 'roles.index', icon: KeyIcon },
    { name: 'Salas', route: 'rooms.index', icon: BuildingOfficeIcon },
    { name: 'Inventário', route: 'inventory.index', icon: ArchiveBoxIcon },
    { name: 'Notícias', route: 'news.index', icon: NewspaperIcon },
    { name: 'Culto', route: 'culto.index', icon: FilmIcon },
    { name: 'Igrejas', route: 'churches.index', icon: BuildingOfficeIcon },
    { name: 'Configurações', route: 'settings.index', icon: Cog6ToothIcon },
];

const navItems = [
    { name: 'Culto', route: 'mobile.culto', icon: FilmIcon, iconActive: FilmIconSolid },
    { name: 'Notícias', route: 'mobile.news', icon: NewspaperIcon, iconActive: NewspaperIconSolid },
    { name: 'Eventos', route: 'mobile.events', icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
    { name: 'Dízimos e Ofertas', route: 'mobile.offerings', icon: HandRaisedIcon, iconActive: HandRaisedIconSolid },
    { name: 'Vários', route: 'mobile.more', icon: Squares2X2Icon, iconActive: Squares2X2IconSolid },
] as const;

export default function MobileLayout({ children }: PropsWithChildren) {
    const { props } = usePage();
    const currentChurch = (props as { currentChurch?: { name: string; logo_url?: string | null } | null }).currentChurch;
    const auth = (props as { auth?: { canAccessAdminMenu?: boolean; permissions?: string[] } }).auth;
    const canAccessAdminMenu = auth?.canAccessAdminMenu ?? false;
    const permissions: string[] = auth?.permissions ?? [];
    const [adminMenuOpen, setAdminMenuOpen] = useState(false);

    const canAccessAdminRoute = (routeName: string) => {
        const perms = adminRouteToPermissions[routeName] ?? [];
        if (perms.length === 0) return true;
        return perms.some((p) => permissions.includes(p));
    };
    const filteredAdminItems = adminMenuItems.filter((item) => route().has(item.route) && canAccessAdminRoute(item.route));

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Menu admin slide-out (Líderes e Administradores) */}
            {canAccessAdminMenu && (
                <>
                    {adminMenuOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-50"
                            onClick={() => setAdminMenuOpen(false)}
                            aria-hidden
                        />
                    )}
                    <aside
                        className={`fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-out ${
                            adminMenuOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
                    >
                        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-200 dark:border-zinc-800">
                            <span className="font-semibold text-zinc-900 dark:text-white">Painel</span>
                            <button
                                type="button"
                                onClick={() => setAdminMenuOpen(false)}
                                className="p-2 -m-2 rounded-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                aria-label="Fechar menu"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <nav className="overflow-y-auto py-4">
                            <ul className="space-y-1 px-3">
                                {filteredAdminItems.map(({ name, route: routeName, icon: Icon }) => (
                                    <li key={routeName}>
                                        <Link
                                            href={route(routeName)}
                                            onClick={() => setAdminMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            <Icon className="w-5 h-5 text-zinc-500" />
                                            <span className="font-medium">{name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </aside>
                </>
            )}

            {/* Barra superior fixa */}
            <header
                className="fixed top-0 left-0 right-0 z-40 h-14 safe-area-top bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800"
                style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
            >
                <div className="relative flex items-center justify-center h-14 px-4">
                    {canAccessAdminMenu && (
                        <button
                            type="button"
                            onClick={() => setAdminMenuOpen(true)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 -m-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            aria-label="Menu do painel"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                    )}
                    <Link href={route('mobile.index')} className="flex-shrink-0">
                        <img
                            src={currentChurch?.logo_url ?? '/logo-ns.png'}
                            alt={currentChurch?.name ?? 'Nova Semente'}
                            className="h-9 w-9 rounded-full object-cover object-center dark:invert"
                        />
                    </Link>
                    <Link
                        href={route('mobile.settings')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 -m-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label="Configurações"
                    >
                        <Cog6ToothIcon className="w-6 h-6" />
                    </Link>
                </div>
            </header>

            {/* Conteúdo com padding para barras fixas */}
            <main
                className="pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] min-h-screen px-4 py-4"
            >
                {children}
            </main>

            {/* Barra inferior fixa - sólida, sem flutuar */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                aria-label="Menu principal"
            >
                <div className="flex items-center justify-around h-14 max-w-lg mx-auto pt-1">
                    {navItems.map(({ name, route: routeName, icon: Icon, iconActive: IconActive }) => {
                        const href = route(routeName);
                        const isActive = route().current(routeName);
                        const IconComponent = isActive ? IconActive : Icon;
                        return (
                            <Link
                                key={routeName}
                                href={href}
                                aria-label={name}
                                className={`relative flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 transition-all rounded-2xl mx-0.5 ${
                                    isActive
                                        ? 'bg-zinc-800 dark:bg-zinc-700 text-white'
                                        : 'text-zinc-400 dark:text-zinc-500 active:bg-zinc-100 dark:active:bg-zinc-800'
                                }`}
                            >
                                <IconComponent
                                    className={`flex-shrink-0 transition-transform ${isActive ? 'w-7 h-7 drop-shadow-sm scale-105 text-white' : 'w-6 h-6'}`}
                                    aria-hidden
                                />
                                <span className={`text-[10px] truncate max-w-full px-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                                    {name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <FlashMessages />
        </div>
    );
}
