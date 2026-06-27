import MobileLayout from '@/Layouts/MobileLayout';
import ListSearchHint from '@/Components/ListSearchHint';
import NewsPostCover from '@/Components/News/NewsPostCover';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpenIcon, MagnifyingGlassIcon, NewspaperIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import { isListSearchBelowMinimum, LIST_SEARCH_DEBOUNCE_MS, serverSearchTerm } from '@/utils/listSearch';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    section: string;
    section_label: string;
    author_name: string | null;
    image_url: string | null;
    cover_url: string | null;
    published_at: string | null;
}

interface SectionOption {
    value: string;
    label: string;
}

interface Props {
    articles: {
        data: Article[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
    };
    sections: SectionOption[];
    filters: {
        section: string | null;
        q: string | null;
    };
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

function buildQuery(section: string | null, q: string | null): Record<string, string> {
    const params: Record<string, string> = {};
    if (section) params.section = section;
    if (q) params.q = q;
    return params;
}

export default function MobileRevistaAdventista({ articles, sections, filters }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const isEmpty = articles.data.length === 0;
    const activeSection = filters.section;
    const activeSearch = filters.q;
    const [searchQuery, setSearchQuery] = useState(activeSearch ?? '');
    const lastAppliedSearchRef = useRef(activeSearch ?? '');
    const searchBelowMinimum = isListSearchBelowMinimum(searchQuery);

    useEffect(() => {
        setSearchQuery(activeSearch ?? '');
        lastAppliedSearchRef.current = activeSearch ?? '';
    }, [activeSearch]);

    useEffect(() => {
        const resolved = serverSearchTerm(searchQuery);
        const applied = lastAppliedSearchRef.current;
        const next = resolved ?? '';

        if (next === applied) return;

        const timer = window.setTimeout(() => {
            lastAppliedSearchRef.current = next;
            router.get(route('mobile.revista-adventista'), buildQuery(activeSection, resolved ?? null), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, LIST_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchQuery, activeSection]);

    const applySection = (section: string | null) => {
        router.get(
            route('mobile.revista-adventista'),
            buildQuery(section, activeSearch),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const clearSearch = () => {
        lastAppliedSearchRef.current = '';
        setSearchQuery('');
        router.get(route('mobile.revista-adventista'), buildQuery(activeSection, null), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <MobileLayout>
            <Head title="Revista Adventista" />
            <div className="mx-auto w-full max-w-lg space-y-6 sm:max-w-none">
                <div className="space-y-3">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            Revista Adventista
                        </h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Artigos, editoriais e colunas publicados pela Revista Adventista.
                        </p>
                    </div>

                    <div className="relative">
                        <MagnifyingGlassIcon
                            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                            aria-hidden
                        />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por assunto, título, autor ou texto…"
                            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
                            aria-label="Buscar na Revista Adventista"
                        />
                        {searchQuery.trim() !== '' ? (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                aria-label="Limpar busca"
                            >
                                <XMarkIcon className="h-5 w-5" aria-hidden />
                            </button>
                        ) : null}
                        <ListSearchHint show={searchBelowMinimum} className="mt-1 pl-10" />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => applySection(null)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                            activeSection === null
                                ? 'bg-teal-600 text-white dark:bg-teal-500'
                                : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                    >
                        Todos
                    </button>
                    {sections.map((section) => (
                        <button
                            key={section.value}
                            type="button"
                            onClick={() => applySection(section.value)}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                activeSection === section.value
                                    ? 'bg-teal-600 text-white dark:bg-teal-500'
                                    : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                            }`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>

                {isEmpty ? (
                    <div className="py-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <BookOpenIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">
                            {activeSearch ? 'Nenhum artigo encontrado' : 'Nenhum artigo disponível'}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                            {activeSearch
                                ? 'Tente outras palavras ou remova os filtros.'
                                : 'Os conteúdos serão sincronizados automaticamente.'}
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {articles.data.map((article) => {
                            const thumb = article.cover_url || article.image_url;
                            const snippet = article.excerpt?.trim() ?? '';

                            return (
                                <li
                                    key={article.id}
                                    className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                                >
                                    {thumb ? (
                                        <div className="relative rounded-t-2xl">
                                            <NewsPostCover
                                                imageSrc={imageSrc(thumb, appUrl)}
                                                detailHref={route('mobile.revista-adventista.show', article.slug)}
                                                onImageError={(e) => {
                                                    const el = e.currentTarget;
                                                    el.style.display = 'none';
                                                    const next = el.nextElementSibling as HTMLElement | null;
                                                    if (next) next.style.display = 'flex';
                                                }}
                                                imageFallback={
                                                    <div
                                                        className="absolute inset-0 hidden items-center justify-center bg-zinc-200 dark:bg-zinc-700"
                                                        style={{ display: 'none' }}
                                                        aria-hidden
                                                    >
                                                        <NewspaperIcon className="h-12 w-12 text-zinc-400" />
                                                    </div>
                                                }
                                                overlaySlot={
                                                    <>
                                                        <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                                                            {article.section_label}
                                                        </span>
                                                        <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                                            {formatDate(article.published_at)}
                                                        </span>
                                                    </>
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <Link
                                            href={route('mobile.revista-adventista.show', article.slug)}
                                            className="block cursor-pointer rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                                        >
                                            <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-sky-100 via-zinc-100 to-teal-50 dark:from-sky-950/30 dark:via-zinc-800 dark:to-teal-950/20">
                                                <NewspaperIcon className="h-12 w-12 text-teal-600/70 dark:text-teal-400/60" />
                                                <span className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
                                                    {formatDate(article.published_at)}
                                                </span>
                                            </div>
                                        </Link>
                                    )}

                                    <div className="flex flex-1 flex-col p-4">
                                        <Link
                                            href={route('mobile.revista-adventista.show', article.slug)}
                                            className="cursor-pointer group"
                                        >
                                            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                                                {article.title}
                                            </h2>
                                        </Link>
                                        {article.author_name && (
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{article.author_name}</p>
                                        )}
                                        {snippet && (
                                            <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                                {snippet}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {articles.last_page > 1 && (
                    <nav className="flex flex-wrap justify-center gap-2 pt-2" aria-label="Paginação">
                        {articles.links.map((link, index) => {
                            if (!link.url) {
                                return (
                                    <span
                                        key={`${link.label}-${index}`}
                                        className="inline-flex min-w-[2.25rem] cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                );
                            }

                            return (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url}
                                    preserveScroll
                                    className={`inline-flex min-w-[2.25rem] cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm transition ${
                                        link.active
                                            ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-500 dark:bg-teal-500'
                                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            );
                        })}
                    </nav>
                )}
            </div>
        </MobileLayout>
    );
}
