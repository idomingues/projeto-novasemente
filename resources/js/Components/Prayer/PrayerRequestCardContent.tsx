import Modal from '@/Components/Modal';
import PrayerAmenButton from '@/Components/PrayerAmenButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { prayerDisplayName, type PrayerDisplayItem } from '@/utils/prayerDisplayName';
import { useLayoutEffect, useRef, useState } from 'react';

interface PrayerRequestCardContentProps {
    item: PrayerDisplayItem & {
        id: number;
        request: string;
        prayer_amen_count?: number;
    };
    showAmen?: boolean;
    className?: string;
}

function isElementClamped(element: HTMLElement): boolean {
    return element.scrollHeight > element.clientHeight + 1;
}

export default function PrayerRequestCardContent({
    item,
    showAmen = true,
    className = '',
}: PrayerRequestCardContentProps) {
    const [detailOpen, setDetailOpen] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);
    const displayName = prayerDisplayName(item);

    useLayoutEffect(() => {
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
    }, [item.request, displayName, className]);

    return (
        <>
            {displayName ? (
                <p className="font-semibold text-zinc-900 dark:text-white">{displayName}</p>
            ) : null}
            <p
                ref={textRef}
                className={`text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap line-clamp-4 ${displayName ? 'mt-1' : ''} ${className}`}
            >
                {item.request}
            </p>
            {isClamped ? (
                <button
                    type="button"
                    onClick={() => setDetailOpen(true)}
                    className="mt-1.5 cursor-pointer text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
                >
                    Ver pedido completo
                </button>
            ) : null}
            {showAmen ? (
                <div className="mt-3">
                    <PrayerAmenButton prayerId={item.id} count={item.prayer_amen_count ?? 0} />
                </div>
            ) : null}

            <Modal show={detailOpen} onClose={() => setDetailOpen(false)}>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {displayName ?? 'Pedido de oração'}
                    </h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {item.request}
                    </p>
                    {showAmen ? (
                        <div className="mt-5">
                            <PrayerAmenButton prayerId={item.id} count={item.prayer_amen_count ?? 0} />
                        </div>
                    ) : null}
                    <div className="mt-6 flex justify-end">
                        <SecondaryButton type="button" onClick={() => setDetailOpen(false)}>
                            Fechar
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </>
    );
}
