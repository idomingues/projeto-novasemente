import { useEffect, useRef, useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import WeeklyProgramHomeCard, { type WeeklyProgramHomeCardData } from '@/Components/Mobile/WeeklyProgramHomeCard';

type Props = {
    cards: WeeklyProgramHomeCardData[];
    appUrl?: string;
};

export default function WeeklyProgramHomeCarousel({ cards, appUrl = '' }: Props) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el || cards.length <= 1) {
            return;
        }

        const updateActive = () => {
            const children = Array.from(el.children) as HTMLElement[];
            if (children.length === 0) {
                return;
            }
            const mid = el.scrollLeft + el.clientWidth / 2;
            let best = 0;
            let bestDist = Number.POSITIVE_INFINITY;
            children.forEach((child, index) => {
                const center = child.offsetLeft + child.offsetWidth / 2;
                const dist = Math.abs(center - mid);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = index;
                }
            });
            setActiveIndex(best);
        };

        updateActive();
        el.addEventListener('scroll', updateActive, { passive: true });
        return () => el.removeEventListener('scroll', updateActive);
    }, [cards.length]);

    if (cards.length === 0) {
        return null;
    }

    const showCarouselChrome = cards.length > 1;

    return (
        <section aria-label="Programação semanal" className="space-y-2.5">
            {showCarouselChrome ? (
                <div className="flex items-center justify-between gap-3 px-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                        Programação
                    </p>
                    <p className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                        Deslize
                        <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.2} />
                    </p>
                </div>
            ) : null}

            <div
                ref={scrollerRef}
                className={
                    showCarouselChrome
                        ? '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-0 sm:px-0'
                        : ''
                }
            >
                {cards.map((card, index) => (
                    <div
                        key={card.id}
                        className={
                            showCarouselChrome
                                ? 'w-[min(100%,22.5rem)] shrink-0 snap-center sm:w-[min(100%,26rem)] lg:w-[min(100%,28rem)]'
                                : 'w-full'
                        }
                    >
                        <WeeklyProgramHomeCard
                            card={card}
                            appUrl={appUrl}
                            isNext={card.is_next ?? index === 0}
                        />
                    </div>
                ))}
                {showCarouselChrome ? <div className="w-2 shrink-0 snap-end" aria-hidden /> : null}
            </div>

            {showCarouselChrome ? (
                <div className="flex items-center justify-center gap-1.5 pt-0.5" aria-hidden>
                    {cards.map((card, index) => (
                        <span
                            key={card.id}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                index === activeIndex
                                    ? 'w-4 bg-emerald-700 dark:bg-emerald-400'
                                    : 'w-1.5 bg-zinc-300 dark:bg-zinc-600'
                            }`}
                        />
                    ))}
                </div>
            ) : null}
        </section>
    );
}
