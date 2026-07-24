import { Link } from '@inertiajs/react';
import { useAppFeatures } from '@/hooks/useAppFeatures';
import {
    HomeIcon,
    HandRaisedIcon,
    PlayCircleIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type NavItem = {
    name: string;
    route: string;
    activeRoutes: readonly string[];
    icon?: NavIcon;
    iconActive?: NavIcon;
    featureKey?: string;
    /** PNG único no lugar de ícone + rótulo (ex.: Publicações). */
    imageSrc?: string;
};

const navItems: NavItem[] = [
    {
        name: 'Home',
        route: 'mobile.home',
        activeRoutes: [
            'mobile.home',
            'volunteers.public-signup.page',
            'mobile.baptism',
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
            'mobile.acervo-revista-adventista',
            'mobile.acervo-revista-adventista.show',
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
            'mobile.ano-biblico',
            'mobile.ano-biblico.complete',
            'mobile.news',
            'mobile.news.show',
            'mobile.meditacao-diaria',
            'mobile.talents.index',
            'mobile.shared-talents.index',
            'mobile.campaigns.index',
            'mobile.donations.index',
        ],
        icon: HomeIcon,
        iconActive: HomeIcon,
    },
    {
        name: 'Culto',
        route: 'mobile.culto',
        featureKey: 'culto',
        activeRoutes: ['mobile.culto', 'mobile.culto.show'],
        icon: PlayCircleIcon,
        iconActive: PlayCircleIcon,
    },
    {
        name: 'Publicações',
        route: 'mobile.publications-feed',
        activeRoutes: ['mobile.publications-feed'],
        imageSrc: '/logo-ns.png',
    },
    {
        name: 'Oração',
        route: 'mobile.prayer',
        featureKey: 'prayer',
        activeRoutes: ['mobile.prayer', 'prayer.index'],
        icon: HandRaisedIcon,
        iconActive: HandRaisedIcon,
    },
    {
        name: 'Bíblia',
        route: 'mobile.bible',
        featureKey: 'bible',
        activeRoutes: ['mobile.bible', 'mobile.bible.chapter', 'mobile.bible.search', 'mobile.bible.reference'],
        icon: BookOpenIcon,
        iconActive: BookOpenIcon,
    },
];

/** Barra inferior: Home, Culto, Publicações, Oração, Bíblia. */
export default function MobileBottomNav() {
    const { isEnabled } = useAppFeatures();
    const visibleItems = navItems.filter((item) => {
        if (!item.featureKey) {
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
                {visibleItems.map((item) => {
                    const { name, route: routeName, activeRoutes, icon: Icon, iconActive: IconActive, imageSrc } = item;
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
                                    ? 'text-brand-600 dark:text-brand-400'
                                    : 'text-zinc-900 dark:text-zinc-100 active:bg-zinc-100/80 dark:active:bg-zinc-800/50'
                            }`}
                        >
                            {imageSrc ? (
                                <span className="relative inline-flex items-center justify-center">
                                    {/* Linha piscando ao redor do ícone de Publicações */}
                                    <span
                                        aria-hidden
                                        className={`pointer-events-none absolute rounded-full border-2 border-brand-500 animate-pulse motion-reduce:animate-none dark:border-brand-400 ${
                                            isActive ? '-inset-1' : '-inset-0.5'
                                        }`}
                                    />
                                    <img
                                        src={imageSrc}
                                        alt=""
                                        className={`relative z-[1] rounded-full object-cover transition-all ${
                                            isActive ? 'h-9 w-9' : 'h-8 w-8'
                                        }`}
                                        aria-hidden
                                    />
                                </span>
                            ) : (
                                <>
                                    {IconComponent ? (
                                        <IconComponent
                                            className={`flex-shrink-0 transition-all ${
                                                isActive
                                                    ? 'h-7 w-7 text-brand-600 dark:text-brand-400'
                                                    : 'h-6 w-6 text-zinc-900 dark:text-zinc-100'
                                            }`}
                                            aria-hidden
                                            strokeWidth={1.75}
                                        />
                                    ) : null}
                                    <span
                                        className={`text-[10px] truncate max-w-full px-0.5 ${
                                            isActive
                                                ? 'font-semibold text-brand-600 dark:text-brand-400'
                                                : 'font-medium text-zinc-900 dark:text-zinc-100'
                                        }`}
                                    >
                                        {name}
                                    </span>
                                </>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
