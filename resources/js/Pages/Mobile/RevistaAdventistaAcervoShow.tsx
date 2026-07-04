import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowDownTrayIcon, ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { pdfUrlWithViewerParams, usePdfViewerFragment } from '@/lib/pdfViewerUrl';
import { useEffect } from 'react';

interface Edition {
    id: number;
    title: string;
    year: number;
    month: number;
    month_label: string;
    cover_url: string | null;
    has_pdf: boolean;
    pdf_url: string;
    source_pdf_url: string | null;
}

interface Props {
    edition: Edition;
}

export default function MobileRevistaAdventistaAcervoShow({ edition }: Props) {
    const viewerFragment = usePdfViewerFragment();
    const pdfViewerUrl = pdfUrlWithViewerParams(edition.pdf_url, viewerFragment);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.location.replace(pdfViewerUrl);
    }, [pdfViewerUrl]);

    return (
        <MobileLayout>
            <Head title={edition.title} />

            <div className="-mx-4 min-w-0 overflow-x-hidden sm:mx-0">
                <div className="mb-3 px-4 sm:px-0">
                    <Link
                        href={route('mobile.biblioteca', { tab: 'revista_adventista_acervo', ano: edition.year })}
                        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                        Voltar à biblioteca ({edition.year})
                    </Link>
                </div>

                <div className="mx-auto w-full max-w-2xl space-y-4 px-4 sm:px-0">
                    <header className="space-y-2">
                        <h1 className="text-2xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            {edition.title}
                        </h1>
                        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {`Acervo histórico da Revista Adventista · ${edition.month_label} ${edition.year}`}
                        </p>
                    </header>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <a
                            href={pdfViewerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0" aria-hidden />
                            Abrir PDF em tela cheia
                        </a>
                        <a
                            href={route('mobile.acervo-revista-adventista.pdf-download', edition.id)}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
                            Baixar PDF
                        </a>
                    </div>

                    <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-base font-medium text-zinc-900 dark:text-white">Abrindo PDF…</p>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                            Se o visualizador não abrir automaticamente, use um dos botões acima.
                        </p>
                    </div>
                </div>

                <p className="mt-6 px-4 text-center text-xs text-zinc-500 dark:text-zinc-500 sm:px-0">
                    Conteúdo © Revista Adventista / detentores dos acervos de origem
                </p>
            </div>
        </MobileLayout>
    );
}
