import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    BookOpenIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

interface CategoryTab {
    value: string;
    label: string;
}

interface BookItem {
    id: number;
    title: string;
    subtitle: string | null;
    category: string;
    cover_url: string | null;
    pdf_url: string | null;
}

interface Props {
    books: BookItem[];
    categories: CategoryTab[];
    librarySetupMessage?: string | null;
}

type PageProps = { appUrl?: string };

function normalizeSearch(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function GratisBadge({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-md bg-brand-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white ${className}`}
        >
            Grátis
        </span>
    );
}

export default function MobileLibrary({ books, categories, librarySetupMessage = null }: Props) {
    const appUrl = (usePage().props as PageProps).appUrl ?? '';
    const [tab, setTab] = useState<string>(categories[0]?.value ?? 'books');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = normalizeSearch(search);
        return books.filter((b) => {
            if (b.category !== tab) return false;
            if (!q) return true;
            const t = normalizeSearch(b.title + (b.subtitle ? ` ${b.subtitle}` : ''));
            return t.includes(q);
        });
    }, [books, tab, search]);

    const emptyMessage = useMemo(() => {
        if (librarySetupMessage) {
            return librarySetupMessage;
        }
        const inTab = books.filter((b) => b.category === tab);
        if (inTab.length === 0) return 'Nenhuma publicação nesta categoria.';
        if (filtered.length === 0) return 'Nenhum resultado para a pesquisa.';
        return '';
    }, [books, tab, filtered.length, librarySetupMessage]);

    return (
        <MobileLayout>
            <Head title="Biblioteca" />

            <div className="space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="min-w-0 text-balance text-3xl font-bold leading-[1.12] tracking-[-0.03em] text-zinc-900 antialiased dark:text-white sm:text-4xl sm:tracking-[-0.035em]">
                            Biblioteca
                        </h1>
                        <GratisBadge className="translate-y-0.5" />
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Pesquisar…"
                            className="w-full rounded-xl border border-zinc-200/90 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
                            aria-label="Pesquisar na biblioteca"
                        />
                    </div>
                </header>

                {librarySetupMessage ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
                    >
                        <p className="font-semibold">Biblioteca indisponível</p>
                        <p className="mt-1 leading-relaxed">{librarySetupMessage}</p>
                    </div>
                ) : null}

                <div
                    className="-mx-1 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] px-1 [&::-webkit-scrollbar]:hidden"
                    role="tablist"
                    aria-label="Categorias"
                >
                    {categories.map((c) => {
                        const active = tab === c.value;
                        return (
                            <button
                                key={c.value}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setTab(c.value)}
                                className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                                    active
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                                }`}
                            >
                                {c.label}
                            </button>
                        );
                    })}
                </div>

                {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200/90 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <BookOpenIcon className="mx-auto h-9 w-9 text-zinc-400 dark:text-zinc-500" />
                        <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {filtered.map((b) => {
                            const cover = imageSrc(b.cover_url, appUrl);
                            const pdf = b.pdf_url ? imageSrc(b.pdf_url, appUrl) : '';
                            const showUrl = route('mobile.biblioteca.show', b.id);

                            const coverVisual = cover ? (
                                <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                                    <BookOpenIcon className="h-10 w-10 text-zinc-400" aria-hidden />
                                </div>
                            );

                            const coverShellClass =
                                'relative block aspect-[3/4] w-[8.75rem] shrink-0 overflow-hidden rounded-lg bg-zinc-100 touch-manipulation transition active:opacity-90 dark:bg-zinc-800 sm:w-36';

                            const coverBlock =
                                pdf !== '' ? (
                                    <a
                                        href={pdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={coverShellClass}
                                        aria-label={`Abrir PDF: ${b.title}`}
                                        title="Abrir PDF"
                                    >
                                        {coverVisual}
                                    </a>
                                ) : (
                                    <Link href={showUrl} className={coverShellClass} aria-label={`Ver: ${b.title}`}>
                                        {coverVisual}
                                    </Link>
                                );

                            return (
                                <li
                                    key={b.id}
                                    className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="flex items-start gap-4 p-4">
                                        {coverBlock}
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <h2 className="text-lg font-bold leading-snug tracking-[-0.02em] text-zinc-900 antialiased dark:text-white sm:text-xl sm:tracking-[-0.025em]">
                                                {b.title}
                                            </h2>
                                            {b.subtitle ? (
                                                <p className="mt-1.5 line-clamp-2 text-[15px] font-normal leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    {b.subtitle}
                                                </p>
                                            ) : null}
                                            <div className="mt-4 flex flex-wrap items-stretch gap-2">
                                                <Link
                                                    href={showUrl}
                                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                                >
                                                    <BookOpenIcon className="h-4 w-4 shrink-0 text-white dark:text-zinc-900" aria-hidden />
                                                    Ler no app
                                                </Link>
                                                {pdf !== '' ? (
                                                    <a
                                                        href={pdf}
                                                        download
                                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-900 bg-white px-3 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                                    >
                                                        <ArrowDownTrayIcon
                                                            className="h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100"
                                                            aria-hidden
                                                        />
                                                        Download
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
