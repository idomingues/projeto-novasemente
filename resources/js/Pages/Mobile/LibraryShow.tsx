import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, ArrowDownTrayIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import { useMemo, useState } from 'react';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

interface Book {
    id: number;
    title: string;
    subtitle: string | null;
    description: string | null;
    category: string;
    cover_url: string | null;
    pdf_url: string | null;
    published_at: string | null;
}

interface Props {
    book: Book;
}

type PageProps = { appUrl?: string };

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function MobileLibraryShow({ book }: Props) {
    const appUrl = (usePage().props as PageProps).appUrl ?? '';
    const cover = imageSrc(book.cover_url, appUrl);
    const pdf = book.pdf_url ? imageSrc(book.pdf_url, appUrl) : '';
    const [detailsOpen, setDetailsOpen] = useState(false);

    const description = (book.description ?? '').trim();
    const shortDescription = useMemo(() => {
        if (!description) return '';
        const max = 220;
        if (description.length <= max) return description;
        return description.slice(0, max).trimEnd();
    }, [description]);
    const hasMore = description !== '' && shortDescription !== '' && description.length > shortDescription.length;

    return (
        <MobileLayout>
            <Head title={book.title} />

            <div className="space-y-4">
                <Link
                    href={route('mobile.biblioteca')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                    <ArrowLeftIcon className="w-4 h-4" aria-hidden />
                    Voltar à biblioteca
                </Link>

                <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {cover ? (
                        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                            <img
                                src={cover}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="eager"
                                decoding="async"
                            />
                        </div>
                    ) : (
                        <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-primary-100 via-zinc-100 to-emerald-50 dark:from-primary-950/40 dark:via-zinc-900 dark:to-emerald-950/30">
                            <DocumentTextIcon className="h-16 w-16 text-primary-600/80 dark:text-primary-400/80" />
                        </div>
                    )}

                    <div className="p-4 sm:p-6">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(book.published_at)}</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{book.title}</h1>
                        {book.subtitle ? (
                            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                {book.subtitle}
                            </p>
                        ) : null}

                        {pdf ? (
                            <div className="mt-6 space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <a
                                        href={pdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                    >
                                        <DocumentTextIcon className="h-5 w-5 shrink-0" />
                                        Abrir PDF
                                    </a>
                                    <a
                                        href={pdf}
                                        download
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary-600 px-4 py-3.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-500 dark:text-primary-300 dark:hover:bg-primary-950/30"
                                    >
                                        <ArrowDownTrayIcon className="h-5 w-5 shrink-0" />
                                        Download
                                    </a>
                                </div>

                                {description ? (
                                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                            {shortDescription}
                                            {hasMore ? (
                                                <>
                                                    {' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetailsOpen(true)}
                                                        className="font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
                                                    >
                                                        .. e mais
                                                    </button>
                                                </>
                                            ) : null}
                                        </p>
                                    </div>
                                ) : null}

                                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                                    <iframe
                                        title={book.title}
                                        src={`${pdf}#view=FitH`}
                                        className="aspect-[4/5] min-h-[480px] w-full sm:aspect-[3/4] sm:min-h-[560px]"
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">PDF indisponível.</p>
                        )}
                    </div>
                </article>
            </div>

            <Modal show={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg">
                <div className="relative">
                    {cover ? (
                        <img src={cover} alt="" className="max-h-52 w-full object-cover sm:max-h-64" />
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setDetailsOpen(false)}
                        className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                        aria-label="Fechar"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-3 p-5 sm:p-6">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">{book.title}</h2>
                        {book.subtitle ? (
                            <p className="mt-1 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                {book.subtitle}
                            </p>
                        ) : null}
                    </div>
                    <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                            {description}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDetailsOpen(false)}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:w-auto sm:px-8"
                    >
                        Fechar
                    </button>
                </div>
            </Modal>
        </MobileLayout>
    );
}
