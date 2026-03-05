import { Link, usePage, router } from '@inertiajs/react';
import { 
    HomeIcon, 
    UserGroupIcon, 
    UsersIcon, 
    BuildingOfficeIcon, 
    BuildingOffice2Icon,
    ArchiveBoxIcon, 
    NewspaperIcon, 
    CalendarDaysIcon, 
    Cog6ToothIcon,
    CalendarIcon,
    XMarkIcon,
    KeyIcon,
    DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
    routeToPermissions?: Record<string, string[]>;
}

interface ChurchInfo {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
}

interface ChurchForSwitch {
    id: number;
    name: string;
}

export default function Sidebar({ mobileOpen = false, onMobileClose, routeToPermissions = {} }: SidebarProps) {
    const { props } = usePage();
    const auth = props.auth as { user?: { name?: string; email?: string; member?: { name: string } }; permissions?: string[] };
    const currentChurch = (props as { currentChurch?: ChurchInfo | null }).currentChurch ?? null;
    const churchesForSwitch = (props as { churchesForSwitch?: ChurchForSwitch[] }).churchesForSwitch ?? [];
    const permissions: string[] = auth?.permissions ?? [];
    const isAuthenticated = !!auth?.user;
    const isSuperAdmin = churchesForSwitch.length > 0;

    const isRouteActive = (routeName: string) => route().current(routeName + '*');

    const allMenuItems = [
        { name: 'Dashboard', route: 'dashboard', icon: HomeIcon },
        { name: 'Eventos', route: 'events.index', icon: CalendarDaysIcon },
        { name: 'Membros', route: 'members.index', icon: UserGroupIcon },
        { name: 'Departamentos', route: 'departments.index', icon: BuildingOffice2Icon },
        { name: 'Escalas', route: 'escalas.index', icon: CalendarIcon },
        { name: 'Voluntários', route: 'volunteers.index', icon: UsersIcon },
        { name: 'Usuários', route: 'users.index', icon: KeyIcon },
        { name: 'Salas', route: 'rooms.index', icon: BuildingOfficeIcon },
        { name: 'Inventário', route: 'inventory.index', icon: ArchiveBoxIcon },
        { name: 'Notícias', route: 'news.index', icon: NewspaperIcon },
        { name: 'Igrejas', route: 'churches.index', icon: BuildingOfficeIcon },
        { name: 'Cultos', route: 'services.index', icon: CalendarDaysIcon },
        { name: 'Configurações', route: 'settings.index', icon: Cog6ToothIcon },
    ];

    const requiredPerms = (route: string) => routeToPermissions[route] ?? [];
    const canAccess = (route: string) => {
        const perms = requiredPerms(route);
        if (perms.length === 0) return true;
        return perms.some((p) => permissions.includes(p));
    };

    const menuItems = isAuthenticated ? allMenuItems.filter((item) => canAccess(item.route)) : [];

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onMobileClose}
                    aria-hidden
                />
            )}
            <aside
                className={`w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ease-out md:translate-x-0 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
            {/* Logo Area */}
            <div className="h-24 flex items-center justify-between px-6 md:px-8 border-b border-zinc-100 dark:border-zinc-900 flex-shrink-0">
                <div className="flex items-center gap-3 text-zinc-900 dark:text-white min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center overflow-hidden">
                        {currentChurch?.logo_url ? (
                            <img src={currentChurch.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                            <BuildingOfficeIcon className="w-6 h-6 text-white dark:text-black" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-lg font-bold tracking-tight leading-none truncate">New Church</span>
                        <span className="text-sm text-zinc-500 font-medium leading-none truncate">
                            {currentChurch?.name ?? 'Painel Administrativo'}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onMobileClose}
                    className="md:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Fechar menu"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {isSuperAdmin && churchesForSwitch.length > 0 && (
                <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-900">
                    <label htmlFor="sidebar-church-switch" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Igreja em que está trabalhando
                    </label>
                    <select
                        id="sidebar-church-switch"
                        value={currentChurch?.id ?? ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            if (id) {
                                router.post(route('working-church.store'), { church_id: id }, { preserveScroll: true });
                            }
                        }}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm py-2 pl-3 pr-8"
                    >
                        {churchesForSwitch.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                        O menu &quot;Igrejas&quot; continua disponível para cadastrar outras.
                    </p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto py-8 px-4">
                <div className="mb-4 px-4">
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Menu Principal</p>
                </div>
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        // Check if route exists to prevent crash
                        const routeExists = route().has(item.route);
                        const href = routeExists ? route(item.route) : '#';
                        const isActive = routeExists && isRouteActive(item.route);
                        
                        return (
                            <li key={item.name}>
                                <Link
                                    href={href}
                                    onClick={onMobileClose}
                                    className={`flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                                        isActive 
                                        ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 dark:bg-white dark:text-black dark:shadow-white/10' 
                                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                    }`}
                                >
                                    <item.icon className={`w-6 h-6 mr-3 ${
                                        isActive ? 'text-white dark:text-black' : 'text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white'
                                    }`} />
                                    <span className="font-medium text-sm">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 px-4">
                    <Link
                        href={route('mobile.index')}
                        onClick={onMobileClose}
                        className="flex items-center px-4 py-3 rounded-2xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition-all"
                    >
                        <DevicePhoneMobileIcon className="w-6 h-6 mr-3 text-zinc-400" />
                        <span className="font-medium text-sm">Versão mobile</span>
                    </Link>
                </div>
            </div>
        </aside>
        </>
    );
}
