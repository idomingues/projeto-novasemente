import { Link } from '@inertiajs/react';
import {
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    ChevronRightIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { useEffect, useMemo, useState } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export type HomeModuleSpotlightItem = {
    id: string;
    feature_key?: string | null;
    route: string;
    href: string;
    badge: string;
    title: string;
    subtitle: string;
    cta: string;
    icon_key?: string;
};

export type HomeModuleSpotlightPayload = {
    interval_seconds?: number;
    items?: HomeModuleSpotlightItem[];
    /** Formato antigo (1 campanha no raiz) — ainda aceito para não quebrar deploy parcial. */
    id?: string;
    feature_key?: string | null;
    route?: string;
    href?: string;
    badge?: string;
    title?: string;
    subtitle?: string;
    cta?: string;
    icon_key?: string;
};

const ICONS: Record<string, MenuIcon> = {
    ns_whats: ChatBubbleLeftRightIcon,
    polls: ChartBarIcon,
    sparkles: SparklesIcon,
};

type Props = {
    spotlight: HomeModuleSpotlightPayload;
    isFeatureEnabled?: (featureKey: string) => boolean;
};

function normalizeSpotlight(spotlight: HomeModuleSpotlightPayload): {
    interval_seconds: number;
    items: HomeModuleSpotlightItem[];
} {
    const interval = Math.max(3, Number(spotlight.interval_seconds ?? 6) || 6);

    if (Array.isArray(spotlight.items) && spotlight.items.length > 0) {
        return {
            interval_seconds: interval,
            items: spotlight.items.filter((item) => Boolean(item?.href) && Boolean(item?.title)),
        };
    }

    // Payload legado: um único destaque no objeto raiz.
    if (spotlight.href && spotlight.title) {
        return {
            interval_seconds: interval,
            items: [
                {
                    id: String(spotlight.id ?? 'legacy-spotlight'),
                    feature_key: spotlight.feature_key ?? null,
                    route: String(spotlight.route ?? ''),
                    href: String(spotlight.href),
                    badge: String(spotlight.badge ?? 'Em destaque'),
                    title: String(spotlight.title),
                    subtitle: String(spotlight.subtitle ?? ''),
                    cta: String(spotlight.cta ?? 'Abrir'),
                    icon_key: spotlight.icon_key,
                },
            ],
        };
    }

    return { interval_seconds: interval, items: [] };
}

export default function HomeModuleSpotlightBanner({ spotlight, isFeatureEnabled }: Props) {
    const normalized = useMemo(() => {
        const base = normalizeSpotlight(spotlight);
        const items = base.items.filter((item) => {
            if (!item.feature_key || !isFeatureEnabled) {
                return true;
            }

            return isFeatureEnabled(item.feature_key);
        });

        return { interval_seconds: base.interval_seconds, items };
    }, [spotlight, isFeatureEnabled]);

    const items = normalized.items;
    const intervalMs = normalized.interval_seconds * 1000;
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        setIndex(0);
    }, [items.map((item) => item.id).join('|')]);

    useEffect(() => {
        if (items.length < 2 || paused) {
            return;
        }

        const timer = window.setInterval(() => {
            setIndex((current) => (current + 1) % items.length);
        }, intervalMs);

        return () => window.clearInterval(timer);
    }, [items.length, intervalMs, paused]);

    if (items.length === 0) {
        return null;
    }

    const active = items[Math.min(index, items.length - 1)] ?? items[0];
    const Icon = ICONS[active.icon_key ?? ''] ?? ICONS[active.feature_key ?? ''] ?? SparklesIcon;

    return (
        <section
            aria-label="Módulo em destaque"
            aria-roledescription="carrossel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setPaused(false);
                }
            }}
        >
            <Link
                href={active.href}
                className="group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-[#f5f1e9] px-4 py-4 text-left shadow-sm ring-1 ring-emerald-900/10 transition hover:bg-[#efe9df] active:scale-[0.995] dark:bg-emerald-950 dark:ring-emerald-800/60 dark:hover:bg-emerald-900 sm:gap-4 sm:px-5"
            >
                <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-emerald-600 dark:bg-emerald-400"
                    aria-hidden
                />

                <div
                    key={active.id}
                    className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700/10 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
                        <Icon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                            {active.badge || 'Em destaque'}
                        </p>
                        <h2 className="mt-0.5 truncate text-[17px] font-semibold leading-tight tracking-tight text-emerald-950 dark:text-emerald-50">
                            {active.title}
                        </h2>
                        {active.subtitle ? (
                            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-emerald-900/70 dark:text-emerald-100/75">
                                {active.subtitle}
                            </p>
                        ) : null}
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-0.5 self-center text-[13px] font-medium text-emerald-800 transition group-hover:text-emerald-950 dark:text-emerald-200 dark:group-hover:text-emerald-50">
                        <span className="hidden sm:inline">{active.cta || 'Abrir'}</span>
                        <ChevronRightIcon
                            className="h-4 w-4 transition group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </span>
                </div>
            </Link>

            {items.length > 1 ? (
                <div className="mt-2 flex items-center justify-center gap-1.5" role="tablist" aria-label="Slides em destaque">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={i === index}
                            aria-label={`Mostrar ${item.title}`}
                            onClick={() => setIndex(i)}
                            className={`h-1.5 cursor-pointer rounded-full transition ${
                                i === index
                                    ? 'w-4 bg-emerald-600 dark:bg-emerald-400'
                                    : 'w-1.5 bg-emerald-900/20 hover:bg-emerald-900/35 dark:bg-emerald-100/25 dark:hover:bg-emerald-100/40'
                            }`}
                        />
                    ))}
                </div>
            ) : null}
        </section>
    );
}
