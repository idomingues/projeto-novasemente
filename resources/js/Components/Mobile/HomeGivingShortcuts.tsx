import { Link } from '@inertiajs/react';
import { BanknotesIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { useAppFeatures } from '@/hooks/useAppFeatures';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type GivingItem = {
    id: string;
    label: string;
    route: string;
    featureKey: string;
    icon: MenuIcon;
};

const ITEMS: GivingItem[] = [
    {
        id: 'oferta-nova-semente',
        label: 'Oferta Nova Semente',
        route: 'mobile.campaigns.index',
        featureKey: 'donation_campaigns',
        icon: BanknotesIcon,
    },
    {
        id: 'dizimos-pacto',
        label: 'Dízimos e Pacto',
        route: 'mobile.offerings',
        featureKey: 'offerings',
        icon: HandRaisedIcon,
    },
];

export default function HomeGivingShortcuts() {
    const { isEnabled } = useAppFeatures();
    const items = ITEMS.filter((item) => isEnabled(item.featureKey));

    if (items.length === 0) {
        return null;
    }

    return (
        <section aria-label="Oferta e dízimo" className="relative">
            <div className="grid grid-cols-2 gap-2">
                {items.map((item) => {
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.id}
                            href={route(item.route)}
                            className="group flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-left text-zinc-900 shadow-sm ring-1 ring-zinc-200/90 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:text-white dark:ring-zinc-700 dark:hover:bg-zinc-800"
                        >
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                                <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.05} />
                            </span>
                            <span className="min-w-0 line-clamp-2 text-[12px] font-semibold leading-tight tracking-tight">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
