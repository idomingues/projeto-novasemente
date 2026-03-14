import { PropsWithChildren } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    HomeIcon,
    NewspaperIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeIconSolid,
    NewspaperIcon as NewspaperIconSolid,
    CalendarDaysIcon as CalendarDaysIconSolid,
    ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
} from '@heroicons/react/24/solid';
import FlashMessages from '@/Components/FlashMessages';

const navItems = [
    { name: 'Início', route: 'mobile.index', icon: HomeIcon, iconActive: HomeIconSolid },
    { name: 'Notícias', route: 'mobile.news', icon: NewspaperIcon, iconActive: NewspaperIconSolid },
    { name: 'Eventos', route: 'mobile.events', icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
    { name: 'Escala', route: 'mobile.schedule', icon: ClipboardDocumentListIcon, iconActive: ClipboardDocumentListIconSolid },
] as const;

export default function MobileLayout({ children }: PropsWithChildren) {
    const { url, props } = usePage();
    const currentRoute = url;
    const currentChurch = (props as { currentChurch?: { name: string } | null }).currentChurch;

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Barra superior fixa - sólida, sem flutuar */}
            <header
                className="fixed top-0 left-0 right-0 z-40 h-14 safe-area-top bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800"
                style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
            >
                <div className="relative flex items-center justify-center h-14 px-4">
                    <img
                        src="/logo-ns.png"
                        alt={currentChurch?.name ?? 'Nova Semente'}
                        className="h-9 w-auto max-w-[140px] object-contain object-center dark:invert"
                    />
                    <Link
                        href={route('mobile.settings')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 -m-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                        const isActive = routeName === 'mobile.index' ? currentRoute === href : currentRoute.startsWith(href.split('?')[0]);
                        const IconComponent = isActive ? IconActive : Icon;
                        return (
                            <Link
                                key={routeName}
                                href={href}
                                aria-label={name}
                                className={`relative flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 transition-all rounded-2xl mx-0.5 ${
                                    isActive
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                        : 'text-zinc-400 dark:text-zinc-500 active:bg-zinc-100 dark:active:bg-zinc-800'
                                }`}
                            >
                                <IconComponent
                                    className={`flex-shrink-0 transition-transform ${isActive ? 'w-7 h-7 drop-shadow-sm scale-105' : 'w-6 h-6'}`}
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
