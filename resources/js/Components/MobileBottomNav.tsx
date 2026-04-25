import { Link } from '@inertiajs/react';
import {
    NewspaperIcon,
    CalendarDaysIcon,
    SparklesIcon,
    Squares2X2Icon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';
import {
    NewspaperIcon as NewspaperIconSolid,
    CalendarDaysIcon as CalendarDaysIconSolid,
    SparklesIcon as SparklesIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
    UserPlusIcon as UserPlusIconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
    {
        name: 'News',
        route: 'mobile.news' as const,
        activeRoutes: ['mobile.news', 'mobile.news.show'] as const,
        icon: NewspaperIcon,
        iconActive: NewspaperIconSolid,
    },
    {
        name: 'Batismo',
        route: 'mobile.baptism' as const,
        activeRoutes: ['mobile.baptism'] as const,
        icon: SparklesIcon,
        iconActive: SparklesIconSolid,
    },
    { name: 'Eventos', route: 'mobile.events' as const, activeRoutes: ['mobile.events'] as const, icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
    {
        name: 'Cadastro',
        route: 'volunteers.public-signup.page' as const,
        activeRoutes: ['volunteers.public-signup.page'] as const,
        icon: UserPlusIcon,
        iconActive: UserPlusIconSolid,
    },
    {
        name: 'Mais',
        route: 'mobile.more' as const,
        activeRoutes: [
            'mobile.more',
            'more.index',
            'mobile.beliefs',
            'mobile.quem-somos',
            'varios.services',
            'mobile.services',
            'varios.contact',
            'mobile.contact',
            'mobile.contact.store',
            'mobile.leader-solicitations.index',
            'mobile.leader-solicitations.show',
            'mobile.leader-solicitations.messages.store',
            'mobile.fotos',
            'mobile.fotos.show',
            'mobile.location',
            'mobile.prayer',
            'prayer.index',
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
            'mobile.pastoral-appointments.request',
            'mobile.pastor-availability',
            'pastoral-agenda.index',
            'pastors.weekly-schedule.update',
            'volunteers.public-signup.page',
            'mobile.schedule',
            'escalas.index',
            'mobile.culto',
            'mobile.offerings',
        ] as const,
        icon: Squares2X2Icon,
        iconActive: Squares2X2IconSolid,
    },
] as const;

interface MobileBottomNavProps {
    /** Com sidebar admin (md+): alinha à coluna de conteúdo (`md:left-72`). */
    insetForSidebar?: boolean;
}

/** Barra inferior: News, Batismo, Eventos, Cadastro, Mais (Oração entra em Mais). */
export default function MobileBottomNav({ insetForSidebar = false }: MobileBottomNavProps) {
    return (
        <nav
            className={`fixed bottom-0 right-0 z-40 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${
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
