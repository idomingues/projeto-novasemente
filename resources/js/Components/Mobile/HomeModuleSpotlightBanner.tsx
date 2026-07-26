import { Link } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export type HomeModuleSpotlightPayload = {
    id: string;
    feature_key?: string | null;
    route: string;
    href: string;
    badge: string;
    title: string;
    subtitle: string;
    cta: string;
};

type Props = {
    spotlight: HomeModuleSpotlightPayload;
};

export default function HomeModuleSpotlightBanner({ spotlight }: Props) {
    return (
        <section aria-label="Módulo em destaque">
            <Link
                href={spotlight.href}
                className="group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl bg-[#f5f1e9] px-4 py-4 text-left shadow-sm ring-1 ring-emerald-900/10 transition hover:bg-[#efe9df] active:scale-[0.995] dark:bg-emerald-950 dark:ring-emerald-800/60 dark:hover:bg-emerald-900 sm:px-5"
            >
                <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-emerald-600 dark:bg-emerald-400"
                    aria-hidden
                />

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700/10 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                        {spotlight.badge}
                    </p>
                    <h2 className="mt-0.5 text-[17px] font-semibold leading-tight tracking-tight text-emerald-950 dark:text-emerald-50">
                        {spotlight.title}
                    </h2>
                    {spotlight.subtitle ? (
                        <p className="mt-0.5 text-[13px] leading-snug text-emerald-900/65 dark:text-emerald-100/70">
                            {spotlight.subtitle}
                        </p>
                    ) : null}
                </div>

                <span className="inline-flex shrink-0 items-center gap-0.5 self-center text-[13px] font-medium text-emerald-800 transition group-hover:text-emerald-950 dark:text-emerald-200 dark:group-hover:text-emerald-50">
                    <span className="hidden sm:inline">{spotlight.cta}</span>
                    <ChevronRightIcon
                        className="h-4 w-4 transition group-hover:translate-x-0.5"
                        aria-hidden
                    />
                </span>
            </Link>
        </section>
    );
}
