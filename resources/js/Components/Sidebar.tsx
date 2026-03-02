import { Link, usePage } from '@inertiajs/react';
import { 
    HomeIcon, 
    UserGroupIcon, 
    UsersIcon, 
    BuildingOfficeIcon, 
    ArchiveBoxIcon, 
    NewspaperIcon, 
    CalendarDaysIcon, 
    Cog6ToothIcon 
} from '@heroicons/react/24/outline';

export default function Sidebar() {
    const { url } = usePage();

    // Helper to check if route is active
    const isRouteActive = (routeName: string) => {
        // Simple check: if current url starts with the route url
        // Ideally we use route().current(), but for menu items with sub-routes it's good to be flexible
        return route().current(routeName + '*');
    };

    const menuItems = [
        { name: 'Dashboard', route: 'dashboard', icon: HomeIcon },
        { name: 'Membros', route: 'members.index', icon: UserGroupIcon },
        { name: 'Voluntários', route: 'volunteers.index', icon: UsersIcon },
        { name: 'Salas', route: 'rooms.index', icon: BuildingOfficeIcon },
        { name: 'Inventário', route: 'inventory.index', icon: ArchiveBoxIcon },
        { name: 'Notícias', route: 'news.index', icon: NewspaperIcon },
        { name: 'Cultos', route: 'services.index', icon: CalendarDaysIcon },
        { name: 'Configurações', route: 'settings.index', icon: Cog6ToothIcon },
    ];
    
    return (
        <aside className="w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 h-screen fixed left-0 top-0 hidden md:flex flex-col z-50">
            {/* Logo Area */}
            <div className="h-24 flex items-center px-8 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-3 text-zinc-900 dark:text-white">
                    <div className="p-2 bg-zinc-900 dark:bg-white rounded-xl">
                        <BuildingOfficeIcon className="w-6 h-6 text-white dark:text-black" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold tracking-tight leading-none">Admin</span>
                        <span className="text-sm text-zinc-500 font-medium leading-none">System</span>
                    </div>
                </div>
            </div>

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
            </div>
            
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-900">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-4">
                    <p className="text-xs text-zinc-500 mb-2">Usuário Logado</p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-900 dark:text-white">
                            US
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">Admin User</p>
                            <p className="text-xs text-zinc-500 truncate">admin@example.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
