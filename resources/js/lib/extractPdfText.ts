import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { buildPdfTextCacheKey, readPdfTextCache, writePdfTextCache } from '@/lib/pdfTextCache';

GlobalWorkerOptions.workerSrc = pdfWorker;

type PdfTextItem = {
    str: string;
    transform: number[];
    height: number;
};

type PositionedTextItem = {
    str: string;
    x: number;
    y: number;
    height: number;
};

type TextLine = {
    text: string;
    y: number;
    height: number;
};

export type PdfExtractProgress = {
    page: number;
    totalPages: number;
    paragraphs: string[];
    fromCache?: boolean;
};

export type ExtractPdfTextOptions = {
    onProgress?: (progress: PdfExtractProgress) => void;
    signal?: AbortSignal;
    useCache?: boolean;
};

const MIN_USEFUL_CHARS = 40;
const EARLY_EMPTY_PAGE_PROBE = 3;

export async function fetchPdfBytes(url: string): Promise<{ bytes: ArrayBuffer; byteLength: number }> {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
        throw new Error(`Não foi possível carregar o PDF (${response.status}).`);
    }

    const bytes = await response.arrayBuffer();
    return { bytes, byteLength: bytes.byteLength };
}

async function loadPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
    return getDocument({ data: bytes }).promise;
}

function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new DOMException('Extração cancelada.', 'AbortError');
    }
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
    return (
        typeof item === 'object' &&
        item !== null &&
        'str' in item &&
        typeof (item as PdfTextItem).str === 'string' &&
        'transform' in item &&
        Array.isArray((item as PdfTextItem).transform)
    );
}

function sanitizePdfGlyphs(text: string): string {
    return text
        .replace(/[\u00ad\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/\uFFFD/g, '')
        .replace(/[\uE000-\uF8FF]/g, '');
}

function positionedItemsFromPage(pageItems: unknown[]): PositionedTextItem[] {
    return pageItems
        .filter(isPdfTextItem)
        .map((item) => ({
            str: sanitizePdfGlyphs(item.str),
            x: item.transform[4],
            y: item.transform[5],
            height: item.height > 0 ? item.height : Math.abs(item.transform[3]) || 12,
        }))
        .filter((item) => item.str.trim() !== '');
}

function groupItemsIntoLines(items: PositionedTextItem[]): TextLine[] {
    if (items.length === 0) {
        return [];
    }

    const sorted = [...items].sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 1.5) {
            return yDiff;
        }

        return a.x - b.x;
    });

    const lines: { y: number; height: number; parts: { x: number; str: string }[] }[] = [];

    for (const item of sorted) {
        const threshold = Math.max(item.height * 0.55, 3);
        const line = lines.find((entry) => Math.abs(entry.y - item.y) <= threshold);

        if (line) {
            line.parts.push({ x: item.x, str: item.str });
            line.y = (line.y + item.y) / 2;
            line.height = Math.max(line.height, item.height);
        } else {
            lines.push({
                y: item.y,
                height: item.height,
                parts: [{ x: item.x, str: item.str }],
            });
        }
    }

    return lines
        .sort((a, b) => b.y - a.y)
        .map((line) => ({
            y: line.y,
            height: line.height,
            text: line.parts
                .sort((a, b) => a.x - b.x)
                .map((part) => part.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim(),
        }))
        .filter((line) => line.text !== '');
}

export function normalizeParagraphText(text: string): string {
    return text
        // Soft hyphen e caracteres de controle (ex.: backspace nos leaders do sumário).
        .replace(/[\u00ad\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        // Glyphs inválidos do PDF (�) e áreas privadas — comuns em pontinhos do sumário.
        .replace(/\uFFFD/g, '')
        .replace(/[\uE000-\uF8FF]/g, '')
        // Leaders do sumário: sequências de pontos/traços/espaços antes do número da página.
        .replace(/(?:[\s.·•‧⋯…]{2,})(?=\d+\s*$)/g, ' — ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .trim();
}

function joinLineIntoParagraph(current: string, line: string): string {
    const trimmed = line.trim();
    if (!trimmed) {
        return current;
    }

    if (!current) {
        return trimmed;
    }

    if (current.endsWith('-')) {
        return `${current.slice(0, -1)}${trimmed}`;
    }

    return `${current} ${trimmed}`;
}

function linesToParagraphs(lines: TextLine[]): string[] {
    const paragraphs: string[] = [];
    let current = '';

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const previous = index > 0 ? lines[index - 1] : null;

        if (previous) {
            const yGap = previous.y - line.y;
            const avgHeight = (previous.height + line.height) / 2;
            const isParagraphBreak = yGap > avgHeight * 1.75;

            if (isParagraphBreak && current) {
                paragraphs.push(normalizeParagraphText(current));
                current = line.text;
                continue;
            }
        }

        current = joinLineIntoParagraph(current, line.text);
    }

    if (current) {
        paragraphs.push(normalizeParagraphText(current));
    }

    return paragraphs.filter((paragraph) => paragraph.length > 0);
}

function paragraphContinuesFromPrevious(last: string, next: string): boolean {
    return /^[a-záàâãéêíóôõúç]/.test(next) || !/[.!?:"'»]\s*$/.test(last);
}

function mergeIncomingPageParagraphs(finalized: string[], pendingTail: string | null, pageParagraphs: string[]): {
    finalized: string[];
    pendingTail: string | null;
} {
    if (pageParagraphs.length === 0) {
        return { finalized, pendingTail };
    }

    let nextFinalized = [...finalized];
    let nextPending = pendingTail;
    let startIndex = 0;

    if (nextPending) {
        const first = pageParagraphs[0];
        if (paragraphContinuesFromPrevious(nextPending, first)) {
            nextPending = normalizeParagraphText(`${nextPending} ${first}`);
            startIndex = 1;
        } else {
            nextFinalized.push(nextPending);
            nextPending = null;
        }
    }

    for (let index = startIndex; index < pageParagraphs.length; index += 1) {
        if (nextPending) {
            nextFinalized.push(nextPending);
        }
        nextPending = pageParagraphs[index];
    }

    return { finalized: nextFinalized, pendingTail: nextPending };
}

function totalCharCount(paragraphs: string[], pendingTail: string | null): number {
    const body = paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
    return body + (pendingTail?.length ?? 0);
}

async function extractParagraphsFromPage(pdf: PDFDocumentProxy, pageNumber: number): Promise<string[]> {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter(isPdfTextItem);
    const lines = groupItemsIntoLines(positionedItemsFromPage(items));
    return linesToParagraphs(lines);
}

export async function extractPdfTextProgressive(
    url: string,
    options: ExtractPdfTextOptions = {},
): Promise<string[]> {
    const { onProgress, signal, useCache = true } = options;

    throwIfAborted(signal);

    const { bytes, byteLength } = await fetchPdfBytes(url);
    throwIfAborted(signal);

    const cacheKey = buildPdfTextCacheKey(url, byteLength);

    if (useCache) {
        const cached = await readPdfTextCache(cacheKey);
        throwIfAborted(signal);
        if (cached && cached.length > 0) {
            onProgress?.({
                page: cached.length,
                totalPages: cached.length,
                paragraphs: cached,
                fromCache: true,
            });
            return cached;
        }
    }

    const pdf = await loadPdfDocument(bytes);
    throwIfAborted(signal);

    const totalPages = pdf.numPages;
    let finalized: string[] = [];
    let pendingTail: string | null = null;
    let emptyProbeChars = 0;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        throwIfAborted(signal);

        const pageParagraphs = await extractParagraphsFromPage(pdf, pageNumber);
        const merged = mergeIncomingPageParagraphs(finalized, pendingTail, pageParagraphs);
        finalized = merged.finalized;
        pendingTail = merged.pendingTail;

        const visible = pendingTail ? [...finalized, pendingTail] : [...finalized];
        onProgress?.({
            page: pageNumber,
            totalPages,
            paragraphs: visible,
        });

        if (pageNumber <= EARLY_EMPTY_PAGE_PROBE) {
            emptyProbeChars = totalCharCount(finalized, pendingTail);
            if (pageNumber === EARLY_EMPTY_PAGE_PROBE && emptyProbeChars < MIN_USEFUL_CHARS) {
                // Continua até o fim — scans podem ter capa vazia; só falha no final se continuar vazio.
            }
        }

        // Yield to the UI thread between pages on large books.
        await new Promise<void>((resolve) => {
            if (typeof window !== 'undefined') {
                window.setTimeout(resolve, 0);
            } else {
                resolve();
            }
        });
    }

    if (pendingTail) {
        finalized = [...finalized, pendingTail];
    }

    const usefulChars = finalized.reduce((sum, paragraph) => sum + paragraph.length, 0);
    if (finalized.length === 0 || usefulChars < MIN_USEFUL_CHARS) {
        throw new Error('Não foi possível extrair texto legível deste PDF.');
    }

    if (useCache) {
        void writePdfTextCache(cacheKey, finalized);
    }

    onProgress?.({
        page: totalPages,
        totalPages,
        paragraphs: finalized,
    });

    return finalized;
}

/** Extrai todos os parágrafos de uma vez (compatível com usos anteriores). */
export async function extractPdfTextParagraphs(url: string): Promise<string[]> {
    return extractPdfTextProgressive(url, { useCache: true });
}
