import PublicationFeedCard, { type PublicationFeedItem } from '@/Components/Mobile/PublicationFeedCard';
import ListSortOptionPicker from '@/Components/ListSortOptionPicker';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { AdjustmentsHorizontalIcon, ArrowsUpDownIcon, NewspaperIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';

type TypeOption = { value: string; label: string; description?: string };

type FeedItemsPayload = {
    data: PublicationFeedItem[];
    current_page: number;
    has_more: boolean;
    next_page: number | null;
};

interface Props {
    items: FeedItemsPayload;
    typeOptions: TypeOption[];
    filters: {
        type: string | null;
        sort: string;
    };
}

const headerIconBtnClass =
    'relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800';

const headerIconBtnActiveClass =
    'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-600 dark:bg-teal-950/40 dark:text-teal-200';

const SORT_OPTIONS = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'oldest', label: 'Mais antigos' },
] as const;

type PageProps = {
    appUrl?: string;
};

function optionLabel(options: TypeOption[], value: string): string | null {
    return options.find((o) => o.value === value)?.label ?? null;
}

function feedQueryParams(filters: Props['filters'], page?: number): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.type) params.type = filters.type;
    if (filters.sort !== 'recent') params.sort = filters.sort;
    if (page !== undefined && page > 1) params.page = String(page);
    return params;
}

export default function PublicationsFeed({ items, typeOptions, filters }: Props) {
    const appUrl = ((usePage().props as PageProps).appUrl ?? '') as string;
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [draftType, setDraftType] = useState(filters.type ?? '');
    const [feedItems, setFeedItems] = useState(items.data);
    const [hasMore, setHasMore] = useState(items.has_more);
    const [nextPage, setNextPage] = useState(items.next_page);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (filterOpen) {
            setDraftType(filters.type ?? '');
        }
    }, [filterOpen, filters.type]);

    useEffect(() => {
        setFeedItems(items.data);
        setHasMore(items.has_more);
        setNextPage(items.next_page);
    }, [items]);

    const activeFilterCount = filters.type ? 1 : 0;
    const sortIsDefault = filters.sort === 'recent';

    const sortLabel = useMemo(
        () => SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? 'Mais recentes',
        [filters.sort],
    );

    const loadMore = async () => {
        if (loadingMore || !hasMore || nextPage === null) {
            return;
        }

        setLoadingMore(true);
        try {
            const params = new URLSearchParams(feedQueryParams(filters, nextPage));
            const response = await fetch(`${route('mobile.publications-feed')}?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                return;
            }

            const payload = (await response.json()) as FeedItemsPayload;
            setFeedItems((current) => [...current, ...payload.data]);
            setHasMore(payload.has_more);
            setNextPage(payload.next_page);
        } finally {
            setLoadingMore(false);
        }
    };

    const applyFilters = () => {
        router.get(route('mobile.publications-feed'), feedQueryParams({ type: draftType || null, sort: filters.sort }), {
            preserveState: true,
            preserveScroll: true,
        });
        setFilterOpen(false);
    };

    const clearFilters = () => {
        setDraftType('');
        router.get(
            route('mobile.publications-feed'),
            feedQueryParams({ type: null, sort: filters.sort }),
            { preserveState: true, preserveScroll: true },
        );
        setFilterOpen(false);
    };

    const applySort = (value: string) => {
        router.get(
            route('mobile.publications-feed'),
            feedQueryParams({ type: filters.type, sort: value }),
            { preserveState: true, preserveScroll: true },
        );
        setSortOpen(false);
    };

    const removeTypeFilter = () => {
        router.get(
            route('mobile.publications-feed'),
            feedQueryParams({ type: null, sort: filters.sort }),
            { preserveState: true, preserveScroll: true },
        );
    };

    const listControls = (
        <>
            <button
                type="button"
                title="Filtros"
                aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ativos)` : 'Filtros'}
                onClick={() => setFilterOpen(true)}
                className={`${headerIconBtnClass} ${activeFilterCount > 0 ? headerIconBtnActiveClass : ''}`}
            >
                <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden />
                {activeFilterCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                        {activeFilterCount}
                    </span>
                ) : null}
            </button>
            <button
                type="button"
                title={`Ordenação: ${sortLabel}`}
                aria-label={`Ordenação: ${sortLabel}`}
                onClick={() => setSortOpen(true)}
                className={`${headerIconBtnClass} ${!sortIsDefault ? headerIconBtnActiveClass : ''}`}
            >
                <ArrowsUpDownIcon className="h-5 w-5" aria-hidden />
            </button>
        </>
    );

    return (
        <MobileLayout>
            <Head title="Publicações" />
            <div className="mx-auto w-full max-w-lg space-y-5 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                <PageHeader title="Publicações" actions={listControls} />

                {filters.type ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={removeTypeFilter}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                            {optionLabel(typeOptions, filters.type) ?? filters.type}
                            <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
                        </button>
                    </div>
                ) : null}

                {feedItems.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <NewspaperIcon className="h-7 w-7 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma publicação</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                            {filters.type
                                ? 'Não há publicações deste tipo no momento.'
                                : 'Quando houver novidades, elas aparecerão aqui.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-4">
                            {feedItems.map((item) => (
                                <PublicationFeedCard key={item.id} item={item} appUrl={appUrl} />
                            ))}
                        </ul>

                        {hasMore ? (
                            <div className="flex justify-center pt-2 pb-6">
                                <button
                                    type="button"
                                    onClick={() => void loadMore()}
                                    disabled={loadingMore}
                                    className="cursor-pointer rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                >
                                    {loadingMore ? 'Carregando…' : 'Mais'}
                                </button>
                            </div>
                        ) : (
                            <p className="pb-6 pt-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
                                Você viu tudo por aqui
                            </p>
                        )}
                    </>
                )}
            </div>

            <Modal show={filterOpen} onClose={() => setFilterOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Filtrar publicações</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Escolha um tipo de conteúdo.</p>
                    <ul className="mt-4 space-y-2">
                        <li>
                            <button
                                type="button"
                                onClick={() => setDraftType('')}
                                className={`flex w-full cursor-pointer items-center rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                                    draftType === ''
                                        ? 'border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-300 dark:bg-zinc-800 dark:text-white'
                                        : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800/50'
                                }`}
                            >
                                Todos os tipos
                            </button>
                        </li>
                        {typeOptions.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    onClick={() => setDraftType(option.value)}
                                    className={`flex w-full cursor-pointer flex-col rounded-xl border px-4 py-3 text-left transition ${
                                        draftType === option.value
                                            ? 'border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-300 dark:bg-zinc-800 dark:text-white'
                                            : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800/50'
                                    }`}
                                >
                                    <span className="text-sm font-medium">{option.label}</span>
                                    {option.description ? (
                                        <span className="mt-1 text-xs font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                                            {option.description}
                                        </span>
                                    ) : null}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                        <SecondaryButton type="button" onClick={clearFilters} className="cursor-pointer">
                            Limpar filtros
                        </SecondaryButton>
                        <SecondaryButton type="button" onClick={() => setFilterOpen(false)} className="cursor-pointer">
                            Fechar
                        </SecondaryButton>
                        <PrimaryButton type="button" onClick={applyFilters} className="cursor-pointer">
                            Aplicar
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            <Modal show={sortOpen} onClose={() => setSortOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Ordenação</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Toque em uma opção para aplicar.</p>
                    <ListSortOptionPicker
                        options={SORT_OPTIONS}
                        value={filters.sort}
                        onChange={applySort}
                    />
                </div>
            </Modal>
        </MobileLayout>
    );
}
