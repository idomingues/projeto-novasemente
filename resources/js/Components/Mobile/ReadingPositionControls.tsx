import {
    ArrowUturnUpIcon,
    BookmarkIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
    clearReadingPosition,
    getVisibleParagraphIndex,
    readReadingPosition,
    type ReadingPosition,
    scrollToWindowY,
    writeReadingPosition,
} from '@/utils/readingPosition';

type Props = {
    contentKey: string;
    /** Há conteúdo suficiente para marcar e (quando possível) retomar. */
    ready: boolean;
    segmentIndex?: number;
    /** Quantidade atual de parágrafos no DOM (para retomar durante extração progressiva). */
    paragraphCount?: number;
    getParagraphElements?: () => HTMLElement[];
    onResumeSegment?: (segmentIndex: number) => void;
    onMarkedParagraphChange?: (paragraphIndex: number | null) => void;
    className?: string;
    /** Barra flutuante fixa acima da bottom nav (leitura longa). */
    stickyActions?: boolean;
    children?: ReactNode;
};

function getScrollParent(element: HTMLElement | null): HTMLElement | Window {
    if (!element || typeof window === 'undefined') {
        return window;
    }

    let current: HTMLElement | null = element.parentElement;
    while (current) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;
        if (
            (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
            current.scrollHeight > current.clientHeight
        ) {
            return current;
        }
        current = current.parentElement;
    }

    return window;
}

function readScrollY(scrollParent: HTMLElement | Window): number {
    if (scrollParent === window) {
        return window.scrollY;
    }

    return (scrollParent as HTMLElement).scrollTop;
}

export default function ReadingPositionControls({
    contentKey,
    ready,
    segmentIndex,
    paragraphCount = 0,
    getParagraphElements,
    onResumeSegment,
    onMarkedParagraphChange,
    className = '',
    stickyActions = false,
    children,
}: Props) {
    const [savedPosition, setSavedPosition] = useState<ReadingPosition | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const [resumeDismissed, setResumeDismissed] = useState(false);
    const saveTimerRef = useRef<number | null>(null);
    const hasAutoResumedRef = useRef(false);

    useEffect(() => {
        const position = readReadingPosition(contentKey);
        setSavedPosition(position);
        setResumeDismissed(false);
        setJustSaved(false);
        hasAutoResumedRef.current = false;
        onMarkedParagraphChange?.(
            typeof position?.paragraphIndex === 'number' ? position.paragraphIndex : null,
        );
    }, [contentKey, onMarkedParagraphChange]);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current !== null) {
                window.clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

    const getElements = useCallback(() => getParagraphElements?.() ?? [], [getParagraphElements]);

    const resumeToPosition = useCallback(
        (position: ReadingPosition) => {
            const elements = getElements();

            if (
                typeof position.segmentIndex === 'number' &&
                typeof segmentIndex === 'number' &&
                position.segmentIndex !== segmentIndex
            ) {
                onResumeSegment?.(position.segmentIndex);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const nextElements = getElements();
                        if (typeof position.paragraphIndex === 'number' && nextElements.length > 0) {
                            nextElements[position.paragraphIndex]?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                            });
                            return;
                        }
                        scrollToWindowY(position.scrollY);
                    });
                });
                return;
            }

            if (typeof position.paragraphIndex === 'number' && elements.length > position.paragraphIndex) {
                elements[position.paragraphIndex]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
                return;
            }

            const scrollParent = getScrollParent(elements[0] ?? null);
            if (scrollParent === window) {
                scrollToWindowY(position.scrollY);
            } else {
                (scrollParent as HTMLElement).scrollTo({
                    top: Math.max(0, position.scrollY),
                    behavior: 'smooth',
                });
            }
        },
        [getElements, onResumeSegment, segmentIndex],
    );

    useEffect(() => {
        if (!ready || !savedPosition || resumeDismissed || hasAutoResumedRef.current) {
            return;
        }

        const targetIndex = savedPosition.paragraphIndex;
        // Em extração progressiva, só retoma quando o parágrafo salvo já existe no DOM.
        if (typeof targetIndex === 'number' && paragraphCount <= targetIndex) {
            return;
        }

        hasAutoResumedRef.current = true;

        const run = () => resumeToPosition(savedPosition);

        if (
            typeof savedPosition.segmentIndex === 'number' &&
            typeof segmentIndex === 'number' &&
            savedPosition.segmentIndex !== segmentIndex
        ) {
            onResumeSegment?.(savedPosition.segmentIndex);
            const timer = window.setTimeout(run, 220);
            return () => window.clearTimeout(timer);
        }

        const timer = window.setTimeout(run, 160);
        return () => window.clearTimeout(timer);
    }, [
        ready,
        savedPosition,
        resumeDismissed,
        segmentIndex,
        onResumeSegment,
        resumeToPosition,
        paragraphCount,
    ]);

    const handleMark = () => {
        const paragraphElements = getElements();
        if (paragraphElements.length === 0) {
            return;
        }

        const resolvedParagraphIndex = getVisibleParagraphIndex(paragraphElements);
        const scrollParent = getScrollParent(paragraphElements[resolvedParagraphIndex] ?? paragraphElements[0]);

        const next: Omit<ReadingPosition, 'updatedAt'> = {
            scrollY: readScrollY(scrollParent),
            segmentIndex,
            paragraphIndex: resolvedParagraphIndex,
        };

        writeReadingPosition(contentKey, next);
        setSavedPosition({ ...next, updatedAt: Date.now() });
        onMarkedParagraphChange?.(resolvedParagraphIndex);
        setJustSaved(true);

        if (saveTimerRef.current !== null) {
            window.clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = window.setTimeout(() => setJustSaved(false), 2500);
    };

    const handleClear = () => {
        clearReadingPosition(contentKey);
        setSavedPosition(null);
        setResumeDismissed(true);
        setJustSaved(false);
        hasAutoResumedRef.current = true;
        onMarkedParagraphChange?.(null);
        if (saveTimerRef.current !== null) {
            window.clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
    };

    const showResumeBanner = ready && savedPosition !== null && !resumeDismissed;
    const canMark = ready && paragraphCount > 0;
    const markLabel = justSaved ? 'Salvo' : savedPosition ? 'Atualizar' : 'Marcar';

    const iconBtnClass =
        'inline-flex h-8 w-8 cursor-pointer touch-manipulation items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

    const actionButtons = (
        <div
            className="inline-flex items-center gap-0.5 rounded-full bg-white/95 p-1 shadow-sm ring-1 ring-zinc-200/90 backdrop-blur-md dark:bg-zinc-900/95 dark:ring-zinc-700/90"
            role="toolbar"
            aria-label="Marcador de leitura"
        >
            <button
                type="button"
                onClick={handleMark}
                disabled={!canMark}
                className="inline-flex h-8 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full bg-teal-50 px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-900/70"
                aria-label={
                    justSaved
                        ? 'Marcador salvo'
                        : savedPosition
                          ? 'Atualizar marcador'
                          : 'Marcar onde parei'
                }
                title={
                    justSaved
                        ? 'Marcador salvo'
                        : savedPosition
                          ? 'Atualizar marcador'
                          : 'Marcar onde parei'
                }
            >
                {justSaved ? (
                    <CheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                    <BookmarkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span>{markLabel}</span>
            </button>

            {savedPosition ? (
                <>
                    <button
                        type="button"
                        onClick={() => resumeToPosition(savedPosition)}
                        className={iconBtnClass}
                        aria-label="Ir ao marcador"
                        title="Ir ao marcador"
                    >
                        <ArrowUturnUpIcon className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className={iconBtnClass}
                        aria-label="Remover marcador"
                        title="Remover marcador"
                    >
                        <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
                    </button>
                </>
            ) : null}
        </div>
    );

    return (
        <div className={className}>
            {showResumeBanner ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200/90 dark:bg-zinc-900/80 dark:ring-zinc-700/90">
                    <p className="min-w-0 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Continuar de onde parou?
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                if (savedPosition) {
                                    resumeToPosition(savedPosition);
                                }
                            }}
                            className="inline-flex h-7 cursor-pointer items-center rounded-full bg-teal-700 px-2.5 text-[11px] font-semibold text-white transition hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                        >
                            Continuar
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="inline-flex h-7 cursor-pointer items-center rounded-full px-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                            Ignorar
                        </button>
                    </div>
                </div>
            ) : null}

            {children}

            {stickyActions ? (
                <>
                    <div className="h-14" aria-hidden />
                    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-30 flex justify-center px-4">
                        <div className="pointer-events-auto">{actionButtons}</div>
                    </div>
                </>
            ) : (
                <div className="mt-3 flex justify-center">{actionButtons}</div>
            )}
        </div>
    );
}
