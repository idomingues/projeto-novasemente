import {
    BookmarkIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
    clearReadingPosition,
    readReadingPosition,
    type ReadingPosition,
    scrollToWindowY,
    writeReadingPosition,
} from '@/utils/readingPosition';

type Props = {
    contentKey: string;
    ready: boolean;
    segmentIndex?: number;
    getParagraphElements?: () => HTMLElement[];
    onResumeSegment?: (segmentIndex: number) => void;
    className?: string;
    stickyActions?: boolean;
    children?: ReactNode;
};

export default function ReadingPositionControls({
    contentKey,
    ready,
    segmentIndex,
    getParagraphElements,
    onResumeSegment,
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
        setSavedPosition(readReadingPosition(contentKey));
        setResumeDismissed(false);
        setJustSaved(false);
        hasAutoResumedRef.current = false;
    }, [contentKey]);

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

            if (typeof position.paragraphIndex === 'number' && elements.length > 0) {
                elements[position.paragraphIndex]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
                return;
            }

            scrollToWindowY(position.scrollY);
        },
        [getElements, onResumeSegment, segmentIndex],
    );

    useEffect(() => {
        if (!ready || !savedPosition || resumeDismissed || hasAutoResumedRef.current) {
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

        const timer = window.setTimeout(run, 120);
        return () => window.clearTimeout(timer);
    }, [ready, savedPosition, resumeDismissed, segmentIndex, onResumeSegment, resumeToPosition]);

    const handleMark = () => {
        const paragraphElements = getElements();
        const paragraphIndex =
            paragraphElements.length > 0
                ? paragraphElements.findIndex((element) => {
                      const rect = element.getBoundingClientRect();
                      return rect.top >= 0 && rect.top <= window.innerHeight * 0.45;
                  })
                : undefined;

        const resolvedParagraphIndex =
            paragraphIndex !== undefined && paragraphIndex >= 0
                ? paragraphIndex
                : paragraphElements.length > 0
                  ? Math.max(
                        0,
                        paragraphElements.findIndex((element) => element.getBoundingClientRect().bottom > 0),
                    )
                  : undefined;

        const next: Omit<ReadingPosition, 'updatedAt'> = {
            scrollY: window.scrollY,
            segmentIndex,
            paragraphIndex: resolvedParagraphIndex,
        };

        writeReadingPosition(contentKey, next);
        setSavedPosition({ ...next, updatedAt: Date.now() });
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
    };

    const showResumeBanner = ready && savedPosition !== null && !resumeDismissed;

    const actionButtons = (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={handleMark}
                disabled={!ready}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
                {justSaved ? (
                    <CheckIcon className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden />
                ) : (
                    <BookmarkIcon className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {justSaved ? 'Marcador salvo' : 'Marcar onde parei'}
            </button>
            {savedPosition && !showResumeBanner ? (
                <button
                    type="button"
                    onClick={() => savedPosition && resumeToPosition(savedPosition)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-teal-300 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 dark:border-teal-700 dark:bg-zinc-900 dark:text-teal-200 dark:hover:bg-teal-950/40"
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
                        Retomando de onde você parou.
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
                            Continuar
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
                <div className="sticky bottom-3 z-20 mt-3">
                    <div className="rounded-2xl border border-zinc-200/90 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
                        {actionButtons}
                    </div>
                </div>
            ) : (
                <div className="mt-3">{actionButtons}</div>
            )}
        </div>
    );
}
