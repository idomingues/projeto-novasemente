import { fetchPdfBytes, loadPdfDocument } from '@/lib/pdfjsClient';
import { type PDFDocumentProxy, type PDFPageProxy } from 'pdfjs-dist';
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';

type Props = {
    pdfUrl: string;
    title: string;
    downloadUrl?: string | null;
    className?: string;
    loadingTitle?: string;
    loadingSubtitle?: string;
};

const ZOOM_MIN = 1;
const ZOOM_MAX = 3.5;
const ZOOM_STEP = 0.25;

const toolbarBtnClass =
    'inline-flex h-9 min-w-9 cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-zinc-200 bg-white px-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800';

function clampZoom(value: number): number {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

function touchDistance(a: Touch, b: Touch): number {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
}

export default function PdfOriginalViewer({
    pdfUrl,
    title,
    downloadUrl = null,
    className = '',
    loadingTitle = 'Abrindo o PDF…',
    loadingSubtitle = 'Carregando as páginas.',
}: Props) {
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [pinchScale, setPinchScale] = useState(1);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const pinchRef = useRef<{ active: boolean; startDist: number; startZoom: number; liveScale: number }>({
        active: false,
        startDist: 0,
        startZoom: 1,
        liveScale: 1,
    });
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const displayZoom = clampZoom(zoom * pinchScale);

    const loadPdf = useCallback(async () => {
        setStatus('loading');
        setErrorMessage('');
        setPdf(null);
        setPageCount(0);
        setCurrentPage(1);
        setZoom(1);
        setPinchScale(1);
        pinchRef.current.liveScale = 1;

        try {
            const { bytes } = await fetchPdfBytes(pdfUrl);
            const documentProxy = await loadPdfDocument(bytes);
            setPdf(documentProxy);
            setPageCount(documentProxy.numPages);
            setStatus('ok');
        } catch (error) {
            setStatus('error');
            setErrorMessage(
                error instanceof Error ? error.message : 'Não foi possível abrir o PDF.',
            );
        }
    }, [pdfUrl]);

    useEffect(() => {
        void loadPdf();
        return () => {
            setPdf(null);
        };
    }, [loadPdf]);

    const scrollToPage = useCallback((pageNumber: number) => {
        const element = pageRefs.current[pageNumber - 1];
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentPage(pageNumber);
    }, []);

    const handleDownload = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation();
    }, []);

    const bumpZoom = useCallback((delta: number) => {
        setPinchScale(1);
        setZoom((z) => clampZoom(Math.round((z + delta) * 100) / 100));
    }, []);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el || status !== 'ok') return;

        const onTouchStart = (event: TouchEvent) => {
            if (event.touches.length !== 2) return;
            const dist = touchDistance(event.touches[0], event.touches[1]);
            if (dist < 8) return;
            pinchRef.current = {
                active: true,
                startDist: dist,
                startZoom: zoom,
                liveScale: 1,
            };
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!pinchRef.current.active || event.touches.length !== 2) return;
            event.preventDefault();
            const dist = touchDistance(event.touches[0], event.touches[1]);
            if (pinchRef.current.startDist < 8) return;
            const ratio = dist / pinchRef.current.startDist;
            pinchRef.current.liveScale = ratio;
            setPinchScale(ratio);
        };

        const endPinch = () => {
            if (!pinchRef.current.active) return;
            const { startZoom, liveScale } = pinchRef.current;
            pinchRef.current.active = false;
            pinchRef.current.liveScale = 1;
            setZoom(clampZoom(startZoom * liveScale));
            setPinchScale(1);
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', endPinch);
        el.addEventListener('touchcancel', endPinch);

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', endPinch);
            el.removeEventListener('touchcancel', endPinch);
        };
    }, [status, zoom]);

    return (
        <div className={`mx-auto w-full min-w-0 max-w-3xl ${className}`}>
            {status === 'loading' ? (
                <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">{loadingTitle}</p>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{loadingSubtitle}</p>
                </div>
            ) : null}

            {status === 'error' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center dark:border-amber-900/60 dark:bg-amber-950/40">
                    <p className="text-base font-medium text-amber-950 dark:text-amber-100">Não foi possível abrir o PDF.</p>
                    <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90">{errorMessage}</p>
                    <button type="button" onClick={() => void loadPdf()} className={`${toolbarBtnClass} mt-4 gap-2 px-4`}>
                        <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden />
                        Tentar novamente
                    </button>
                </div>
            ) : null}

            {status === 'ok' && pdf ? (
                <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Página {currentPage} de {pageCount}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                                Dois dedos para zoom · arraste para mover
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1" role="group" aria-label="Zoom">
                                <button
                                    type="button"
                                    className={toolbarBtnClass}
                                    disabled={displayZoom <= ZOOM_MIN + 0.01}
                                    onClick={() => bumpZoom(-ZOOM_STEP)}
                                    aria-label="Diminuir zoom"
                                >
                                    <MagnifyingGlassMinusIcon className="h-5 w-5" aria-hidden />
                                </button>
                                <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                                    {Math.round(displayZoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    className={toolbarBtnClass}
                                    disabled={displayZoom >= ZOOM_MAX - 0.01}
                                    onClick={() => bumpZoom(ZOOM_STEP)}
                                    aria-label="Aumentar zoom"
                                >
                                    <MagnifyingGlassPlusIcon className="h-5 w-5" aria-hidden />
                                </button>
                            </div>
                            <div className="flex items-center gap-2" role="group" aria-label="Navegar páginas">
                                <button
                                    type="button"
                                    className={toolbarBtnClass}
                                    disabled={currentPage <= 1}
                                    onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                                    aria-label="Página anterior"
                                >
                                    <ChevronLeftIcon className="h-5 w-5" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    className={toolbarBtnClass}
                                    disabled={currentPage >= pageCount}
                                    onClick={() => scrollToPage(Math.min(pageCount, currentPage + 1))}
                                    aria-label="Próxima página"
                                >
                                    <ChevronRightIcon className="h-5 w-5" aria-hidden />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        ref={viewportRef}
                        className="overflow-x-auto overscroll-x-contain rounded-2xl [-webkit-overflow-scrolling:touch]"
                        style={{ touchAction: pinchScale !== 1 ? 'none' : 'pan-x pan-y' }}
                        aria-label={`PDF original de ${title}`}
                    >
                        <div
                            className="origin-top-left space-y-3 will-change-transform"
                            style={
                                pinchScale !== 1
                                    ? { transform: `scale(${pinchScale})` }
                                    : undefined
                            }
                        >
                            {Array.from({ length: pageCount }, (_, index) => (
                                <PdfPageCanvas
                                    key={`${index + 1}-${zoom}`}
                                    pdf={pdf}
                                    pageNumber={index + 1}
                                    zoom={zoom}
                                    onVisible={() => setCurrentPage(index + 1)}
                                    containerRef={(element) => {
                                        pageRefs.current[index] = element;
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {downloadUrl ? (
                        <a
                            href={downloadUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleDownload}
                            className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
                            Baixar PDF
                        </a>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}

function PdfPageCanvas({
    pdf,
    pageNumber,
    zoom,
    onVisible,
    containerRef,
}: {
    pdf: PDFDocumentProxy;
    pageNumber: number;
    zoom: number;
    onVisible: () => void;
    containerRef: (element: HTMLDivElement | null) => void;
}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pageRef = useRef<PDFPageProxy | null>(null);
    const renderedRef = useRef(false);
    const onVisibleRef = useRef(onVisible);
    const [ready, setReady] = useState(false);
    onVisibleRef.current = onVisible;

    useEffect(() => {
        const host = hostRef.current;
        if (!host) {
            return;
        }

        let cancelled = false;
        let observer: IntersectionObserver | null = null;
        renderedRef.current = false;
        setReady(false);

        const renderPage = async () => {
            const canvas = canvasRef.current;
            if (!canvas || cancelled || renderedRef.current) {
                return;
            }
            renderedRef.current = true;

            try {
                const page = await pdf.getPage(pageNumber);
                if (cancelled) {
                    return;
                }
                pageRef.current = page;

                const scroller = host.closest('[aria-label]') as HTMLElement | null;
                const baseWidth = Math.max(
                    280,
                    (scroller?.clientWidth || host.parentElement?.clientWidth || host.clientWidth || 320) - 2,
                );
                const unscaled = page.getViewport({ scale: 1 });
                const cssScale = (baseWidth / unscaled.width) * zoom;
                const outputScale = Math.min(2, window.devicePixelRatio || 1);
                const viewport = page.getViewport({ scale: cssScale * outputScale });

                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.style.width = `${Math.floor(unscaled.width * cssScale)}px`;
                canvas.style.height = `${Math.floor(unscaled.height * cssScale)}px`;

                const context = canvas.getContext('2d', { alpha: false });
                if (!context) {
                    renderedRef.current = false;
                    return;
                }

                await page.render({
                    canvasContext: context,
                    viewport,
                }).promise;

                if (!cancelled) {
                    setReady(true);
                }
            } catch {
                renderedRef.current = false;
            }
        };

        observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) {
                    return;
                }
                if (entry.isIntersecting) {
                    onVisibleRef.current();
                    void renderPage();
                    return;
                }

                if (renderedRef.current && canvasRef.current) {
                    const canvas = canvasRef.current;
                    canvas.width = 0;
                    canvas.height = 0;
                    canvas.style.width = '';
                    canvas.style.height = '';
                    renderedRef.current = false;
                    setReady(false);
                    pageRef.current?.cleanup();
                    pageRef.current = null;
                }
            },
            { rootMargin: '640px 0px', threshold: 0.05 },
        );
        observer.observe(host);
        void renderPage();

        return () => {
            cancelled = true;
            observer?.disconnect();
            pageRef.current?.cleanup();
            pageRef.current = null;
        };
    }, [pdf, pageNumber, zoom]);

    return (
        <div
            ref={(element) => {
                hostRef.current = element;
                containerRef(element);
            }}
            className="inline-block min-w-full overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700"
        >
            <canvas ref={canvasRef} className="block h-auto max-w-none" aria-label={`Página ${pageNumber}`} />
            {!ready ? (
                <div className="flex aspect-[3/4] w-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
                    Página {pageNumber}
                </div>
            ) : null}
        </div>
    );
}
