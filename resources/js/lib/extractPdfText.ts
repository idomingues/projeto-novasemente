import { type PDFDocumentProxy } from 'pdfjs-dist';
import { buildPdfTextCacheKey, readPdfTextCache, writePdfTextCache } from '@/lib/pdfTextCache';
import { fetchPdfBytes, loadPdfDocument, throwIfAborted } from '@/lib/pdfjsClient';

type PdfTextItem = {
    str: string;
    transform: number[];
    height: number;
    width?: number;
};

export type PositionedTextItem = {
    str: string;
    x: number;
    y: number;
    height: number;
    width: number;
};

export type TextLine = {
    text: string;
    y: number;
    height: number;
    x0: number;
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

export { fetchPdfBytes, loadPdfDocument };

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

/** Junta letras artificialmente espaçadas: "G U I A" → "GUIA". */
export function collapseSpacedLetters(text: string): string {
    return text.replace(/(?<![A-Za-zÀ-ÿ])((?:[A-Za-zÀ-ÿ]\s+){2,}[A-Za-zÀ-ÿ])(?![A-Za-zÀ-ÿ])/g, (match) =>
        match.replace(/\s+/g, ''),
    );
}

export function normalizeParagraphText(text: string): string {
    return collapseSpacedLetters(
        text
            .replace(/[\u00ad\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
            .replace(/\uFFFD/g, '')
            .replace(/[\uE000-\uF8FF]/g, '')
            .replace(/(?:[\s.·•‧⋯…]{2,})(?=\d+\s*$)/g, ' — ')
            .replace(/\s+/g, ' ')
            .replace(/\s+([,.;:!?])/g, '$1')
            .replace(/([(\[])\s+/g, '$1')
            .replace(/\s+([)\]])/g, '$1')
            .trim(),
    );
}

function estimatedWidth(item: PositionedTextItem): number {
    if (item.width > 0) {
        return item.width;
    }

    return Math.max(item.str.length, 1) * item.height * 0.5;
}

function joinLineParts(parts: PositionedTextItem[]): string {
    if (parts.length === 0) {
        return '';
    }

    const sorted = [...parts].sort((a, b) => a.x - b.x);
    let text = sorted[0].str;
    let prev = sorted[0];

    for (let index = 1; index < sorted.length; index += 1) {
        const current = sorted[index];
        const gap = current.x - (prev.x + estimatedWidth(prev));
        const spaceThreshold = Math.max(prev.height, current.height) * 0.28;

        if (gap > spaceThreshold || (/\s$/.test(text) === false && /^\s/.test(current.str))) {
            if (!/\s$/.test(text) && !/^\s/.test(current.str) && gap > spaceThreshold * 0.35) {
                text += ' ';
            }
        }

        text += current.str.replace(/^\s+/, '');
        prev = current;
    }

    return text.replace(/\s+/g, ' ').trim();
}

export function positionedItemsFromPage(pageItems: unknown[]): PositionedTextItem[] {
    return pageItems
        .filter(isPdfTextItem)
        .map((item) => {
            const height = item.height > 0 ? item.height : Math.abs(item.transform[3]) || 12;
            const width =
                typeof item.width === 'number' && item.width > 0
                    ? item.width
                    : Math.max(item.str.length, 1) * height * 0.5;

            return {
                str: sanitizePdfGlyphs(item.str),
                x: item.transform[4],
                y: item.transform[5],
                height,
                width,
            };
        })
        .filter((item) => item.str.trim() !== '');
}

export function groupItemsIntoLines(items: PositionedTextItem[]): TextLine[] {
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

    const lines: { y: number; height: number; parts: PositionedTextItem[] }[] = [];

    for (const item of sorted) {
        const threshold = Math.max(item.height * 0.55, 3);
        const line = lines.find((entry) => Math.abs(entry.y - item.y) <= threshold);

        if (line) {
            line.parts.push(item);
            line.y = (line.y + item.y) / 2;
            line.height = Math.max(line.height, item.height);
        } else {
            lines.push({
                y: item.y,
                height: item.height,
                parts: [item],
            });
        }
    }

    return lines
        .sort((a, b) => b.y - a.y)
        .map((line) => {
            const x0 = Math.min(...line.parts.map((part) => part.x));
            return {
                y: line.y,
                height: line.height,
                x0,
                text: joinLineParts(line.parts),
            };
        })
        .filter((line) => line.text !== '');
}

export function median(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function modeRounded(values: number[], bucket = 2): number {
    if (values.length === 0) {
        return 0;
    }

    const counts = new Map<number, number>();
    for (const value of values) {
        const key = Math.round(value / bucket) * bucket;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    let best = values[0];
    let bestCount = 0;
    for (const [key, count] of counts) {
        if (count > bestCount) {
            best = key;
            bestCount = count;
        }
    }

    return best;
}

export function isNoiseLine(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) {
        return true;
    }

    // Número de página isolado, marcador de margem, tipografia/produção.
    if (/^\d{1,4}$/.test(trimmed)) {
        return true;
    }
    if (/^\[\d+\]$/.test(trimmed)) {
        return true;
    }
    if (/^tipologia:/i.test(trimmed)) {
        return true;
    }
    if (/^\d+\s*[–-]\s*.{0,40}$/.test(trimmed) && trimmed.length < 48) {
        return true;
    }

    // Cabeçalho/rodapé corrido: "8 Atos dos Apóstolos" / "Título do capítulo 9".
    if (
        trimmed.length < 72 &&
        !/[.!?…]/.test(trimmed) &&
        (/^\d{1,3}\s+\S.{2,60}$/.test(trimmed) || /^\S.{2,60}\s+\d{1,3}$/.test(trimmed))
    ) {
        return true;
    }

    return false;
}

export function joinLineIntoParagraph(current: string, line: string): string {
    const trimmed = line.trim();
    if (!trimmed) {
        return current;
    }

    if (!current) {
        return trimmed;
    }

    if (/[-\u2010\u2011]$/.test(current)) {
        return `${current.replace(/[-\u2010\u2011]$/, '')}${trimmed}`;
    }

    return `${current} ${trimmed}`;
}

function linesToParagraphs(lines: TextLine[]): string[] {
    const usable = lines.filter((line) => !isNoiseLine(line.text));
    if (usable.length === 0) {
        return [];
    }

    const bodyLeft = modeRounded(
        usable.map((line) => line.x0),
        2,
    );
    const indentDelta = Math.max(10, median(usable.map((line) => line.height)) * 0.7);
    const avgHeight = median(usable.map((line) => line.height)) || 12;

    const paragraphs: string[] = [];
    let current = '';

    for (let index = 0; index < usable.length; index += 1) {
        const line = usable[index];
        const previous = index > 0 ? usable[index - 1] : null;
        const indented = line.x0 >= bodyLeft + indentDelta;
        const yGap = previous ? previous.y - line.y : 0;
        const largeGap = previous !== null && yGap > avgHeight * 1.55;
        const startsLikeHeading =
            /^capítulo\s+\d+/i.test(line.text) ||
            (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]/.test(line.text) &&
                line.text.length < 80 &&
                line.height > avgHeight * 1.15);

        if (current && (indented || largeGap || startsLikeHeading)) {
            paragraphs.push(normalizeParagraphText(current));
            current = line.text;
            continue;
        }

        current = joinLineIntoParagraph(current, line.text);
    }

    if (current) {
        paragraphs.push(normalizeParagraphText(current));
    }

    return paragraphs.filter((paragraph) => paragraph.length > 0);
}

export function paragraphContinuesFromPrevious(last: string, next: string): boolean {
    const left = last.trimEnd();
    const right = next.trimStart();

    if (!left || !right) {
        return false;
    }

    // Hífen de fim de linha / página.
    if (/[-\u2010\u2011]$/.test(left)) {
        return true;
    }

    // Continuação em minúscula (mesmo parágrafo partido).
    if (/^[a-záàâãéêíóôõúç]/.test(right)) {
        return true;
    }

    // Terminou frase: próximo bloco é novo parágrafo.
    if (/[.!?…»"”']\s*$/.test(left)) {
        return false;
    }

    // Começa como novo parágrafo / capítulo.
    if (/^(capítulo\s+\d+|[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ“"0-9])/i.test(right)) {
        return false;
    }

    return true;
}

export function mergeIncomingPageParagraphs(finalized: string[], pendingTail: string | null, pageParagraphs: string[]): {
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
            const joined = /[-\u2010\u2011]$/.test(nextPending.trimEnd())
                ? `${nextPending.trimEnd().replace(/[-\u2010\u2011]$/, '')}${first}`
                : `${nextPending} ${first}`;
            nextPending = normalizeParagraphText(joined);
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
            totalCharCount(finalized, pendingTail);
        }

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
