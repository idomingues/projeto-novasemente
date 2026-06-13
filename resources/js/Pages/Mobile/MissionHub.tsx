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

interface Props {
    cards: HubCard[];
}

export default function MissionHub({ cards }: Props) {
    return (
        <MobileLayout>
            <Head title="Missão" />
            <div className="space-y-6">
                <div>
                    <Link
                        href={route('mobile.more')}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        ← Mais
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Missão</h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Missão Tailândia & Mianmar, eventos, depoimentos, quem somos e mural da comunidade missionária
                        Nova Semente.
                    </p>
                </div>

                <section aria-label="Áreas da Missão">
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                        {cards.map(({ label, subtitle, route: routeName }) => {
                            const Icon = iconByRoute[routeName] ?? GlobeAltIcon;
                            return (
                                <Link
                                    key={routeName}
                                    href={route(routeName)}
                                    className="group flex flex-col rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-zinc-200/80 transition hover:ring-zinc-300 active:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-zinc-700 dark:active:bg-zinc-800"
                                >
                                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
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
