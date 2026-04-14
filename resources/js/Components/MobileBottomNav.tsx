import { Link } from '@inertiajs/react';
import {
    FilmIcon,
    CalendarDaysIcon,
    HandRaisedIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
    FilmIcon as FilmIconSolid,
    CalendarDaysIcon as CalendarDaysIconSolid,
    HandRaisedIcon as HandRaisedIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';

const navItems = [
    { name: 'Culto', route: 'mobile.culto' as const, activeRoutes: ['mobile.culto'] as const, icon: FilmIcon, iconActive: FilmIconSolid },
    {
        name: 'Oração',
        route: 'mobile.prayer' as const,
        activeRoutes: ['mobile.prayer', 'prayer.index'] as const,
        icon: PrayingHandsIcon,
        iconActive: PrayingHandsIcon,
    },
    { name: 'Eventos', route: 'mobile.events' as const, activeRoutes: ['mobile.events'] as const, icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
    { name: 'Dízimos e Ofertas', route: 'mobile.offerings' as const, activeRoutes: ['mobile.offerings'] as const, icon: HandRaisedIcon, iconActive: HandRaisedIconSolid },
    {
        name: 'Mais',
        route: 'mobile.more' as const,
        activeRoutes: [
            'mobile.more',
            'more.index',
            'mobile.news',
            'mobile.news.show',
            'mobile.beliefs',
            'mobile.quem-somos',
            'varios.services',
            'mobile.services',
            'varios.contact',
            'mobile.contact',
            'mobile.fotos',
            'mobile.location',
            'varios.schedule',
            'varios.classe-comecos',
            'mobile.classe-comecos',
            'mobile.acervo',
            'musica.index',
            'mobile.musica',
            'varios.notifications',
            'mobile.notifications',
            'mobile.inventory',
            'mobile.pastors',
            'mobile.solicitations.hub',
            'mobile.solicitations.mine',
            'mobile.solicitations.create',
            'mobile.solicitations.show',
            'mobile.support.index',
            'mobile.support.ticket',
        ] as const,
        icon: Squares2X2Icon,
        iconActive: Squares2X2IconSolid,
    },
] as const;

interface MobileBottomNavProps {
    /** Com sidebar admin (md+): a barra fica só sobre a coluna de conteúdo, como pré-visualização do app. */
    insetForSidebar?: boolean;
}

/** Barra inferior fixa (Culto, Notícias, Eventos, Dízimos, Mais). Visitantes e admins (pré-visualização). */
export default function MobileBottomNav({ insetForSidebar = false }: MobileBottomNavProps) {
    return (
        <nav
            className={`fixed bottom-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 ${
                insetForSidebar ? 'left-0 md:left-72' : 'left-0'
            }`}
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
