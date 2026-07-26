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
                className="group relative flex cursor-pointer overflow-hidden rounded-2xl bg-zinc-900 p-4 text-left shadow-sm ring-1 ring-zinc-900/10 transition hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:ring-white/10 dark:hover:bg-zinc-100 sm:p-5"
            >
                <div className="relative z-[1] flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white dark:bg-zinc-900/10 dark:text-zinc-900">
                        <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 dark:bg-emerald-600/15 dark:text-emerald-800">
                            {spotlight.badge}
                        </span>
                        <h2 className="mt-1.5 text-lg font-bold leading-tight text-white dark:text-zinc-900">
                            {spotlight.title}
                        </h2>
                        {spotlight.subtitle ? (
                            <p className="mt-1 text-sm leading-snug text-zinc-300 dark:text-zinc-600">
                                {spotlight.subtitle}
                            </p>
                        ) : null}
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white dark:text-zinc-900">
                            {spotlight.cta}
                            <ChevronRightIcon
                                className="h-4 w-4 transition group-hover:translate-x-0.5"
                                aria-hidden
                            />
                        </span>
                    </div>
                </div>
            </Link>
        </section>
    );
}
