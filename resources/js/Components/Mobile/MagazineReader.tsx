import PdfOriginalViewer from '@/Components/Mobile/PdfOriginalViewer';
import PdfReflowReader from '@/Components/Mobile/PdfReflowReader';
import { Link } from '@inertiajs/react';
import { ArrowLeftIcon, DocumentTextIcon, NewspaperIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';

type ReadMode = 'choose' | 'original' | 'text';

type Props = {
    title: string;
    subtitle?: string | null;
    coverUrl?: string | null;
    pdfUrl: string;
    downloadUrl?: string | null;
    originalPdfUrl?: string | null;
    contentKey?: string | null;
    /** Destino do «Voltar» quando ainda está na tela de opções. */
    backHref: string;
    backLabel?: string;
    className?: string;
};

const HISTORY_STATE_KEY = 'nsMagazineReadMode';

const choiceCardClass =
    'flex w-full cursor-pointer touch-manipulation items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800';

export default function MagazineReader({
    title,
    subtitle = null,
    coverUrl = null,
    pdfUrl,
    downloadUrl = null,
    originalPdfUrl = null,
    contentKey = null,
    backHref,
    backLabel = 'Voltar',
    className = '',
}: Props) {
    const [mode, setMode] = useState<ReadMode>('choose');
    const modeRef = useRef<ReadMode>('choose');
    const resolvedCover = (coverUrl ?? '').trim();

    const goToChoose = useCallback(() => {
        modeRef.current = 'choose';
        setMode('choose');
    }, []);

    const returnToChoose = useCallback(() => {
        if (modeRef.current === 'choose') {
            return;
        }
        const hadReadingState =
            typeof window !== 'undefined' && Boolean(window.history.state?.[HISTORY_STATE_KEY]);
        goToChoose();
        if (hadReadingState) {
            window.history.back();
        }
    }, [goToChoose]);

    const enterMode = useCallback((next: Exclude<ReadMode, 'choose'>) => {
        const wasChoose = modeRef.current === 'choose';
        modeRef.current = next;
        setMode(next);
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const state = { [HISTORY_STATE_KEY]: next };
            if (wasChoose) {
                window.history.pushState(state, '');
            } else {
                window.history.replaceState(state, '');
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        const onPopState = () => {
            if (modeRef.current === 'choose') {
                return;
            }
            goToChoose();
        };

        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [goToChoose]);

    const backControl =
        mode === 'choose' ? (
            <Link
                href={backHref}
                className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                {backLabel}
            </Link>
        ) : (
            <button
                type="button"
                onClick={returnToChoose}
                className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                Voltar às opções de leitura
            </button>
        );

    if (mode === 'original') {
        return (
            <div className={className}>
                <div className="mb-3 px-4 sm:px-0">{backControl}</div>
                <ModeSwitch current="original" onChange={enterMode} onBackToChoose={returnToChoose} />
                <PdfOriginalViewer
                    pdfUrl={pdfUrl}
                    title={title}
                    downloadUrl={downloadUrl}
                    className="mt-3"
                    loadingTitle="Abrindo a revista original…"
                    loadingSubtitle="Carregando as páginas do PDF."
                />
            </div>
        );
    }

    if (mode === 'text') {
        return (
            <div className={className}>
                <div className="mb-3 px-4 sm:px-0">{backControl}</div>
                <ModeSwitch current="text" onChange={enterMode} onBackToChoose={returnToChoose} />
                <PdfReflowReader
                    title={title}
                    subtitle={subtitle}
                    coverUrl={null}
                    pdfUrl={pdfUrl}
                    downloadUrl={downloadUrl}
                    originalPdfUrl={originalPdfUrl}
                    contentKey={contentKey}
                    layout="magazine"
                    onOpenOriginal={() => enterMode('original')}
                    className="mt-3"
                />
            </div>
        );
    }

    return (
        <div className={`mx-auto w-full min-w-0 max-w-lg ${className}`}>
            <div className="mb-3 px-4 sm:px-0">{backControl}</div>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {resolvedCover ? (
                    <img src={resolvedCover} alt="" className="max-h-72 w-full object-cover sm:max-h-80" />
                ) : (
                    <div className="flex h-40 items-center justify-center bg-zinc-50 dark:bg-zinc-800">
                        <NewspaperIcon className="h-12 w-12 text-zinc-400" aria-hidden />
                    </div>
                )}
                <div className="space-y-4 p-4 sm:p-5">
                    <div>
                        <h1 className="text-xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                            {title}
                        </h1>
                        {subtitle ? (
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
                        ) : null}
                    </div>

                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        Como você prefere ler esta edição?
                    </p>

                    <div className="space-y-3">
                        <button type="button" className={choiceCardClass} onClick={() => enterMode('original')}>
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                                <NewspaperIcon className="h-6 w-6" aria-hidden />
                            </span>
                            <span>
                                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                    Ler revista original
                                </span>
                                <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                                    Abre o PDF com as páginas como foram publicadas.
                                </span>
                            </span>
                        </button>

                        <button type="button" className={choiceCardClass} onClick={() => enterMode('text')}>
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                <DocumentTextIcon className="h-6 w-6" aria-hidden />
                            </span>
                            <span>
                                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                    Ler somente texto
                                </span>
                                <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                                    Matérias em blocos para ler com conforto. O layout pode diferir do PDF.
                                </span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModeSwitch({
    current,
    onChange,
    onBackToChoose,
}: {
    current: Exclude<ReadMode, 'choose'>;
    onChange: (mode: Exclude<ReadMode, 'choose'>) => void;
    onBackToChoose: () => void;
}) {
    const other: Exclude<ReadMode, 'choose'> = current === 'original' ? 'text' : 'original';
    const label = other === 'original' ? 'Ler revista original' : 'Ler somente texto';

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-0">
            <button
                type="button"
                onClick={onBackToChoose}
                className="cursor-pointer text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
                Trocar modo de leitura
            </button>
            <button
                type="button"
                onClick={() => onChange(other)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
                {other === 'original' ? (
                    <NewspaperIcon className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                    <DocumentTextIcon className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {label}
            </button>
        </div>
    );
}
