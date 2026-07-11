import { useEffect, useRef, useState } from 'react';
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
            const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-program-slide]'));
            if (slides.length === 0) {
                return;
            }
            const mid = el.scrollLeft + el.clientWidth / 2;
            let best = 0;
            let bestDist = Number.POSITIVE_INFINITY;
            slides.forEach((child, index) => {
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
        window.addEventListener('resize', updateActive);
        return () => {
            el.removeEventListener('scroll', updateActive);
            window.removeEventListener('resize', updateActive);
        };
    }, [cards.length]);

    if (cards.length === 0) {
        return null;
    }

    const showCarouselChrome = cards.length > 1;

    return (
        <section aria-label="Programação semanal" className="min-w-0 space-y-2.5">
            {showCarouselChrome ? (
                <div className="px-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                        Programação
                    </p>
                </div>
            ) : null}

            <div
                ref={scrollerRef}
                className={
                    showCarouselChrome
                        ? 'flex min-w-0 flex-nowrap items-stretch gap-3 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                        : 'min-w-0'
                }
            >
                {cards.map((card, index) => (
                    <div
                        key={card.id}
                        data-program-slide
                        className={
                            showCarouselChrome
                                ? 'flex w-[calc(100%-1.25rem)] max-w-full shrink-0 grow-0 basis-[calc(100%-1.25rem)] snap-start snap-always'
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
