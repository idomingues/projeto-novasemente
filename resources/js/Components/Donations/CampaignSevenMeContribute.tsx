import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const SEVENME_LOGO_SRC = '/images/7me-logo.png';

export type CampaignSevenMeTone = 'brand' | 'emerald' | 'neutral';

const toneClasses: Record<
    CampaignSevenMeTone,
    {
        card: string;
        iconWrap: string;
        title: string;
        subtitle: string;
        chevron: string;
    }
> = {
    brand: {
        card: 'border-brand-200 bg-gradient-to-br from-brand-50 via-white to-sky-50 ring-brand-100/80 hover:border-brand-300 hover:from-brand-100/80 dark:border-brand-900/60 dark:from-brand-950/50 dark:via-zinc-900 dark:to-sky-950/30 dark:ring-brand-900/40 dark:hover:border-brand-700',
        iconWrap: 'bg-white shadow-sm ring-1 ring-brand-100 dark:bg-zinc-950 dark:ring-brand-900/50',
        title: 'text-zinc-900 dark:text-white',
        subtitle: 'text-brand-700/80 dark:text-brand-300/90',
        chevron: 'text-brand-400 group-hover:text-brand-600 dark:text-brand-500 dark:group-hover:text-brand-300',
    },
    emerald: {
        card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 ring-emerald-100/80 hover:border-emerald-300 hover:from-emerald-100/80 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-sky-950/30 dark:ring-emerald-900/40 dark:hover:border-emerald-700',
        iconWrap: 'bg-white shadow-sm ring-1 ring-emerald-100 dark:bg-zinc-950 dark:ring-emerald-900/50',
        title: 'text-zinc-900 dark:text-white',
        subtitle: 'text-emerald-700/80 dark:text-emerald-300/90',
        chevron: 'text-emerald-400 group-hover:text-emerald-600 dark:text-emerald-500 dark:group-hover:text-emerald-300',
    },
    neutral: {
        card: 'border-zinc-200 bg-white ring-zinc-200/90 hover:bg-zinc-50 hover:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/80 dark:hover:ring-zinc-700',
        iconWrap: 'bg-zinc-50 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-950 dark:ring-zinc-700',
        title: 'text-zinc-900 dark:text-white',
        subtitle: 'text-zinc-500 dark:text-zinc-400',
        chevron: 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300',
    },
};

type Props = {
    href: string;
    tone?: CampaignSevenMeTone;
    className?: string;
};

export default function CampaignSevenMeContribute({ href, tone = 'neutral', className = '' }: Props) {
    const styles = toneClasses[tone];

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 shadow-sm ring-1 transition active:scale-[0.99] sm:rounded-3xl sm:p-5 ${styles.card} ${className}`}
        >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrap}`}>
                <img
                    src={SEVENME_LOGO_SRC}
                    alt=""
                    className="h-6 w-auto max-w-[32px] object-contain"
                    width={32}
                    height={24}
                />
            </span>
            <span className="min-w-0 flex-1">
                <span className={`block text-base font-semibold sm:text-lg ${styles.title}`}>
                    Contribuir via 7me
                </span>
                <span className={`mt-0.5 block text-xs ${styles.subtitle}`}>
                    Abre o link oficial de doação
                </span>
            </span>
            <ArrowTopRightOnSquareIcon
                className={`h-5 w-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${styles.chevron}`}
                aria-hidden
            />
        </a>
    );
}
