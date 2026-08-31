import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ChevronRightIcon,
    ClockIcon,
    HeartIcon,
    MapPinIcon,
    UserCircleIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { useAppFeatures } from '@/hooks/useAppFeatures';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type HubItem = {
    label: string;
    subtitle: string;
    route: string;
    featureKey: string;
    icon: MenuIcon;
};

const ITEMS: HubItem[] = [
    {
        label: 'Quem somos',
        subtitle: 'Nossa história, missão e propósito como igreja.',
        route: 'mobile.quem-somos',
        featureKey: 'quem_somos',
        icon: UserGroupIcon,
    },
    {
        label: 'Pastores',
        subtitle: 'Conheça nossos pastores e sua equipe pastoral.',
        route: 'mobile.pastors',
        featureKey: 'pastors',
        icon: UserCircleIcon,
    },
    {
        label: 'Localização',
        subtitle: 'Endereço, mapa e como chegar até a igreja.',
        route: 'mobile.location',
        featureKey: 'location',
        icon: MapPinIcon,
    },
    {
        label: 'Horários',
        subtitle: 'Confira nossos cultos e reuniões semanais.',
        route: 'mobile.services',
        featureKey: 'services',
        icon: ClockIcon,
    },
    {
        label: 'Em que cremos',
        subtitle: 'Nossas crenças e valores fundamentados na Palavra.',
        route: 'mobile.beliefs',
        featureKey: 'beliefs',
        icon: HeartIcon,
    },
];

export default function ConhecaNovaSemente() {
    const { isEnabled } = useAppFeatures();
    const items = ITEMS.filter((item) => isEnabled(item.featureKey));

    return (
        <MobileLayout>
            <Head title="Conheça a Nova Semente" />
            <div className="mx-auto w-full max-w-lg space-y-6 pb-4 sm:max-w-xl md:max-w-2xl">
                <div>
                    <Link
                        href={route('mobile.home')}
                        className="cursor-pointer text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← Início
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Conheça a Nova Semente
                    </h1>
                </div>

                {items.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                        Nenhum conteúdo disponível no momento.
                    </p>
                ) : (
                    <section aria-label="Sobre a igreja" className="space-y-3">
                        {items.map(({ label, subtitle, route: routeName, icon: Icon }) => (
                            <Link
                                key={routeName}
                                href={route(routeName)}
                                className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3.5 pr-3 text-left shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
                            >
                                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-800/60">
                                    <Icon className="h-5 w-5" aria-hidden strokeWidth={2.05} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[15px] font-semibold leading-tight text-zinc-900 dark:text-white">
                                        {label}
                                    </span>
                                    <span className="mt-0.5 block text-[13px] font-medium leading-snug text-zinc-600 dark:text-zinc-400">
                                        {subtitle}
                                    </span>
                                </span>
                                <ChevronRightIcon
                                    className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                                    aria-hidden
                                />
                            </Link>
                        ))}
                    </section>
                )}
            </div>
        </MobileLayout>
    );
}
