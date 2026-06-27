import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';

GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = {
    url: string;
    title: string;
    className?: string;
};

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;
const DEFAULT_ZOOM = 1.25;

function clampZoom(value: number): number {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

function fitScaleForWidth(containerWidth: number, pageWidth: number): number {
    const available = Math.max(containerWidth - 8, 240);

    return available / pageWidth;
}

export default function MobilePdfReader({ url, title, className = '' }: Props) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const pagesRef = useRef<HTMLDivElement>(null);
    const pdfRef = useRef<PDFDocumentProxy | null>(null);
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [pageCount, setPageCount] = useState(0);
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [rendering, setRendering] = useState(false);

    const renderPages = useCallback(
        async (pdf: PDFDocumentProxy, zoomLevel: number) => {
            const viewportEl = viewportRef.current;
            const pagesEl = pagesRef.current;
            if (!viewportEl || !pagesEl) {
                return;
            }

            setRendering(true);
            pagesEl.replaceChildren();

            const containerWidth = Math.max(viewportEl.clientWidth, 240);
            const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
            const fragment = document.createDocumentFragment();

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const page = await pdf.getPage(pageNumber);
                const baseViewport = page.getViewport({ scale: 1 });
                const displayScale = fitScaleForWidth(containerWidth, baseViewport.width) * zoomLevel;
                const renderScale = displayScale * pixelRatio;
                const viewport = page.getViewport({ scale: renderScale });
                const displayWidth = Math.floor(viewport.width / pixelRatio);
                const displayHeight = Math.floor(viewport.height / pixelRatio);

                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.className = 'block max-w-none rounded-lg bg-white shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-700';
                canvas.style.width = `${displayWidth}px`;
                canvas.style.height = `${displayHeight}px`;
                canvas.setAttribute('role', 'img');
                canvas.setAttribute('aria-label', `${title} — página ${pageNumber} de ${pdf.numPages}`);

                const context = canvas.getContext('2d');
                if (!context) {
                    continue;
                }

                await page.render({ canvasContext: context, viewport }).promise;

                const pageWrap = document.createElement('div');
                pageWrap.className = 'flex justify-center py-1';
                pageWrap.appendChild(canvas);
                fragment.appendChild(pageWrap);
            }

            pagesEl.appendChild(fragment);
            setRendering(false);
        },
        [title],
    );

    useEffect(() => {
        let cancelled = false;
        pdfRef.current = null;
        setStatus('loading');
        setPageCount(0);
        setZoom(DEFAULT_ZOOM);

        const load = async () => {
            try {
                const pdf = await getDocument({ url, withCredentials: true }).promise;
                if (cancelled) {
                    return;
                }

                pdfRef.current = pdf;
                setPageCount(pdf.numPages);
                setStatus('ok');
            } catch {
                if (!cancelled) {
                    setStatus('error');
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
            pdfRef.current = null;
        };
    }, [url]);

    useEffect(() => {
        const pdf = pdfRef.current;
        if (!pdf || status !== 'ok') {
            return;
        }

        void renderPages(pdf, zoom);
    }, [zoom, renderPages, status]);

    useEffect(() => {
        const viewportEl = viewportRef.current;
        const pdf = pdfRef.current;
        if (!viewportEl || !pdf || status !== 'ok') {
            return undefined;
        }

        let lastWidth = viewportEl.clientWidth;

        const observer = new ResizeObserver(() => {
            const width = viewportEl.clientWidth;
            if (width === lastWidth) {
                return;
            }
            lastWidth = width;
            void renderPages(pdf, zoom);
        });

        observer.observe(viewportEl);

        return () => observer.disconnect();
    }, [zoom, renderPages, status]);

    const decreaseZoom = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
    const increaseZoom = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
    const zoomPercent = Math.round(zoom * 100);

    if (status === 'error') {
        return (
            <div className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center dark:border-amber-900/60 dark:bg-amber-950/40 ${className}`}>
                <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                    Não foi possível abrir o documento aqui.
                </p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex cursor-pointer text-sm font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
                >
                    Abrir arquivo PDF
                </a>
            </div>
        );
    }

    return (
        <div className={`flex min-w-0 flex-col gap-3 overflow-hidden ${className}`}>
            <div
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                role="group"
                aria-label="Tamanho da letra"
            >
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tamanho</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={decreaseZoom}
                        disabled={zoom <= ZOOM_MIN || status === 'loading' || rendering}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        aria-label="Diminuir texto"
                    >
                        <MinusIcon className="h-5 w-5" aria-hidden />
                    </button>
                    <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                        {zoomPercent}%
                    </span>
                    <button
                        type="button"
                        onClick={increaseZoom}
                        disabled={zoom >= ZOOM_MAX || status === 'loading' || rendering}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        aria-label="Aumentar texto"
                    >
                        <PlusIcon className="h-5 w-5" aria-hidden />
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
                <div
                    ref={viewportRef}
                    className="h-[calc(100dvh-17rem)] w-full max-w-full overflow-auto overscroll-contain touch-pan-x touch-pan-y [-webkit-overflow-scrolling:touch]"
                    aria-busy={status === 'loading' || rendering}
                >
                    {status === 'loading' ? (
                        <p className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            Carregando documento…
                        </p>
                    ) : null}
                    <div
                        ref={pagesRef}
                        className={`min-w-0 space-y-2 px-2 py-2 ${status === 'loading' ? 'hidden' : ''}`}
                    />
                </div>
            </div>

            {status === 'ok' && pageCount > 0 ? (
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {pageCount} {pageCount === 1 ? 'página' : 'páginas'} · role para ler · use + para ampliar
                </p>
            ) : null}
        </div>
    );
}
