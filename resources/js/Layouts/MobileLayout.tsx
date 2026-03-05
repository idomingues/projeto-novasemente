import { PropsWithChildren } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    HomeIcon,
    NewspaperIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeIconSolid,
    NewspaperIcon as NewspaperIconSolid,
    CalendarDaysIcon as CalendarDaysIconSolid,
    ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
    Cog6ToothIcon as Cog6ToothIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';
import FlashMessages from '@/Components/FlashMessages';

const navItems = [
    { name: 'Início', route: 'mobile.index', icon: HomeIcon, iconActive: HomeIconSolid },
    { name: 'Notícias', route: 'mobile.news', icon: NewspaperIcon, iconActive: NewspaperIconSolid },
    { name: 'Eventos', route: 'mobile.events', icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
    { name: 'Escala', route: 'mobile.schedule', icon: ClipboardDocumentListIcon, iconActive: ClipboardDocumentListIconSolid },
    { name: 'Mais', route: 'mobile.more', icon: Squares2X2Icon, iconActive: Squares2X2IconSolid },
    { name: 'Configurações', route: 'mobile.settings', icon: Cog6ToothIcon, iconActive: Cog6ToothIconSolid },
] as const;

export default function MobileLayout({ children }: PropsWithChildren) {
    const { url, props } = usePage();
    const currentRoute = url;
    const currentChurch = (props as { currentChurch?: { name: string } | null }).currentChurch;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-20 safe-area-pb">
            {/* Top bar simples */}
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 safe-area-top">
                <div className="flex items-center justify-between h-14 px-4">
                    <span className="text-lg font-semibold text-zinc-900 dark:text-white truncate">
                        {currentChurch?.name ?? 'Nova Semente'}
                    </span>
                </div>
            </header>

            <main className="min-h-[calc(100vh-3.5rem-5rem)] px-4 py-4">
                {children}
            </main>

            {/* Bottom navigation */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0))]"
                aria-label="Menu principal"
            >
                <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
                    {navItems.map(({ name, route, icon: Icon, iconActive: IconActive }) => {
                        const href = route(route);
                        const isActive = route === 'mobile.index' ? currentRoute === href : currentRoute.startsWith(href.split('?')[0]);
                        const IconComponent = isActive ? IconActive : Icon;
                        return (
                            <Link
                                key={route}
                                href={href}
                                className={`flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 transition-colors ${
                                    isActive
                                        ? 'text-primary-600 dark:text-primary-400'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                }`}
                            >
                                <IconComponent className="w-6 h-6 flex-shrink-0" aria-hidden />
                                <span className="text-[10px] font-medium truncate max-w-full px-0.5">
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
