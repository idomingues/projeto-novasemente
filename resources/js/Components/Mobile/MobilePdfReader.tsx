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

const MIN_READING_SCALE = 1.35;

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
                const fragment = document.createDocumentFragment();

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                    if (cancelled) {
                        return;
                    }

                    const page = await pdf.getPage(pageNumber);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = Math.max(containerWidth / baseViewport.width, MIN_READING_SCALE);
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width);
                    canvas.height = Math.floor(viewport.height);
                    canvas.className =
                        'mx-auto block w-full max-w-full rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700';
                    canvas.setAttribute('role', 'img');
                    canvas.setAttribute('aria-label', `${title} — página ${pageNumber} de ${pdf.numPages}`);

                    const context = canvas.getContext('2d');
                    if (!context) {
                        continue;
                    }

                    await page.render({ canvasContext: context, viewport }).promise;

                    const pageWrap = document.createElement('div');
                    pageWrap.className = 'mx-auto w-full max-w-3xl';
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
                className={`space-y-5 ${status === 'loading' ? 'sr-only' : ''}`}
                aria-busy={status === 'loading'}
            />
            {status === 'ok' && pageCount > 0 ? (
                <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
                </p>
            ) : null}
        </div>
    );
}
