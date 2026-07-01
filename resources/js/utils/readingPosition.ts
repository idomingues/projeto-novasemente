const STORAGE_PREFIX = 'ns:reading-position:v1:';

export type ReadingPosition = {
    scrollY: number;
    paragraphIndex?: number;
    segmentIndex?: number;
    updatedAt: number;
};

export function readReadingPosition(contentKey: string): ReadingPosition | null {
    if (typeof window === 'undefined' || !contentKey.trim()) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${contentKey}`);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<ReadingPosition>;
        const scrollY = typeof parsed.scrollY === 'number' ? parsed.scrollY : Number(parsed.scrollY);
        if (!Number.isFinite(scrollY) || scrollY < 0) {
            return null;
        }

        const paragraphIndex =
            typeof parsed.paragraphIndex === 'number'
                ? parsed.paragraphIndex
                : parsed.paragraphIndex !== undefined
                  ? Number(parsed.paragraphIndex)
                  : undefined;
        const segmentIndex =
            typeof parsed.segmentIndex === 'number'
                ? parsed.segmentIndex
                : parsed.segmentIndex !== undefined
                  ? Number(parsed.segmentIndex)
                  : undefined;
        const updatedAt =
            typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Number(parsed.updatedAt);

        return {
            scrollY,
            paragraphIndex:
                paragraphIndex !== undefined && Number.isFinite(paragraphIndex) && paragraphIndex >= 0
                    ? paragraphIndex
                    : undefined,
            segmentIndex:
                segmentIndex !== undefined && Number.isFinite(segmentIndex) && segmentIndex >= 0
                    ? segmentIndex
                    : undefined,
            updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        };
    } catch {
        return null;
    }
}

export function writeReadingPosition(
    contentKey: string,
    value: Omit<ReadingPosition, 'updatedAt'>,
): void {
    if (typeof window === 'undefined' || !contentKey.trim()) {
        return;
    }

    try {
        const payload: ReadingPosition = { ...value, updatedAt: Date.now() };
        window.localStorage.setItem(`${STORAGE_PREFIX}${contentKey}`, JSON.stringify(payload));
    } catch {
        // ignore (private mode / quota)
    }
}

export function clearReadingPosition(contentKey: string): void {
    if (typeof window === 'undefined' || !contentKey.trim()) {
        return;
    }

    try {
        window.localStorage.removeItem(`${STORAGE_PREFIX}${contentKey}`);
    } catch {
        // ignore
    }
}

export function getVisibleParagraphIndex(elements: HTMLElement[]): number {
    if (elements.length === 0) {
        return 0;
    }

    const viewportMid = window.innerHeight / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
            return;
        }

        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportMid);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });

    return bestIndex;
}

export function scrollToParagraph(elements: HTMLElement[], index: number): void {
    const target = elements[index];
    if (!target) {
        return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function scrollToWindowY(scrollY: number): void {
    window.scrollTo({ top: Math.max(0, scrollY), behavior: 'smooth' });
}
