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

/** Escala mínima para leitura confortável no celular (páginas A4 costumam ficar pequenas só com fit-to-width). */
const MIN_READING_SCALE = 2.85;

function resolveReadingScale(containerWidth: number, pageWidth: number): number {
    const fitWidth = containerWidth / pageWidth;
    const enlarged = (containerWidth * 3.4) / pageWidth;

    return Math.max(enlarged, MIN_READING_SCALE, fitWidth * 2.5);
}

export default function MobilePdfReader({ url, title, className = '' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [pageCount, setPageCount] = useState(0);
    const pdfViewerFragment = usePdfViewerFragment();
    const iframeUrl = pdfUrlWithViewerParams(url, pdfViewerFragment);

    useEffect(() => {
        let cancelled = false;
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        setStatus('loading');
        setPageCount(0);
        container.replaceChildren();

        const renderPdf = async () => {
            try {
                const pdf = await getDocument({ url, withCredentials: true }).promise;
                if (cancelled) {
                    return;
                }

                setPageCount(pdf.numPages);
                const containerWidth = Math.max(container.clientWidth, 320);
                const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
                const fragment = document.createDocumentFragment();

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                    if (cancelled) {
                        return;
                    }

                    const page = await pdf.getPage(pageNumber);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = resolveReadingScale(containerWidth, baseViewport.width);
                    const renderScale = scale * pixelRatio;
                    const viewport = page.getViewport({ scale: renderScale });

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width);
                    canvas.height = Math.floor(viewport.height);
                    canvas.className =
                        'block max-w-none rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700';
                    canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
                    canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;
                    canvas.setAttribute('role', 'img');
                    canvas.setAttribute('aria-label', `${title} — página ${pageNumber} de ${pdf.numPages}`);

                    const context = canvas.getContext('2d');
                    if (!context) {
                        continue;
                    }

                    await page.render({ canvasContext: context, viewport }).promise;

                    const pageWrap = document.createElement('div');
                    pageWrap.className = 'overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
                    pageWrap.appendChild(canvas);
                    fragment.appendChild(pageWrap);
                }

                if (cancelled) {
                    return;
                }

                container.appendChild(fragment);
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
                        className="min-h-[min(88dvh,960px)] w-full border-0"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {status === 'loading' ? (
                <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Carregando leitura…</p>
            ) : null}
            <div
                ref={containerRef}
                className={`space-y-6 ${status === 'loading' ? 'sr-only' : ''}`}
                aria-busy={status === 'loading'}
            />
            {status === 'ok' && pageCount > 0 ? (
                <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {pageCount} {pageCount === 1 ? 'página' : 'páginas'} · deslize horizontalmente se precisar
                </p>
            ) : null}
        </div>
    );
}
