import MissionThailandHero from '@/Components/Mission/MissionThailandHero';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import {
    CalendarDaysIcon,
    ChatBubbleLeftRightIcon,
    GlobeAltIcon,
    GlobeAsiaAustraliaIcon,
    PhotoIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type HubCard = {
    label: string;
    subtitle: string;
    route: string;
};

const iconByRoute: Record<string, MenuIcon> = {
    'mobile.mission.home': GlobeAsiaAustraliaIcon,
    'mobile.mission.events': CalendarDaysIcon,
    'mobile.mission.messages': ChatBubbleLeftRightIcon,
    'mobile.mission.about': UserGroupIcon,
    'mobile.mission.wall': PhotoIcon,
    'mobile.mission.form': GlobeAltIcon,
};

const FEATURED_ROUTE = 'mobile.mission.home';

interface Props {
    cards: HubCard[];
}

export default function MissionHub({ cards }: Props) {
    const featured = cards.find((card) => card.route === FEATURED_ROUTE);
    const otherCards = cards.filter((card) => card.route !== FEATURED_ROUTE);

    return (
        <MobileLayout>
            <Head title="Missão" />
            <div className="mx-auto w-full max-w-3xl space-y-6 lg:max-w-6xl">
                <div>
                    <Link
                        href={route('mobile.more')}
                        className="cursor-pointer text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← Mais
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white lg:text-3xl">
                        Missão
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 lg:text-base">
                        Comunidade missionária Nova Semente — Tailândia & Mianmar, eventos, depoimentos e mural.
                    </p>
                </div>

                {featured ? (
                    <Link
                        href={route(featured.route)}
                        className="group block cursor-pointer rounded-3xl transition hover:scale-[1.005] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                    >
                        <MissionThailandHero variant="hub" />
                    </Link>
                ) : null}

                <section aria-label="Áreas da Missão">
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Explorar
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
                        {otherCards.map(({ label, subtitle, route: routeName }) => {
                            const Icon = iconByRoute[routeName] ?? GlobeAltIcon;
                            return (
                                <Link
                                    key={routeName}
                                    href={route(routeName)}
                                    className="group flex cursor-pointer flex-col rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-zinc-200/80 transition hover:-translate-y-0.5 hover:ring-teal-300/80 active:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-teal-700/60 dark:active:bg-zinc-800 sm:p-4"
                                >
                                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:group-hover:bg-teal-900/50">
                                        <Icon className="h-6 w-6" aria-hidden />
                                    </div>
                                    <span className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                                        {label}
                                    </span>
                                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                        {subtitle}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        </MobileLayout>
    );
}
