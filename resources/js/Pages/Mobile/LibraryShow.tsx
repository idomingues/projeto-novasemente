import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    DocumentTextIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import MobilePdfReader from '@/Components/Mobile/MobilePdfReader';
import { useEffect, useMemo, useState } from 'react';

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
    external_url?: string | null;
    published_at: string | null;
}

interface Props {
    book: Book;
}

type PageProps = { appUrl?: string };

function externalOpenLabel(category: string): string {
    if (category === 'meditation') return 'Abrir meditação';
    if (category === 'lesson') return 'Abrir lição';
    return 'Abrir no site';
}

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
    const extRaw = (book.external_url ?? '').trim();
    const ext = extRaw ? extRaw : '';
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [extractStatus, setExtractStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    const [extractHtml, setExtractHtml] = useState<string | null>(null);
    const [extractError, setExtractError] = useState<string | null>(null);

    const description = (book.description ?? '').trim();
    const shortDescription = useMemo(() => {
        if (!description) return '';
        const max = 220;
        if (description.length <= max) return description;
        return description.slice(0, max).trimEnd();
    }, [description]);
    const hasMore = description !== '' && shortDescription !== '' && description.length > shortDescription.length;

    const tryExternalReader =
        (book.category === 'lesson' || book.category === 'meditation') && !pdf && ext !== '';

    useEffect(() => {
        if (!tryExternalReader) {
            setExtractStatus('idle');
            setExtractHtml(null);
            setExtractError(null);
            return;
        }

        let cancelled = false;
        setExtractStatus('loading');
        setExtractHtml(null);
        setExtractError(null);

        fetch(route('mobile.biblioteca.external-content', book.id), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then(async (r) => {
                const data: { ok?: boolean; html?: string; error?: string } = await r.json();
                if (cancelled) return;
                if (data.ok && typeof data.html === 'string' && data.html.trim() !== '') {
                    setExtractHtml(data.html);
                    setExtractStatus('ok');
                } else {
                    setExtractError(
                        typeof data.error === 'string' ? data.error : 'Não foi possível mostrar o texto aqui.',
                    );
                    setExtractStatus('error');
                }
            })
            .catch(() => {
                if (cancelled) return;
                setExtractError('Não foi possível mostrar o texto aqui.');
                setExtractStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [tryExternalReader, book.id, book.category, pdf, ext]);

    if (pdf) {
        return (
            <MobileLayout>
                <Head title={book.title} />

                <div className="space-y-4">
                    <Link
                        href={route('mobile.biblioteca')}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                        Voltar à biblioteca
                    </Link>

                    <header className="space-y-2">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(book.published_at)}</p>
                        <h1 className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            {book.title}
                        </h1>
                        {book.subtitle ? (
                            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                {book.subtitle}
                            </p>
                        ) : null}
                    </header>

                    <MobilePdfReader url={pdf} title={book.title} />

                    <div className="flex justify-center">
                        <a
                            href={route('mobile.biblioteca.pdf-download', book.id)}
                            className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 shrink-0" />
                            Baixar PDF
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
                                            className="cursor-pointer font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
                                        >
                                            .. e mais
                                        </button>
                                    </>
                                ) : null}
                            </p>
                        </div>
                    ) : null}
                </div>

                <Modal show={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg">
                    <div className="relative">
                        {cover ? (
                            <img src={cover} alt="" className="max-h-52 w-full object-cover sm:max-h-64" />
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setDetailsOpen(false)}
                            className="absolute right-3 top-3 cursor-pointer rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
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
                            className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:w-auto sm:px-8"
                        >
                            Fechar
                        </button>
                    </div>
                </Modal>
            </MobileLayout>
        );
    }

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

                        {ext ? (
                            <div className="mt-6 space-y-3">
                                {tryExternalReader && extractStatus === 'loading' ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">A carregar texto…</p>
                                ) : null}

                                {tryExternalReader && extractStatus === 'ok' && extractHtml ? (
                                    <div
                                        className="library-external-html space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 [&_a]:font-medium [&_a]:text-primary-600 [&_a]:underline dark:[&_a]:text-primary-400 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 dark:[&_blockquote]:border-zinc-600 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                                        /* HTML sanitizado no servidor */
                                        dangerouslySetInnerHTML={{ __html: extractHtml }}
                                    />
                                ) : null}

                                {tryExternalReader && extractStatus === 'error' && extractError ? (
                                    <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                        {extractError}
                                    </p>
                                ) : null}

                                <a
                                    href={ext}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                >
                                    <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0" />
                                    {externalOpenLabel(book.category)}
                                </a>

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

                                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                    {tryExternalReader && extractStatus === 'ok'
                                        ? 'Texto obtido no servidor a partir do link (melhor esforço). Se algo faltar, use o botão acima para abrir a página original.'
                                        : `Este conteúdo está num site externo. Toque em «${externalOpenLabel(book.category)}» para ler no browser.`}
                                </p>
                            </div>
                        ) : (
                            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Conteúdo indisponível.</p>
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
