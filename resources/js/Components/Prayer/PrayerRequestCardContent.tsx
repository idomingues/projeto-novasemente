import PrayerAmenButton from '@/Components/PrayerAmenButton';
import { prayerDisplayName, type PrayerDisplayItem } from '@/utils/prayerDisplayName';
import { useLayoutEffect, useRef, useState } from 'react';

interface PrayerRequestCardContentProps {
    item: PrayerDisplayItem & {
        id: number;
        request: string;
        created_at?: string;
        prayer_amen_count?: number;
    };
    showAmen?: boolean;
    className?: string;
}

const DATE_TZ = 'America/Sao_Paulo';

function formatPrayerDay(iso: string | undefined): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const sameYear =
        date.toLocaleString('en-US', { year: 'numeric', timeZone: DATE_TZ }) ===
        now.toLocaleString('en-US', { year: 'numeric', timeZone: DATE_TZ });

    return date
        .toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            ...(sameYear ? {} : { year: 'numeric' }),
            timeZone: DATE_TZ,
        })
        .replace('.', '');
}

function isElementClamped(element: HTMLElement): boolean {
    return element.scrollHeight > element.clientHeight + 1;
}

export default function PrayerRequestCardContent({
    item,
    showAmen = true,
    className = '',
}: PrayerRequestCardContentProps) {
    const [expanded, setExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);
    const displayName = prayerDisplayName(item);
    const dayLabel = formatPrayerDay(item.created_at);

    useLayoutEffect(() => {
        if (expanded) {
            return;
        }

        const element = textRef.current;
        if (!element) {
            return;
        }

        const updateClamped = () => {
            setIsClamped(isElementClamped(element));
        };

        updateClamped();

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(updateClamped)
            : null;

        observer?.observe(element);
        window.addEventListener('resize', updateClamped);

        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', updateClamped);
        };
    }, [item.request, displayName, className, expanded]);

    return (
        <>
            {displayName || dayLabel ? (
                <div className={`flex items-baseline gap-3 ${displayName ? 'justify-between' : 'justify-end'}`}>
                    {displayName ? (
                        <p className="min-w-0 truncate font-semibold text-zinc-900 dark:text-white">{displayName}</p>
                    ) : null}
                    {dayLabel ? (
                        <time
                            dateTime={item.created_at}
                            className="shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500"
                        >
                            {dayLabel}
                        </time>
                    ) : null}
                </div>
            ) : null}
            <p
                ref={textRef}
                className={`text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'} ${displayName || dayLabel ? 'mt-1' : ''} ${className}`}
            >
                {item.request}
            </p>
            {isClamped || expanded ? (
                <button
                    type="button"
                    onClick={() => setExpanded((current) => !current)}
                    className="mt-1.5 cursor-pointer text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
                    aria-expanded={expanded}
                >
                    {expanded ? 'Ver menos' : 'Ver pedido completo'}
                </button>
            ) : null}
            {showAmen ? (
                <div className="mt-3">
                    <PrayerAmenButton prayerId={item.id} count={item.prayer_amen_count ?? 0} />
                </div>
            ) : null}
        </>
    );
}
