import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

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

export async function fetchPdfBytes(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
        throw new Error(`Não foi possível carregar o PDF (${response.status}).`);
    }

    return response.arrayBuffer();
}

async function loadPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
    return getDocument({ data: bytes }).promise;
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

function positionedItemsFromPage(pageItems: unknown[]): PositionedTextItem[] {
    return pageItems
        .filter(isPdfTextItem)
        .filter((item) => item.str.trim() !== '')
        .map((item) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            height: item.height > 0 ? item.height : Math.abs(item.transform[3]) || 12,
        }));
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
        .replace(/\u00ad/g, '')
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

function mergePageParagraphs(pageParagraphs: string[][]): string[] {
    const merged: string[] = [];

    for (const page of pageParagraphs) {
        for (const paragraph of page) {
            if (merged.length === 0) {
                merged.push(paragraph);
                continue;
            }

            const last = merged[merged.length - 1];
            const continuesFromPreviousPage =
                /^[a-záàâãéêíóôõúç]/.test(paragraph) || !/[.!?:"'»]\s*$/.test(last);

            if (continuesFromPreviousPage) {
                merged[merged.length - 1] = normalizeParagraphText(`${last} ${paragraph}`);
            } else {
                merged.push(paragraph);
            }
        }
    }

    return merged;
}

async function extractParagraphsFromPdf(pdf: PDFDocumentProxy): Promise<string[]> {
    const pageParagraphs: string[][] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const items = content.items.filter(isPdfTextItem);
        const lines = groupItemsIntoLines(positionedItemsFromPage(items));
        pageParagraphs.push(linesToParagraphs(lines));
    }

    return mergePageParagraphs(pageParagraphs);
}

export async function extractPdfTextParagraphs(url: string): Promise<string[]> {
    const bytes = await fetchPdfBytes(url);
    const pdf = await loadPdfDocument(bytes);
    const paragraphs = await extractParagraphsFromPdf(pdf);

    if (paragraphs.length === 0) {
        throw new Error('Não foi possível extrair texto legível deste PDF.');
    }

    return paragraphs;
}
