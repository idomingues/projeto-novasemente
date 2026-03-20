import { Link } from '@inertiajs/react';
import {
    FilmIcon,
    NewspaperIcon,
    CalendarDaysIcon,
    HandRaisedIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
    FilmIcon as FilmIconSolid,
    NewspaperIcon as NewspaperIconSolid,
    CalendarDaysIcon as CalendarDaysIconSolid,
    HandRaisedIcon as HandRaisedIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
    { name: 'Culto', route: 'mobile.culto' as const, activeRoutes: ['mobile.culto'] as const, icon: FilmIcon, iconActive: FilmIconSolid },
    { name: 'Notícias', route: 'mobile.news' as const, activeRoutes: ['mobile.news'] as const, icon: NewspaperIcon, iconActive: NewspaperIconSolid },
    { name: 'Eventos', route: 'mobile.events' as const, activeRoutes: ['mobile.events'] as const, icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
    { name: 'Dízimos e Ofertas', route: 'mobile.offerings' as const, activeRoutes: ['mobile.offerings'] as const, icon: HandRaisedIcon, iconActive: HandRaisedIconSolid },
    { name: 'Mais', route: 'mobile.more' as const, activeRoutes: ['mobile.more', 'more.index'] as const, icon: Squares2X2Icon, iconActive: Squares2X2IconSolid },
] as const;

/** Barra inferior fixa (Culto, Notícias, Eventos, Dízimos, Mais). Usada no mobile em todos os layouts. */
export default function MobileBottomNav() {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            aria-label="Menu principal"
        >
            <div className="flex items-center justify-around h-14 max-w-lg lg:max-w-2xl mx-auto pt-1">
                {navItems.map(({ name, route: routeName, activeRoutes, icon: Icon, iconActive: IconActive }) => {
                    const href = route(routeName);
                    const isActive = activeRoutes.some((r) => route().current(r));
                    const IconComponent = isActive ? IconActive : Icon;
                    return (
                        <Link
                            key={routeName}
                            href={href}
                            aria-label={name}
                            className={`relative flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 transition-colors rounded-xl mx-0.5 ${
                                isActive
                                    ? 'text-zinc-900 dark:text-white'
                                    : 'text-zinc-400 dark:text-zinc-500 active:bg-zinc-100/80 dark:active:bg-zinc-800/50'
                            }`}
                        >
                            <IconComponent
                                className={`flex-shrink-0 transition-all ${isActive ? 'w-7 h-7 text-zinc-900 dark:text-white' : 'w-6 h-6'}`}
                                aria-hidden
                            />
                            <span className={`text-[10px] truncate max-w-full px-0.5 ${isActive ? 'font-semibold text-zinc-900 dark:text-white' : 'font-medium'}`}>
                                {name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
