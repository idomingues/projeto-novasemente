import { Link } from '@inertiajs/react';
import { useAppFeatures } from '@/hooks/useAppFeatures';
import {
    HomeIcon,
    HandRaisedIcon,
    NewspaperIcon,
    PlayCircleIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeIconSolid,
    HandRaisedIcon as HandRaisedIconSolid,
    NewspaperIcon as NewspaperIconSolid,
    PlayCircleIcon as PlayCircleIconSolid,
    Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
    {
        name: 'Home',
        route: 'mobile.home' as const,
        activeRoutes: ['mobile.home', 'volunteers.public-signup.page', 'mobile.baptism'] as const,
        icon: HomeIcon,
        iconActive: HomeIconSolid,
    },
    {
        name: 'Assistir culto',
        route: 'mobile.culto' as const,
        featureKey: 'culto',
        activeRoutes: ['mobile.culto', 'mobile.culto.show'] as const,
        icon: PlayCircleIcon,
        iconActive: PlayCircleIconSolid,
    },
    {
        name: 'Notícias',
        route: 'mobile.news' as const,
        featureKey: 'news',
        activeRoutes: ['mobile.news', 'mobile.news.show'] as const,
        icon: NewspaperIcon,
        iconActive: NewspaperIconSolid,
    },
    {
        name: 'Oração',
        route: 'mobile.prayer' as const,
        featureKey: 'prayer',
        activeRoutes: ['mobile.prayer', 'prayer.index'] as const,
        icon: HandRaisedIcon,
        iconActive: HandRaisedIconSolid,
    },
    {
        name: 'Mais',
        route: 'mobile.more' as const,
        activeRoutes: [
            'mobile.more',
            'mobile.sobre-o-app',
            'mobile.settings',
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
            'varios.schedule',
            'varios.classe-comecos',
            'mobile.classe-comecos',
            'mobile.acervo',
            'mobile.acervo.show',
            'musica.index',
            'mobile.musica',
            'mobile.musica.show',
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
            'mobile.schedule',
            'escalas.index',
            'mobile.offerings',
            'mobile.events',
            'mobile.health',
            'mobile.health.show',
            'mobile.revista-adventista',
            'mobile.revista-adventista.show',
            'mobile.mission',
            'mobile.mission.home',
            'mobile.mission.events',
            'mobile.mission.messages',
            'mobile.mission.about',
            'mobile.mission.wall',
            'mobile.mission.form',
            'mission.form',
            'mobile.communities',
            'mobile.biblioteca',
            'mobile.biblioteca.show',
            'mobile.bible',
            'mobile.ano-biblico',
            'mobile.ano-biblico.complete',
        ] as const,
        icon: Squares2X2Icon,
        iconActive: Squares2X2IconSolid,
    },
] as const;

/** Barra inferior: Home, Assistir culto, Notícias, Oração, Mais (batismo e voluntário nos cartões do Início). */
export default function MobileBottomNav() {
    const { isEnabled } = useAppFeatures();
    const visibleItems = navItems.filter((item) => {
        if (!('featureKey' in item) || !item.featureKey) {
            return true;
        }

        return isEnabled(item.featureKey);
    });

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            aria-label="Menu principal"
        >
            <div className="mx-auto flex h-14 max-w-lg items-center justify-around pt-1 md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
                {visibleItems.map(({ name, route: routeName, activeRoutes, icon: Icon, iconActive: IconActive }) => {
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
