import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import PageHeader from '@/Components/PageHeader';
import TextInput from '@/Components/TextInput';
import SecondaryButton from '@/Components/SecondaryButton';
import ListSearchHint from '@/Components/ListSearchHint';
import Card from '@/Components/Card';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import { confirmAction } from '@/utils/confirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    CalendarDaysIcon,
    NewspaperIcon,
    PhotoIcon,
    PowerIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import { isListSearchBelowMinimum, LIST_SEARCH_DEBOUNCE_MS, serverSearchTerm } from '@/utils/listSearch';

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    section: string;
    section_label: string;
    author_name: string | null;
    source_url: string;
    image_url: string | null;
    cover_url: string | null;
    published_at: string | null;
    is_active: boolean;
}

interface SectionOption {
    value: string;
    label: string;
}

interface Props {
    articles: {
        data: Article[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
    };
    canManage: boolean;
    sections: SectionOption[];
    filters: {
        section: string | null;
        q: string | null;
        status: 'all' | 'active' | 'inactive';
    };
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function buildQuery(filters: { section: string | null; q: string | null; status: string }): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.section) params.section = filters.section;
    if (filters.q) params.q = filters.q;
    if (filters.status !== 'all') params.status = filters.status;
    return params;
}

export default function RevistaAdventistaIndex({ articles, canManage, sections, filters }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.q ?? '');
    const [syncing, setSyncing] = useState(false);
    const lastAppliedSearchRef = useRef(filters.q ?? '');
    const searchBelowMinimum = isListSearchBelowMinimum(searchQuery);

    useEffect(() => {
        setSearchQuery(filters.q ?? '');
        lastAppliedSearchRef.current = filters.q ?? '';
    }, [filters.q]);

    useEffect(() => {
        const resolved = serverSearchTerm(searchQuery);
        const applied = lastAppliedSearchRef.current;
        const next = resolved ?? '';

        if (next === applied) return;

        const timer = window.setTimeout(() => {
            lastAppliedSearchRef.current = next;
            router.get(
                route('revista-adventista.index'),
                buildQuery({ section: filters.section, q: resolved ?? null, status: filters.status }),
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, LIST_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchQuery, filters.section, filters.status]);

    const applyFilter = (patch: Partial<typeof filters>) => {
        router.get(
            route('revista-adventista.index'),
            buildQuery({ ...filters, ...patch }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleSetActive = async (article: Article, isActive: boolean) => {
        const ok = await confirmAction({
            title: `${isActive ? 'Ativar' : 'Desativar'} publicação?`,
            text: isActive
                ? 'Ela voltará a aparecer no app.'
                : 'Ela vai sumir do app, mas continua visível neste painel.',
            confirmButtonText: isActive ? 'Ativar' : 'Desativar',
            danger: !isActive,
            icon: 'warning',
        });
        if (!ok) return;
        router.patch(route('revista-adventista.active', article.id), { is_active: isActive }, { preserveScroll: true });
    };

    const handleSync = () => {
        setSyncing(true);
        router.post(route('revista-adventista.sync-articles'), {}, {
            preserveScroll: true,
            onFinish: () => setSyncing(false),
        });
    };

    const isEmpty = articles.data.length === 0;

    return (
        <AdminLayout>
            <Head title="Revista Adventista" />
            <FlashMessages />

            <PageHeader
                title="Revista Adventista"
                actions={
                    canManage ? (
                        <SecondaryButton
                            type="button"
                            onClick={handleSync}
                            disabled={syncing}
                            className="cursor-pointer"
                        >
                            <ArrowPathIcon className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
                            {syncing ? 'Sincronizando…' : 'Sincronizar'}
                        </SecondaryButton>
                    ) : undefined
                }
            >
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Artigos importados do site da Revista Adventista. Desative publicações que não devem aparecer no app.
                </p>
                <div className="mt-3 w-full max-w-md">
                    <TextInput
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por assunto, título, autor ou texto…"
                        className="w-full"
                    />
                    <ListSearchHint show={searchBelowMinimum} className="mt-1" />
                </div>
            </PageHeader>

            <div className="mb-4 flex flex-wrap gap-2">
                {(['all', 'active', 'inactive'] as const).map((status) => {
                    const labels = { all: 'Todos', active: 'Ativos', inactive: 'Desativados' };
                    const active = filters.status === status;
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => applyFilter({ status })}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                active
                                    ? 'bg-teal-600 text-white dark:bg-teal-500'
                                    : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                            }`}
                        >
                            {labels[status]}
                        </button>
                    );
                })}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => applyFilter({ section: null })}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        filters.section === null
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                    }`}
                >
                    Todas as seções
                </button>
                {sections.map((section) => (
                    <button
                        key={section.value}
                        type="button"
                        onClick={() => applyFilter({ section: section.value })}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                            filters.section === section.value
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            {isEmpty ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <NewspaperIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                    <p className="mt-4 font-medium text-zinc-700 dark:text-zinc-300">Nenhum artigo encontrado</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {canManage ? 'Use «Sincronizar» para importar do site da revista.' : 'Ajuste os filtros ou a busca.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-2">
                    {articles.data.map((article) => {
                        const hero = article.cover_url || article.image_url;
                        const isActive = article.is_active;

                        return (
                            <Card key={article.id} className="flex flex-col gap-4 p-4 sm:p-6">
                                {hero ? (
                                    <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 md:h-48">
                                        <img
                                            src={hero}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                                            {article.section_label}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="relative flex h-32 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-teal-50 dark:from-sky-950/30 dark:to-teal-950/20">
                                        <PhotoIcon className="h-12 w-12 text-teal-500/60" />
                                        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                                            {article.section_label}
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-1 flex-col gap-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{article.title}</h2>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                <CalendarDaysIcon className="h-4 w-4 shrink-0" />
                                                <span>{formatDate(article.published_at)}</span>
                                                {!isActive && (
                                                    <span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                        Desativado
                                                    </span>
                                                )}
                                                {article.author_name && <span>• {article.author_name}</span>}
                                            </div>
                                        </div>
                                        {canManage && (
                                            <ListCardActionRow className="shrink-0 gap-1">
                                                <ListCardIconActionButton
                                                    label={isActive ? 'Desativar' : 'Ativar'}
                                                    icon={<PowerIcon className="h-5 w-5" />}
                                                    onClick={() => handleSetActive(article, !isActive)}
                                                />
                                            </ListCardActionRow>
                                        )}
                                    </div>
                                    {article.excerpt && (
                                        <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">{article.excerpt}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                        <Link
                                            href={route('mobile.revista-adventista.show', article.slug)}
                                            className="cursor-pointer text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                                        >
                                            Ver na app
                                        </Link>
                                        <a
                                            href={article.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                                        >
                                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
                                            Site da revista
                                        </a>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {articles.last_page > 1 && (
                <nav className="flex flex-wrap justify-center gap-2 pb-8" aria-label="Paginação">
                    {articles.links.map((link, index) => {
                        if (!link.url) {
                            return (
                                <span
                                    key={`${link.label}-${index}`}
                                    className="inline-flex min-w-[2.25rem] cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700"
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
                                        ? 'border-teal-600 bg-teal-600 text-white'
                                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        );
                    })}
                </nav>
            )}
        </AdminLayout>
    );
}
