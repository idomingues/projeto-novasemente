import { Link } from '@inertiajs/react';
import {
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    ChevronRightIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, PointerEvent as ReactPointerEvent, SVGProps } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
    home_card_id?: string | null;
};

export type HomeModuleSpotlightPayload = {
    interval_seconds?: number;
    items?: HomeModuleSpotlightItem[];
    /** Cards da Home em destaque no período (ordem do pin). */
    home_card_ids?: string[];
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
    home_card_id?: string | null;
};

const ICONS: Record<string, MenuIcon> = {
    ns_whats: ChatBubbleLeftRightIcon,
    polls: ChartBarIcon,
    sparkles: SparklesIcon,
};

const SWIPE_THRESHOLD_PX = 48;

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

    if (spotlight.href && spotlight.title) {
        return {
            interval_seconds: interval,
            items: [
                {
                    id: String(spotlight.id ?? 'legacy-spotlight'),
                    feature_key: spotlight.feature_key ?? null,
                    route: String(spotlight.route ?? ''),
                    href: String(spotlight.href),
                    badge: String(spotlight.badge ?? 'New'),
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
    const [dragOffset, setDragOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        lastX: number;
        axis: 'undecided' | 'horizontal' | 'vertical';
        moved: boolean;
    } | null>(null);
    const suppressClickRef = useRef(false);

    useEffect(() => {
        setIndex(0);
        setDragOffset(0);
    }, [items.map((item) => item.id).join('|')]);

    useEffect(() => {
        if (items.length < 2 || paused || dragging) {
            return;
        }

        const timer = window.setInterval(() => {
            setIndex((current) => (current + 1) % items.length);
        }, intervalMs);

        return () => window.clearInterval(timer);
    }, [items.length, intervalMs, paused, dragging]);

    if (items.length === 0) {
        return null;
    }

    const canSwipe = items.length > 1;
    const active = items[Math.min(index, items.length - 1)] ?? items[0];
    const Icon = ICONS[active.icon_key ?? ''] ?? ICONS[active.feature_key ?? ''] ?? SparklesIcon;

    const goRelative = (delta: number) => {
        setIndex((current) => {
            const next = (current + delta) % items.length;
            return next < 0 ? next + items.length : next;
        });
    };

    const endDrag = (clientX: number) => {
        const drag = dragRef.current;
        dragRef.current = null;
        setDragging(false);
        setPaused(false);

        if (!drag || !canSwipe || drag.axis !== 'horizontal') {
            setDragOffset(0);
            return;
        }

        const dx = clientX - drag.startX;
        if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
            // Arrastar para a esquerda → próximo; para a direita → anterior.
            goRelative(dx < 0 ? 1 : -1);
            suppressClickRef.current = true;
            window.setTimeout(() => {
                suppressClickRef.current = false;
            }, 350);
        }
        setDragOffset(0);
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
        if (!canSwipe || event.button !== 0) {
            return;
        }
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            axis: 'undecided',
            moved: false,
        };
        setPaused(true);
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            //
        }
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        if (drag.axis === 'undecided') {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
                return;
            }
            drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
            if (drag.axis === 'vertical') {
                // Deixa o scroll da página seguir; encerra o gesto do carrossel.
                dragRef.current = null;
                setDragging(false);
                setDragOffset(0);
                setPaused(false);
                return;
            }
            setDragging(true);
        }

        if (drag.axis !== 'horizontal') {
            return;
        }

        event.preventDefault();
        drag.lastX = event.clientX;
        drag.moved = Math.abs(dx) > 6;
        // Resistência leve nas bordas visuais.
        setDragOffset(Math.max(-120, Math.min(120, dx * 0.85)));
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLAnchorElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        endDrag(event.clientX);
    };

    const onPointerCancel = () => {
        dragRef.current = null;
        setDragging(false);
        setDragOffset(0);
        setPaused(false);
    };

    return (
        <section
            aria-label="Módulo em destaque"
            aria-roledescription="carrossel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => {
                if (!dragging) {
                    setPaused(false);
                }
            }}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !dragging) {
                    setPaused(false);
                }
            }}
        >
            <Link
                href={active.href}
                draggable={false}
                onClick={(e) => {
                    if (suppressClickRef.current || dragging || Math.abs(dragOffset) > 8) {
                        e.preventDefault();
                    }
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                className={`group relative flex touch-pan-y select-none items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 via-[#f5f1e9] to-amber-50 px-4 py-4 text-left shadow-sm ring-1 ring-teal-700/15 transition hover:from-teal-100/80 hover:via-[#efe9df] hover:to-amber-100/70 dark:from-teal-950 dark:via-emerald-950 dark:to-zinc-900 dark:ring-teal-700/50 dark:hover:from-teal-900 dark:hover:via-emerald-900 dark:hover:to-zinc-800 sm:gap-4 sm:px-5 ${
                    canSwipe ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer active:scale-[0.995]'
                }`}
                style={{ WebkitUserSelect: 'none' }}
                aria-label={`${active.badge}: ${active.title}. ${canSwipe ? 'Arraste para ver o próximo ou o anterior.' : ''}`}
            >
                <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-teal-600 dark:bg-teal-400"
                    aria-hidden
                />

                <div
                    key={active.id}
                    className={`flex min-w-0 flex-1 items-center gap-3 sm:gap-4 ${
                        dragging ? '' : 'transition-transform duration-300 ease-out'
                    }`}
                    style={{ transform: `translateX(${dragOffset}px)` }}
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700/12 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200">
                        <Icon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="inline-flex items-center rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white dark:bg-teal-400 dark:text-teal-950">
                            {active.badge || 'New'}
                        </p>
                        <h2 className="mt-1 truncate text-[17px] font-semibold leading-tight tracking-tight text-teal-950 dark:text-teal-50">
                            {active.title}
                        </h2>
                        {active.subtitle ? (
                            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-teal-900/70 dark:text-teal-100/75">
                                {active.subtitle}
                            </p>
                        ) : null}
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-0.5 self-center text-[13px] font-medium text-teal-800 transition group-hover:text-teal-950 dark:text-teal-200 dark:group-hover:text-teal-50">
                        <span className="hidden sm:inline">{active.cta || 'Abrir'}</span>
                        <ChevronRightIcon
                            className="h-4 w-4 transition group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </span>
                </div>
            </Link>

            {canSwipe ? (
                <div className="mt-2 flex items-center justify-center gap-1.5" role="tablist" aria-label="Slides em destaque">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={i === index}
                            aria-label={`Mostrar ${item.title}`}
                            onClick={() => {
                                setIndex(i);
                                setPaused(true);
                                window.setTimeout(() => setPaused(false), intervalMs);
                            }}
                            className={`h-1.5 cursor-pointer rounded-full transition ${
                                i === index
                                    ? 'w-4 bg-teal-600 dark:bg-teal-400'
                                    : 'w-1.5 bg-teal-900/20 hover:bg-teal-900/35 dark:bg-teal-100/25 dark:hover:bg-teal-100/40'
                            }`}
                        />
                    ))}
                </div>
            ) : null}
        </section>
    );
}
