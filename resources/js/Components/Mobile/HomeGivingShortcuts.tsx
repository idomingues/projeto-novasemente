import { Link } from '@inertiajs/react';
import { BanknotesIcon, ChatBubbleLeftRightIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { useAppFeatures } from '@/hooks/useAppFeatures';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type ShortcutItem = {
    id: string;
    label: string;
    route: string;
    featureKey: string;
    icon: MenuIcon;
    badge?: string;
};

const ITEMS: ShortcutItem[] = [
    {
        id: 'oferta-nova-semente',
        label: 'Oferta NS',
        route: 'mobile.campaigns.index',
        featureKey: 'donation_campaigns',
        icon: BanknotesIcon,
    },
    {
        id: 'dizimos-pacto',
        label: 'Dízimo e Pacto',
        route: 'mobile.offerings',
        featureKey: 'offerings',
        icon: HandRaisedIcon,
    },
    {
        id: 'ns-whats',
        label: 'NS Conecta',
        route: 'mobile.ns-whats.index',
        featureKey: 'ns_whats',
        icon: ChatBubbleLeftRightIcon,
        badge: 'NOVO',
    },
];

export default function HomeGivingShortcuts({ nsWhatsPendingReply = 0 }: { nsWhatsPendingReply?: number }) {
    const { isEnabled } = useAppFeatures();
    const items = ITEMS.filter((item) => isEnabled(item.featureKey));

    if (items.length === 0) {
        return null;
    }

    return (
        <section aria-label="Atalhos rápidos" className="py-1">
            <div className="flex w-full items-start justify-between px-4">
                {items.map((item) => {
                    const Icon = item.icon;
                    const pending = item.id === 'ns-whats' && nsWhatsPendingReply > 0 ? nsWhatsPendingReply : null;
                    const badgeLabel = pending !== null ? (pending > 99 ? '99+' : String(pending)) : item.badge;

                    return (
                        <Link
                            key={item.id}
                            href={route(item.route)}
                            className="group flex shrink-0 cursor-pointer flex-col items-center gap-2 py-2 text-center first:items-start first:text-left last:items-end last:text-right"
                        >
                            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200">
                                <Icon className="h-6 w-6" aria-hidden strokeWidth={1.7} />
                                {badgeLabel ? (
                                    <span
                                        className="absolute -right-2 -top-1.5 inline-flex items-center rounded-full bg-emerald-800 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white dark:bg-emerald-400 dark:text-emerald-950"
                                        title={
                                            pending !== null
                                                ? `${pending} ${pending === 1 ? 'mensagem pendente' : 'mensagens pendentes'}`
                                                : undefined
                                        }
                                    >
                                        {badgeLabel}
                                    </span>
                                ) : null}
                            </span>
                            <span className="text-[12px] font-medium leading-tight text-zinc-800 dark:text-zinc-100">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
