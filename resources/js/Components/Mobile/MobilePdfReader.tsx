import { pdfUrlWithViewerParams, usePdfViewerFragment } from '@/lib/pdfViewerUrl';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';

GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = {
    url: string;
    title: string;
    className?: string;
};

/** Largura mínima de exibição da página (px) — evita encolher demais o texto no celular. */
const MIN_READABLE_PAGE_WIDTH = 540;

/** Escala a página priorizando legibilidade; páginas mais largas rolam na horizontal. */
function resolveReadingScale(containerWidth: number, pageWidth: number): number {
    const padding = 16;
    const available = Math.max(containerWidth - padding, 280);
    const fitScale = available / pageWidth;
    const readableScale = Math.max(available, MIN_READABLE_PAGE_WIDTH) / pageWidth;

    return Math.max(fitScale, readableScale);
}

export default function MobilePdfReader({ url, title, className = '' }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const pagesRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [pageCount, setPageCount] = useState(0);
    const pdfViewerFragment = usePdfViewerFragment();
    const iframeUrl = pdfUrlWithViewerParams(url, pdfViewerFragment);

    useEffect(() => {
        let cancelled = false;
        const scrollEl = scrollRef.current;
        const pagesEl = pagesRef.current;
        if (!scrollEl || !pagesEl) {
            return undefined;
        }

        setStatus('loading');
        setPageCount(0);
        pagesEl.replaceChildren();

        const renderPdf = async () => {
            try {
                const pdf = await getDocument({ url, withCredentials: true }).promise;
                if (cancelled) {
                    return;
                }

                setPageCount(pdf.numPages);
                const containerWidth = Math.max(scrollEl.clientWidth, 260);
                const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
                const fragment = document.createDocumentFragment();

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                    if (cancelled) {
                        return;
                    }

                    const page = await pdf.getPage(pageNumber);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const displayScale = resolveReadingScale(containerWidth, baseViewport.width);
                    const renderScale = displayScale * pixelRatio;
                    const viewport = page.getViewport({ scale: renderScale });
                    const displayWidth = Math.floor(viewport.width / pixelRatio);
                    const displayHeight = Math.floor(viewport.height / pixelRatio);

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width);
                    canvas.height = Math.floor(viewport.height);
                    canvas.className =
                        'mx-auto block max-w-none rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700';
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
                    pageWrap.className = 'flex min-w-0 justify-center';
                    pageWrap.appendChild(canvas);
                    fragment.appendChild(pageWrap);
                }

                if (cancelled) {
                    return;
                }

                pagesEl.appendChild(fragment);
                setStatus('ok');
            } catch {
                if (!cancelled) {
                    setStatus('error');
                }
            }
        };

        void renderPdf();

        return () => {
            cancelled = true;
        };
    }, [url, title]);

    if (status === 'error') {
        return (
            <div className={className}>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                    <iframe
                        title={title}
                        src={iframeUrl}
                        className="min-h-[min(70dvh,720px)] w-full border-0"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`min-w-0 ${className}`}>
            <div
                ref={scrollRef}
                className="overflow-x-auto overscroll-x-contain"
                aria-busy={status === 'loading'}
            >
                {status === 'loading' ? (
                    <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Carregando documento…</p>
                ) : null}
                <div
                    ref={pagesRef}
                    className={`inline-block min-w-full space-y-4 ${status === 'loading' ? 'sr-only' : ''}`}
                />
            </div>
            {status === 'ok' && pageCount > 0 ? (
                <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {pageCount} {pageCount === 1 ? 'página' : 'páginas'} · role para ler
                </p>
            ) : null}
        </div>
    );
}
