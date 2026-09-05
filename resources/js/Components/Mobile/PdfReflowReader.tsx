import ReadingPositionControls from '@/Components/Mobile/ReadingPositionControls';
import { downloadBlob, sanitizeDownloadFilename } from '@/lib/downloadBlob';
import { extractPdfMagazineProgressive, type MagazineArticle } from '@/lib/extractPdfMagazine';
import { extractPdfTextProgressive } from '@/lib/extractPdfText';
import { fetchPdfBytes } from '@/lib/pdfjsClient';
import { stripUrlFragment } from '@/lib/pdfViewerUrl';
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    DocumentTextIcon,
    InformationCircleIcon,
    NewspaperIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';

const FONT_STORAGE_KEY = 'ns:pdf-reflow-font-size';
const LAYOUT_NOTICE_STORAGE_KEY = 'ns:pdf-reflow-layout-notice-dismissed';
const FONT_SIZES = [16, 18, 20, 22] as const;
type FontSize = (typeof FONT_SIZES)[number];
const DEFAULT_FONT_SIZE: FontSize = 18;

type Props = {
    title: string;
    subtitle?: string | null;
    chapterLabel?: string | null;
    coverUrl?: string | null;
    pdfUrl: string;
    /** URL para download com Content-Disposition: attachment (quando disponível). */
    downloadUrl?: string | null;
    /** URL para abrir o PDF original no navegador. */
    originalPdfUrl?: string | null;
    /** Chave estável para salvar o marcador de leitura (ex.: `library:book:12`). */
    contentKey?: string | null;
    /** Em revista, agrupa o texto em matérias (título, imagem e corpo). */
    layout?: 'article' | 'magazine';
    /** Quando a conversão falha, permite abrir o PDF original no fluxo da revista. */
    onOpenOriginal?: () => void;
    className?: string;
};

type ReaderStatus = 'loading' | 'ok' | 'error';

const actionBtnClass =
    'inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800';

const toolbarBtnClass =
    'inline-flex h-9 min-w-9 cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-zinc-200 bg-white px-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800';

function readStoredFontSize(): FontSize {
    if (typeof window === 'undefined') {
        return DEFAULT_FONT_SIZE;
    }

    try {
        const raw = window.localStorage.getItem(FONT_STORAGE_KEY);
        const value = raw ? Number(raw) : NaN;
        if (FONT_SIZES.includes(value as FontSize)) {
            return value as FontSize;
        }
    } catch {
        // ignore
    }

    return DEFAULT_FONT_SIZE;
}

function leadingForSize(size: FontSize): number {
    if (size >= 22) return 1.75;
    if (size >= 20) return 1.72;
    return 1.7;
}

function readLayoutNoticeDismissed(kind: 'article' | 'magazine'): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const raw = window.localStorage.getItem(LAYOUT_NOTICE_STORAGE_KEY);
        if (!raw) {
            return false;
        }
        const parsed = JSON.parse(raw) as { article?: boolean; magazine?: boolean };
        return Boolean(parsed[kind]);
    } catch {
        return false;
    }
}

function persistLayoutNoticeDismissed(kind: 'article' | 'magazine'): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const raw = window.localStorage.getItem(LAYOUT_NOTICE_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as { article?: boolean; magazine?: boolean }) : {};
        window.localStorage.setItem(
            LAYOUT_NOTICE_STORAGE_KEY,
            JSON.stringify({ ...parsed, [kind]: true }),
        );
    } catch {
        // ignore
    }
}

export default function PdfReflowReader({
    title,
    subtitle = null,
    chapterLabel = null,
    coverUrl = null,
    pdfUrl,
    downloadUrl = null,
    originalPdfUrl = null,
    contentKey = null,
    layout = 'article',
    onOpenOriginal,
    className = '',
}: Props) {
    const isMagazine = layout === 'magazine';
    const [status, setStatus] = useState<ReaderStatus>('loading');
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [articles, setArticles] = useState<MagazineArticle[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [progressPage, setProgressPage] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
    const [fromCache, setFromCache] = useState(false);
    const [fontSize, setFontSize] = useState<FontSize>(DEFAULT_FONT_SIZE);
    const [markedParagraphIndex, setMarkedParagraphIndex] = useState<number | null>(null);
    const [showLayoutNotice, setShowLayoutNotice] = useState(false);
    const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    const handleMarkedParagraphChange = useCallback((paragraphIndex: number | null) => {
        setMarkedParagraphIndex(paragraphIndex);
    }, []);

    const resolvedOriginalUrl = stripUrlFragment(originalPdfUrl ?? pdfUrl);
    const resolvedDownloadUrl = downloadUrl ?? resolvedOriginalUrl;
    const resolvedCover = (coverUrl ?? '').trim();

    useEffect(() => {
        setFontSize(readStoredFontSize());
        setShowLayoutNotice(!readLayoutNoticeDismissed(layout));
    }, [layout]);

    const dismissLayoutNotice = useCallback(() => {
        setShowLayoutNotice(false);
        persistLayoutNoticeDismissed(layout);
    }, [layout]);

    const persistFontSize = useCallback((next: FontSize) => {
        setFontSize(next);
        try {
            window.localStorage.setItem(FONT_STORAGE_KEY, String(next));
        } catch {
            // ignore
        }
    }, []);

    const decreaseFont = useCallback(() => {
        const index = FONT_SIZES.indexOf(fontSize);
        if (index > 0) {
            persistFontSize(FONT_SIZES[index - 1]);
        }
    }, [fontSize, persistFontSize]);

    const increaseFont = useCallback(() => {
        const index = FONT_SIZES.indexOf(fontSize);
        if (index < FONT_SIZES.length - 1) {
            persistFontSize(FONT_SIZES[index + 1]);
        }
    }, [fontSize, persistFontSize]);

    const loadText = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setStatus('loading');
        setErrorMessage('');
        setParagraphs([]);
        setArticles([]);
        setProgressPage(0);
        setProgressTotal(0);
        setFromCache(false);
        paragraphRefs.current = [];

        try {
            if (isMagazine) {
                try {
                    const extracted = await extractPdfMagazineProgressive(pdfUrl, {
                        signal: controller.signal,
                        onProgress: (progress) => {
                            if (controller.signal.aborted) {
                                return;
                            }
                            setProgressPage(progress.page);
                            setProgressTotal(progress.totalPages);
                            setFromCache(Boolean(progress.fromCache));
                            setArticles(progress.articles);
                            setParagraphs(flattenMagazineParagraphs(progress.articles));
                            if (progress.articles.length > 0) {
                                setStatus('ok');
                            }
                        },
                    });

                    if (controller.signal.aborted) {
                        return;
                    }

                    setArticles(extracted);
                    const magazineParagraphs = flattenMagazineParagraphs(extracted);
                    setParagraphs(magazineParagraphs);
                    if (extracted.length === 0 || magazineParagraphs.length === 0) {
                        setStatus('error');
                        setErrorMessage(conversionFailedMessage(true));
                        return;
                    }
                    setStatus('ok');
                    return;
                } catch (magazineError) {
                    if (controller.signal.aborted || (magazineError instanceof DOMException && magazineError.name === 'AbortError')) {
                        return;
                    }
                    // Continua com a extração linear de parágrafos.
                }
            }

            const extracted = await extractPdfTextProgressive(pdfUrl, {
                signal: controller.signal,
                onProgress: (progress) => {
                    if (controller.signal.aborted) {
                        return;
                    }
                    setProgressPage(progress.page);
                    setProgressTotal(progress.totalPages);
                    setFromCache(Boolean(progress.fromCache));
                    setParagraphs(progress.paragraphs);
                    if (isMagazine) {
                        setArticles(paragraphsAsMagazine(progress.paragraphs));
                    }
                    if (progress.paragraphs.length > 0) {
                        setStatus('ok');
                    }
                },
            });

            if (controller.signal.aborted) {
                return;
            }

            setParagraphs(extracted);
            if (isMagazine) {
                setArticles(paragraphsAsMagazine(extracted));
            }
            if (extracted.length === 0) {
                setStatus('error');
                setErrorMessage(conversionFailedMessage(isMagazine));
                return;
            }
            setStatus('ok');
        } catch (error) {
            if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
                return;
            }

            setStatus('error');
            setErrorMessage(conversionFailedMessage(isMagazine));
        }
    }, [pdfUrl, isMagazine]);

    useEffect(() => {
        void loadText();
        return () => {
            abortRef.current?.abort();
        };
    }, [loadText]);

    const showArticle = status === 'ok' && (isMagazine ? articles.length > 0 : paragraphs.length > 0);
    const stillExtracting = status === 'ok' && progressTotal > 0 && progressPage < progressTotal && !fromCache;
    const fontIndex = FONT_SIZES.indexOf(fontSize);

    const renderParagraph = (paragraph: string, index: number) => {
        const isMarked = markedParagraphIndex === index;
        return (
            <p
                key={`${index}-${paragraph.slice(0, 24)}`}
                ref={(element) => {
                    paragraphRefs.current[index] = element;
                }}
                className={`scroll-mt-24 text-pretty break-words rounded-xl px-2 py-1 -mx-2 transition ${
                    isMarked
                        ? 'bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-950/50 dark:ring-teal-800'
                        : ''
                }`}
                data-reading-mark={isMarked ? 'true' : undefined}
            >
                {isMarked ? (
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        Você parou aqui
                    </span>
                ) : null}
                {paragraph}
            </p>
        );
    };

    const articleBody = isMagazine ? (
        <div className="space-y-5" aria-label={`Matérias de ${title}`}>
            {articles.map((article, articleIndex) => {
                const paragraphOffset = articles
                    .slice(0, articleIndex)
                    .reduce((sum, entry) => sum + entry.paragraphs.length, 0);

                return (
                    <article
                        key={`${article.pageNumber}-${articleIndex}-${article.title.slice(0, 24)}`}
                        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        {article.imageDataUrl ? (
                            <img
                                src={article.imageDataUrl}
                                alt=""
                                className="max-h-72 w-full object-cover sm:max-h-80"
                            />
                        ) : null}
                        <div
                            className="space-y-4 p-4 text-zinc-800 dark:text-zinc-100 sm:space-y-5 sm:p-5"
                            style={{ fontSize: `${fontSize}px`, lineHeight: leadingForSize(fontSize) }}
                        >
                            {article.title ? (
                                <h2 className="text-lg font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-xl">
                                    {article.title}
                                </h2>
                            ) : null}
                            {article.paragraphs.map((paragraph, paragraphIndex) =>
                                renderParagraph(paragraph, paragraphOffset + paragraphIndex),
                            )}
                        </div>
                    </article>
                );
            })}
            {stillExtracting ? (
                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
                    Continuando extração… página {progressPage} de {progressTotal}
                </p>
            ) : null}
        </div>
    ) : (
        <article
            className="rounded-t-3xl bg-[#f7f5f2] px-4 py-6 shadow-sm dark:bg-zinc-900 sm:px-5 sm:py-8"
            aria-label={`Conteúdo de ${title}`}
        >
            <div
                className="space-y-6 text-zinc-800 dark:text-zinc-100 sm:space-y-7"
                style={{ fontSize: `${fontSize}px`, lineHeight: leadingForSize(fontSize) }}
            >
                {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
            </div>
            {stillExtracting ? (
                <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
                    Continuando extração… página {progressPage} de {progressTotal}
                </p>
            ) : null}
        </article>
    );

    return (
        <div className={`mx-auto w-full min-w-0 max-w-3xl ${className}`}>
            {resolvedCover ? (
                <header className="relative mb-4 overflow-hidden rounded-3xl ring-1 ring-zinc-200/90 dark:ring-zinc-700">
                    <img
                        src={resolvedCover}
                        alt=""
                        className="h-44 w-full object-cover sm:h-56"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-zinc-950/35 to-zinc-950/10" />
                    <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10 sm:px-5 sm:pb-5">
                        <h1 className="text-xl font-semibold uppercase tracking-[0.04em] text-white drop-shadow sm:text-2xl">
                            {title}
                        </h1>
                        {subtitle ? (
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-white/85 sm:text-sm">
                                {subtitle}
                            </p>
                        ) : null}
                        {chapterLabel ? (
                            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/75 sm:text-xs">
                                {chapterLabel}
                            </p>
                        ) : null}
                    </div>
                </header>
            ) : (
                <header className="mb-4 px-4 sm:px-5">
                    <h1 className="text-2xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle ? (
                        <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {subtitle}
                        </p>
                    ) : null}
                    {chapterLabel ? (
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {chapterLabel}
                        </p>
                    ) : null}
                </header>
            )}

            <div className="mb-4 flex items-center justify-between gap-3 px-4 sm:px-5">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Tamanho do texto
                </p>
                <div className="flex items-center gap-2" role="group" aria-label="Tamanho da fonte">
                    <button
                        type="button"
                        onClick={decreaseFont}
                        disabled={fontIndex <= 0}
                        className={toolbarBtnClass}
                        aria-label="Diminuir fonte"
                    >
                        <span className="text-xs font-bold">A−</span>
                    </button>
                    <button
                        type="button"
                        onClick={increaseFont}
                        disabled={fontIndex >= FONT_SIZES.length - 1}
                        className={toolbarBtnClass}
                        aria-label="Aumentar fonte"
                    >
                        <span className="text-sm font-bold">A+</span>
                    </button>
                </div>
            </div>

            {showArticle && showLayoutNotice ? (
                <div
                    role="status"
                    className="mx-4 mb-4 flex gap-3 rounded-2xl border border-zinc-200/90 bg-zinc-50 px-3.5 py-3 text-sm leading-relaxed text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300 sm:mx-5"
                >
                    <InformationCircleIcon
                        className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300"
                        aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                        <p>
                            {isMagazine
                                ? 'Reorganizamos o texto das matérias para caber bem na tela. Colunas, caixas e o alinhamento do PDF original podem ficar diferentes — use o PDF original se precisar da diagramação fiel.'
                                : 'Reorganizamos o texto do livro para leitura confortável no celular. O layout pode não ficar idêntico ao PDF — use o original se precisar da diagramação fiel.'}
                        </p>
                        <button
                            type="button"
                            onClick={dismissLayoutNotice}
                            className="cursor-pointer text-sm font-semibold text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
                        >
                            Entendi
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={dismissLayoutNotice}
                        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/80 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label="Fechar aviso"
                    >
                        <XMarkIcon className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            ) : null}

            {status === 'loading' && paragraphs.length === 0 ? (
                <div
                    className="mx-4 rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:mx-5"
                    aria-busy="true"
                >
                    <DocumentTextIcon
                        className="mx-auto h-10 w-10 animate-pulse text-primary-600 dark:text-primary-400"
                        aria-hidden
                    />
                    <p className="mt-4 text-base font-medium text-zinc-800 dark:text-zinc-100">
                        Preparando leitura…
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {progressTotal > 0
                            ? `Extraindo página ${progressPage} de ${progressTotal}…`
                            : 'Carregando o documento. Em arquivos grandes, as primeiras páginas aparecem em breve.'}
                    </p>
                </div>
            ) : null}

            {status === 'error' ? (
                <div className="mx-4 space-y-4 sm:mx-5">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center dark:border-amber-900/60 dark:bg-amber-950/40">
                        <p className="text-base font-semibold text-amber-950 dark:text-amber-100">
                            Infelizmente não conseguimos converter
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                            {errorMessage || conversionFailedMessage(isMagazine)}
                        </p>
                        <div className="mt-4 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
                            {onOpenOriginal ? (
                                <button
                                    type="button"
                                    onClick={onOpenOriginal}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-950 dark:hover:bg-white"
                                >
                                    <NewspaperIcon className="h-4 w-4 shrink-0" aria-hidden />
                                    Ler no modo original
                                </button>
                            ) : (
                                <a
                                    href={resolvedOriginalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-950 dark:hover:bg-white"
                                >
                                    <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
                                    Abrir PDF original
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => void loadText()}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-300/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-white dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/60"
                            >
                                <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden />
                                Tentar novamente
                            </button>
                        </div>
                    </div>

                    <PdfReaderActions originalUrl={resolvedOriginalUrl} downloadUrl={resolvedDownloadUrl} />
                </div>
            ) : null}

            {showArticle ? (
                contentKey ? (
                    <>
                        <ReadingPositionControls
                            contentKey={contentKey}
                            ready={paragraphs.length > 0}
                            paragraphCount={paragraphs.length}
                            stickyActions
                            className="mx-4 sm:mx-5"
                            onMarkedParagraphChange={handleMarkedParagraphChange}
                            getParagraphElements={() =>
                                paragraphRefs.current.filter(
                                    (element): element is HTMLParagraphElement => element !== null,
                                )
                            }
                        >
                            {articleBody}
                        </ReadingPositionControls>

                        <footer className="mx-4 space-y-4 rounded-b-3xl border-t border-zinc-100 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950 sm:mx-5 sm:px-5">
                            <PdfReaderActions
                                originalUrl={resolvedOriginalUrl}
                                downloadUrl={resolvedDownloadUrl}
                            />
                            <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {isMagazine
                                    ? 'Texto interpretado do PDF para leitura confortável — o layout pode diferir do original. Se precisar da diagramação fiel, use «Ver PDF original».'
                                    : 'Texto interpretado do PDF para leitura confortável — o layout pode diferir do original. Se algo faltar, use «Ver PDF original».'}
                            </p>
                        </footer>
                    </>
                ) : (
                    <>
                        <div className="mx-4 sm:mx-5">{articleBody}</div>
                        <footer className="mx-4 space-y-4 rounded-b-3xl border-t border-zinc-100 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950 sm:mx-5 sm:px-5">
                            <PdfReaderActions
                                originalUrl={resolvedOriginalUrl}
                                downloadUrl={resolvedDownloadUrl}
                            />
                            <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {isMagazine
                                    ? 'Texto interpretado do PDF para leitura confortável — o layout pode diferir do original. Se precisar da diagramação fiel, use «Ver PDF original».'
                                    : 'Texto interpretado do PDF para leitura confortável — o layout pode diferir do original. Se algo faltar, use «Ver PDF original».'}
                            </p>
                        </footer>
                    </>
                )
            ) : null}
        </div>
    );
}

function conversionFailedMessage(isMagazine: boolean): string {
    return isMagazine
        ? 'Não foi possível transformar esta revista em texto legível. Prefira ler no modo original, com as páginas como foram publicadas.'
        : 'Não foi possível transformar este livro em texto legível. Prefira abrir o PDF original para continuar a leitura.';
}

function flattenMagazineParagraphs(articles: MagazineArticle[]): string[] {
    return articles.flatMap((article) => article.paragraphs);
}

function paragraphsAsMagazine(paragraphs: string[]): MagazineArticle[] {
    if (paragraphs.length === 0) {
        return [];
    }

    return [
        {
            title: '',
            paragraphs,
            pageNumber: 1,
            imageDataUrl: null,
        },
    ];
}

function PdfReaderActions({
    originalUrl,
    downloadUrl,
}: {
    originalUrl: string;
    downloadUrl: string;
}) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const { bytes } = await fetchPdfBytes(downloadUrl);
            downloadBlob(
                new Blob([bytes], { type: 'application/pdf' }),
                `${sanitizeDownloadFilename('documento')}.pdf`,
            );
        } catch {
            // Fallback: abre em nova aba só se o blob falhar.
            window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <a href={originalUrl} target="_blank" rel="noopener noreferrer" className={actionBtnClass}>
                <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0" aria-hidden />
                Ver PDF original
            </a>
            <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className={`${actionBtnClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
                <ArrowDownTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
                {downloading ? 'Preparando…' : 'Baixar PDF'}
            </button>
        </div>
    );
}
