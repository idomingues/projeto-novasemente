import {
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
        onMarkedParagraphChange?.(null);
    };

    const showResumeBanner = ready && savedPosition !== null && !resumeDismissed;
    const canMark = ready && paragraphCount > 0;

    const actionButtons = (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={handleMark}
                disabled={!canMark}
                className="inline-flex min-h-11 flex-1 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500 sm:flex-none"
            >
                {justSaved ? (
                    <CheckIcon className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                    <BookmarkIcon className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {justSaved ? 'Marcador salvo' : 'Marcar onde parei'}
            </button>
            {savedPosition ? (
                <button
                    type="button"
                    onClick={() => savedPosition && resumeToPosition(savedPosition)}
                    className="inline-flex min-h-11 cursor-pointer touch-manipulation items-center justify-center rounded-2xl border border-teal-300 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 dark:border-teal-700 dark:bg-zinc-900 dark:text-teal-200 dark:hover:bg-teal-950/40"
                >
                    Ir ao marcador
                </button>
            ) : null}
        </div>
    );

    return (
        <div className={className}>
            {showResumeBanner ? (
                <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-800/70 dark:bg-teal-950/40 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-teal-950 dark:text-teal-100">
                        Você tem um marcador neste livro.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (savedPosition) {
                                    resumeToPosition(savedPosition);
                                }
                            }}
                            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-teal-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 dark:bg-teal-200 dark:text-teal-950 dark:hover:bg-white"
                        >
                            Continuar daqui
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-900 transition hover:bg-teal-100 dark:border-teal-700 dark:bg-transparent dark:text-teal-100 dark:hover:bg-teal-900/50"
                        >
                            <XMarkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Começar do início
                        </button>
                    </div>
                </div>
            ) : null}

            {children}

            {stickyActions ? (
                <>
                    {/* Espaço para a barra fixa + bottom nav não cobrirem o fim do texto. */}
                    <div className="h-28" aria-hidden />
                    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-30 px-4 sm:px-6 lg:px-8">
                        <div className="pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl border border-zinc-200/90 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
                            {actionButtons}
                        </div>
                    </div>
                </>
            ) : (
                <div className="mt-3">{actionButtons}</div>
            )}
        </div>
    );
}
