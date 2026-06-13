import type { ReactNode } from 'react';

type Props = {
    title: string;
    children: ReactNode;
    className?: string;
    accent?: 'default' | 'highlight';
    id?: string;
};

export default function MissionPageSection({
    title,
    children,
    className = '',
    accent = 'default',
    id,
}: Props) {
    const highlight =
        accent === 'highlight'
            ? 'border-amber-400/30 bg-gradient-to-br from-amber-50/90 via-white to-teal-50/50 dark:border-amber-500/20 dark:from-amber-950/20 dark:via-zinc-900 dark:to-teal-950/20'
            : 'border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900';

    return (
        <section
            id={id}
            className={`scroll-mt-28 rounded-2xl border p-5 shadow-sm sm:p-6 ${highlight} ${className}`}
        >
            <h2 className="flex items-center gap-2 border-b border-zinc-200/80 pb-3 text-sm font-bold uppercase tracking-wide text-zinc-900 dark:border-zinc-700 dark:text-white sm:text-base">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                {title}
            </h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}
