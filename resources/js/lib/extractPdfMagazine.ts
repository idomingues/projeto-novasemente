import { OPS, type PDFPageProxy } from 'pdfjs-dist';
import {
    groupItemsIntoLines,
    isNoiseLine,
    joinLineIntoParagraph,
    median,
    normalizeParagraphText,
    positionedItemsFromPage,
    type PositionedTextItem,
    type TextLine,
} from '@/lib/extractPdfText';
import { fetchPdfBytes, loadPdfDocument, throwIfAborted } from '@/lib/pdfjsClient';
import {
    buildMagazineCacheKey,
    readMagazineCache,
    writeMagazineCache,
    type CachedMagazineArticle,
} from '@/lib/pdfMagazineCache';

export type MagazineArticle = CachedMagazineArticle;

export type PdfMagazineProgress = {
    page: number;
    totalPages: number;
    articles: MagazineArticle[];
    fromCache?: boolean;
};

export type ExtractPdfMagazineOptions = {
    onProgress?: (progress: PdfMagazineProgress) => void;
    signal?: AbortSignal;
    useCache?: boolean;
};

type PageLine = TextLine & { page: number };

const MIN_USEFUL_CHARS = 40;
const MIN_IMAGE_PIXELS = 22_000;
const MAX_IMAGE_WIDTH = 720;
const JPEG_QUALITY = 0.68;
const IMAGE_KIND_GRAYSCALE = 1;
const IMAGE_KIND_RGB = 2;
const IMAGE_KIND_RGBA = 3;

function isMagazineNoise(text: string): boolean {
    if (isNoiseLine(text)) {
        return true;
    }

    const trimmed = text.trim();
    if (trimmed.length < 2) {
        return true;
    }
    if (/^revista adventista$/i.test(trimmed)) {
        return true;
    }
    if (/^casa publicadora brasileira$/i.test(trimmed)) {
        return true;
    }
    if (
        /^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(\s+de)?\s+\d{4}$/i.test(
            trimmed,
        )
    ) {
        return true;
    }

    return false;
}

function isByline(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 6 || trimmed.length > 90) {
        return false;
    }

    return /^(por|por:)\s+\S+/i.test(trimmed);
}

function isHeading(line: TextLine, avgHeight: number): boolean {
    const trimmed = line.text.trim();
    if (trimmed.length < 4 || trimmed.length > 110) {
        return false;
    }
    if (isMagazineNoise(trimmed) || isByline(trimmed)) {
        return false;
    }
    if (/[.!?…]$/.test(trimmed) && trimmed.length > 55) {
        return false;
    }

    const letters = trimmed.replace(/[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g, '');
    const large = line.height >= avgHeight * 1.28;
    const allCaps =
        letters.length >= 8 &&
        letters === letters.toUpperCase() &&
        trimmed.length <= 80 &&
        (/\s/.test(trimmed) || trimmed.length >= 12);
    const shortTitle = large && trimmed.length <= 90 && !/^[a-záàâãéêíóôõúç]/.test(trimmed);

    return large || allCaps || shortTitle;
}

function splitColumns(items: PositionedTextItem[], pageWidth: number): PositionedTextItem[][] {
    if (items.length < 8 || pageWidth <= 0) {
        return [items];
    }

    const mid = pageWidth / 2;
    const left = items.filter((item) => item.x + item.width / 2 < mid - 6);
    const right = items.filter((item) => item.x + item.width / 2 >= mid - 6);
    const leftChars = left.reduce((sum, item) => sum + item.str.length, 0);
    const rightChars = right.reduce((sum, item) => sum + item.str.length, 0);

    if (leftChars > 70 && rightChars > 70) {
        return [left, right];
    }

    return [items];
}

function getPageImage(page: PDFPageProxy, objId: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        try {
            page.objs.get(objId, (data: unknown) => resolve(data));
        } catch (error) {
            reject(error);
        }
    });
}

function isJpegBytes(data: Uint8Array): boolean {
    return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

function bytesToJpegDataUrl(data: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let index = 0; index < data.length; index += chunk) {
        binary += String.fromCharCode(...data.subarray(index, index + chunk));
    }

    return `data:image/jpeg;base64,${btoa(binary)}`;
}

function rasterToJpegDataUrl(image: {
    width: number;
    height: number;
    kind?: number;
    data?: Uint8ClampedArray | Uint8Array;
    bitmap?: ImageBitmap;
}): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const sourceWidth = image.width;
    const sourceHeight = image.height;
    if (!sourceWidth || !sourceHeight || sourceWidth * sourceHeight < MIN_IMAGE_PIXELS) {
        return null;
    }

    const canvas = document.createElement('canvas');
    const scale = sourceWidth > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / sourceWidth : 1;
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
        return null;
    }

    if (image.bitmap) {
        context.drawImage(image.bitmap, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    }

    if (!image.data) {
        return null;
    }

    const raw = image.data;
    if (isJpegBytes(raw instanceof Uint8ClampedArray ? new Uint8Array(raw) : raw)) {
        return bytesToJpegDataUrl(raw instanceof Uint8ClampedArray ? new Uint8Array(raw) : raw);
    }

    const imageData = context.createImageData(sourceWidth, sourceHeight);
    const rgba = imageData.data;
    const kind = image.kind ?? IMAGE_KIND_RGB;

    if (kind === IMAGE_KIND_RGBA) {
        rgba.set(raw);
    } else if (kind === IMAGE_KIND_RGB) {
        let dest = 0;
        for (let source = 0; source < raw.length; source += 3) {
            rgba[dest] = raw[source];
            rgba[dest + 1] = raw[source + 1];
            rgba[dest + 2] = raw[source + 2];
            rgba[dest + 3] = 255;
            dest += 4;
        }
    } else if (kind === IMAGE_KIND_GRAYSCALE) {
        return null;
    } else {
        return null;
    }

    if (scale === 1) {
        context.putImageData(imageData, 0, 0);
    } else {
        const full = document.createElement('canvas');
        full.width = sourceWidth;
        full.height = sourceHeight;
        const fullContext = full.getContext('2d');
        if (!fullContext) {
            return null;
        }
        fullContext.putImageData(imageData, 0, 0);
        context.drawImage(full, 0, 0, canvas.width, canvas.height);
    }

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

async function extractLargestPageImage(page: PDFPageProxy): Promise<string | null> {
    try {
        const operators = await page.getOperatorList();
        const paintOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat]);
        const seen = new Set<string>();
        let best: { pixels: number; dataUrl: string } | null = null;

        for (let index = 0; index < operators.fnArray.length; index += 1) {
            if (!paintOps.has(operators.fnArray[index])) {
                continue;
            }

            const arg = operators.argsArray[index]?.[0];
            let image: {
                width?: number;
                height?: number;
                kind?: number;
                data?: Uint8ClampedArray | Uint8Array;
                bitmap?: ImageBitmap;
            } | null = null;

            if (typeof arg === 'string') {
                if (seen.has(arg)) {
                    continue;
                }
                seen.add(arg);
                image = (await getPageImage(page, arg)) as typeof image;
            } else if (arg && typeof arg === 'object' && 'width' in (arg as object)) {
                image = arg as typeof image;
            }

            if (!image || !image.width || !image.height) {
                continue;
            }

            const pixels = image.width * image.height;
            if (pixels < MIN_IMAGE_PIXELS) {
                continue;
            }

            const dataUrl = rasterToJpegDataUrl({
                width: image.width,
                height: image.height,
                kind: image.kind,
                data: image.data,
                bitmap: image.bitmap,
            });
            image.bitmap?.close?.();
            if (!dataUrl) {
                continue;
            }

            if (!best || pixels > best.pixels) {
                best = { pixels, dataUrl };
            }
        }

        return best?.dataUrl ?? null;
    } catch {
        return null;
    }
}

function linesToArticles(lines: PageLine[], pageImages: Map<number, string | null>): MagazineArticle[] {
    const usable = lines.filter((line) => !isMagazineNoise(line.text));
    if (usable.length === 0) {
        return [];
    }

    const avgHeight = median(usable.map((line) => line.height)) || 12;
    const articles: MagazineArticle[] = [];
    let title = '';
    let paragraphs: string[] = [];
    let current = '';
    let pageNumber = usable[0].page;

    const flushCurrentParagraph = () => {
        const normalized = normalizeParagraphText(current);
        current = '';
        if (!normalized) {
            return;
        }
        if (isByline(normalized) && paragraphs.length === 0 && title) {
            paragraphs.push(normalized);
            return;
        }
        paragraphs.push(normalized);
    };

    const startArticle = (nextTitle: string, page: number) => {
        flushCurrentParagraph();
        const body = paragraphs.filter((paragraph) => paragraph.length > 0);
        if (title || body.length > 0) {
            articles.push({
                title,
                paragraphs: body,
                pageNumber,
                imageDataUrl: pageImages.get(pageNumber) ?? null,
            });
        }
        title = nextTitle;
        paragraphs = [];
        pageNumber = page;
    };

    for (let index = 0; index < usable.length; index += 1) {
        const line = usable[index];
        const previous = index > 0 ? usable[index - 1] : null;
        const heading = isHeading(line, avgHeight);
        const yGap = previous ? previous.y - line.y : 0;
        const largeGap = previous !== null && previous.page === line.page && yGap > avgHeight * 2.1;

        if (heading) {
            const headingText = normalizeParagraphText(line.text);
            if (!headingText) {
                continue;
            }

            if (!title && paragraphs.length === 0 && !current) {
                title = headingText;
                pageNumber = line.page;
                continue;
            }

            if (title && paragraphs.length === 0 && !current && headingText.length < 90) {
                title = `${title} ${headingText}`.trim();
                continue;
            }

            if (current || paragraphs.length > 0 || title) {
                startArticle(headingText, line.page);
                continue;
            }
        }

        if (current && (largeGap || (previous !== null && line.x0 - previous.x0 > avgHeight * 0.8))) {
            flushCurrentParagraph();
        }

        current = joinLineIntoParagraph(current, line.text);
    }

    flushCurrentParagraph();
    if (title || paragraphs.length > 0) {
        articles.push({
            title,
            paragraphs,
            pageNumber,
            imageDataUrl: pageImages.get(pageNumber) ?? null,
        });
    }

    return articles.filter((article) => {
        const chars = article.paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
        return article.title.length > 0 || chars >= 40;
    });
}

function mergeContinuedArticles(articles: MagazineArticle[]): MagazineArticle[] {
    if (articles.length <= 1) {
        return articles;
    }

    const merged: MagazineArticle[] = [];

    for (const article of articles) {
        const previous = merged[merged.length - 1];
        if (!previous) {
            merged.push({ ...article, paragraphs: [...article.paragraphs] });
            continue;
        }

        const untitledBody = article.title === '' && article.paragraphs.length > 0;
        const previousLast = previous.paragraphs[previous.paragraphs.length - 1] ?? '';
        const nextFirst = article.paragraphs[0] ?? article.title;
        const continues =
            untitledBody &&
            previousLast !== '' &&
            /^[a-záàâãéêíóôõúç]/.test(nextFirst) &&
            !/[.!?…»"”']\s*$/.test(previousLast);

        if (continues) {
            previous.paragraphs = [...previous.paragraphs, ...article.paragraphs];
            if (!previous.imageDataUrl && article.imageDataUrl) {
                previous.imageDataUrl = article.imageDataUrl;
            }
            continue;
        }

        merged.push({ ...article, paragraphs: [...article.paragraphs] });
    }

    return merged;
}

export async function extractPdfMagazineProgressive(
    url: string,
    options: ExtractPdfMagazineOptions = {},
): Promise<MagazineArticle[]> {
    const { onProgress, signal, useCache = true } = options;

    throwIfAborted(signal);

    const { bytes, byteLength } = await fetchPdfBytes(url);
    throwIfAborted(signal);

    const cacheKey = buildMagazineCacheKey(url, byteLength);

    if (useCache) {
        const cached = await readMagazineCache(cacheKey);
        throwIfAborted(signal);
        if (cached && cached.length > 0) {
            onProgress?.({
                page: cached.length,
                totalPages: cached.length,
                articles: cached,
                fromCache: true,
            });
            return cached;
        }
    }

    const pdf = await loadPdfDocument(bytes);
    throwIfAborted(signal);

    const totalPages = pdf.numPages;
    const allLines: PageLine[] = [];
    const pageImages = new Map<number, string | null>();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        throwIfAborted(signal);

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const items = positionedItemsFromPage(content.items);
        const columns = splitColumns(items, viewport.width);

        for (const column of columns) {
            const lines = groupItemsIntoLines(column);
            for (const line of lines) {
                allLines.push({ ...line, page: pageNumber });
            }
        }

        pageImages.set(pageNumber, await extractLargestPageImage(page));

        const articles = mergeContinuedArticles(linesToArticles(allLines, pageImages));
        onProgress?.({
            page: pageNumber,
            totalPages,
            articles,
        });

        await new Promise<void>((resolve) => {
            if (typeof window !== 'undefined') {
                window.setTimeout(resolve, 0);
            } else {
                resolve();
            }
        });
    }

    const articles = mergeContinuedArticles(linesToArticles(allLines, pageImages));
    const usefulChars = articles.reduce(
        (sum, article) => sum + article.title.length + article.paragraphs.reduce((inner, paragraph) => inner + paragraph.length, 0),
        0,
    );

    if (articles.length === 0 || usefulChars < MIN_USEFUL_CHARS) {
        throw new Error('Não foi possível extrair as matérias desta revista.');
    }

    if (useCache) {
        void writeMagazineCache(cacheKey, articles);
    }

    onProgress?.({
        page: totalPages,
        totalPages,
        articles,
    });

    return articles;
}
