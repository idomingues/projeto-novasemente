import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function readStoredWidth(storageKey: string, defaultWidth: number, min: number, max: number): number {
    if (typeof window === 'undefined') {
        return defaultWidth;
    }
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return defaultWidth;
        }
        const n = Number.parseInt(raw, 10);
        if (!Number.isFinite(n)) {
            return defaultWidth;
        }
        return clamp(n, min, max);
    } catch {
        return defaultWidth;
    }
}

type Options = {
    storageKey: string;
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
};

/**
 * Largura de painel lateral redimensionável (arrastar). Persiste em localStorage.
 */
export function useResizablePaneWidth({ storageKey, defaultWidth, minWidth, maxWidth }: Options) {
    const [width, setWidth] = useState(() => readStoredWidth(storageKey, defaultWidth, minWidth, maxWidth));
    const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

    const persist = useCallback(
        (next: number) => {
            const clamped = clamp(next, minWidth, maxWidth);
            setWidth(clamped);
            try {
                localStorage.setItem(storageKey, String(clamped));
            } catch {
                /* ignore quota */
            }
        },
        [maxWidth, minWidth, storageKey],
    );

    const resetWidth = useCallback(() => {
        persist(defaultWidth);
    }, [defaultWidth, persist]);

    const onSeparatorMouseDown = useCallback(
        (e: ReactMouseEvent) => {
            e.preventDefault();
            dragRef.current = { startX: e.clientX, startWidth: width };
        },
        [width],
    );

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) {
                return;
            }
            const delta = e.clientX - dragRef.current.startX;
            persist(dragRef.current.startWidth + delta);
        };

        const onUp = () => {
            if (!dragRef.current) {
                return;
            }
            dragRef.current = null;
            document.body.style.removeProperty('cursor');
            document.body.style.removeProperty('user-select');
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [persist]);

    const onSeparatorMouseDownWithBody = useCallback(
        (e: ReactMouseEvent) => {
            onSeparatorMouseDown(e);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        },
        [onSeparatorMouseDown],
    );

    return {
        width,
        resetWidth,
        onSeparatorMouseDown: onSeparatorMouseDownWithBody,
    };
}
