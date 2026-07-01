import ReadingPositionControls from '@/Components/Mobile/ReadingPositionControls';
import { extractPdfTextParagraphs } from '@/lib/extractPdfText';
import { stripUrlFragment } from '@/lib/pdfViewerUrl';
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
    title: string;
    subtitle?: string | null;
    pdfUrl: string;
    /** URL para download com Content-Disposition: attachment (quando disponível). */
    downloadUrl?: string | null;
    /** URL para abrir o PDF original no navegador. */
    originalPdfUrl?: string | null;
    /** Chave estável para salvar o marcador de leitura (ex.: `library:book:12`). */
    contentKey?: string | null;
    className?: string;
};

type ReaderStatus = 'loading' | 'ok' | 'error';

const actionBtnClass =
    'inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800';

export default function PdfTextReaderScreen({
    title,
    subtitle = null,
    pdfUrl,
    downloadUrl = null,
    originalPdfUrl = null,
    contentKey = null,
    className = '',
}: Props) {
    const [status, setStatus] = useState<ReaderStatus>('loading');
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

    const resolvedOriginalUrl = stripUrlFragment(originalPdfUrl ?? pdfUrl);
    const resolvedDownloadUrl = downloadUrl ?? resolvedOriginalUrl;

    const loadText = useCallback(async () => {
        setStatus('loading');
        setErrorMessage('');
        setParagraphs([]);

        try {
            const extracted = await extractPdfTextParagraphs(pdfUrl);
            setParagraphs(extracted);
            setStatus('ok');
        } catch (error) {
            setStatus('error');
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível preparar a leitura deste documento.',
            );
        }
    }, [pdfUrl]);

    useEffect(() => {
        void loadText();
    }, [loadText]);

    return (
        <div className={`mx-auto w-full min-w-0 max-w-2xl ${className}`}>
            <header className="mb-6 px-4 sm:px-5">
                <h1 className="text-2xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                    {title}
                </h1>
                {subtitle ? (
                    <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </p>
                ) : null}
            </header>

            {status === 'loading' ? (
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
                        Extraindo o texto do documento. Isso pode levar alguns segundos em arquivos grandes.
                    </p>
                </div>
            ) : null}

            {status === 'error' ? (
                <div className="mx-4 space-y-4 sm:mx-5">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center dark:border-amber-900/60 dark:bg-amber-950/40">
                        <p className="text-base font-medium text-amber-950 dark:text-amber-100">
                            Não foi possível exibir o texto aqui.
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                            {errorMessage}
                        </p>
                        <button
                            type="button"
                            onClick={() => void loadText()}
                            className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-950 dark:hover:bg-white"
                        >
                            <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden />
                            Tentar novamente
                        </button>
                    </div>

                    <PdfReaderActions
                        originalUrl={resolvedOriginalUrl}
                        downloadUrl={resolvedDownloadUrl}
                    />
                </div>
            ) : null}

            {status === 'ok' ? (
                contentKey ? (
                    <>
                        <ReadingPositionControls
                        contentKey={contentKey}
                        ready
                        stickyActions
                        className="mx-4 sm:mx-5"
                        getParagraphElements={() =>
                            paragraphRefs.current.filter(
                                (element): element is HTMLParagraphElement => element !== null,
                            )
                        }
                    >
                        <article
                            className="rounded-t-3xl bg-white px-4 py-6 shadow-sm dark:bg-zinc-900 sm:px-5 sm:py-8"
                            aria-label={`Conteúdo de ${title}`}
                        >
                            <div className="space-y-5 text-[18px] leading-[1.7] text-zinc-800 dark:text-zinc-100 sm:text-[19px] sm:leading-[1.75]">
                                {paragraphs.map((paragraph, index) => (
                                    <p
                                        key={`${index}-${paragraph.slice(0, 24)}`}
                                        ref={(element) => {
                                            paragraphRefs.current[index] = element;
                                        }}
                                        className="scroll-mt-24 text-pretty break-words"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </article>
                    </ReadingPositionControls>

                    <footer className="mx-4 space-y-4 rounded-b-3xl border-t border-zinc-100 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950 sm:mx-5 sm:px-5">
                            <PdfReaderActions
                                originalUrl={resolvedOriginalUrl}
                                downloadUrl={resolvedDownloadUrl}
                            />
                        <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            Leitura gerada a partir do PDF. Se algo estiver faltando, use «Ver PDF original».
                        </p>
                    </footer>
                    </>
                ) : (
                    <>
                        <article
                            className="rounded-t-3xl bg-white px-4 py-6 shadow-sm dark:bg-zinc-900 sm:px-5 sm:py-8"
                            aria-label={`Conteúdo de ${title}`}
                        >
                            <div className="space-y-5 text-[18px] leading-[1.7] text-zinc-800 dark:text-zinc-100 sm:text-[19px] sm:leading-[1.75]">
                                {paragraphs.map((paragraph, index) => (
                                    <p key={`${index}-${paragraph.slice(0, 24)}`} className="text-pretty break-words">
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </article>

                        <footer className="space-y-4 rounded-b-3xl border-t border-zinc-100 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
                            <PdfReaderActions
                                originalUrl={resolvedOriginalUrl}
                                downloadUrl={resolvedDownloadUrl}
                            />
                            <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                Leitura gerada a partir do PDF. Se algo estiver faltando, use «Ver PDF original».
                            </p>
                        </footer>
                    </>
                )
            ) : null}
        </div>
    );
}

function PdfReaderActions({
    originalUrl,
    downloadUrl,
}: {
    originalUrl: string;
    downloadUrl: string;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <a href={originalUrl} target="_blank" rel="noopener noreferrer" className={actionBtnClass}>
                <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0" aria-hidden />
                Ver PDF original
            </a>
            <a href={downloadUrl} className={actionBtnClass}>
                <ArrowDownTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
                Baixar PDF
            </a>
        </div>
    );
}
