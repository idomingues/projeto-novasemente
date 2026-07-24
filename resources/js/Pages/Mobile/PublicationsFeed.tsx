import PublicationFeedCard, { type PublicationFeedItem } from '@/Components/Mobile/PublicationFeedCard';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, usePage } from '@inertiajs/react';
import { NewspaperIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

type FeedItemsPayload = {
    data: PublicationFeedItem[];
    current_page: number;
    has_more: boolean;
    next_page: number | null;
};

interface Props {
    items: FeedItemsPayload;
    typeOptions?: unknown;
    filters?: {
        type: string | null;
        sort: string;
    };
}

type PageProps = {
    appUrl?: string;
};

export default function PublicationsFeed({ items }: Props) {
    const pageProps = usePage().props as PageProps;
    const appUrl = (pageProps.appUrl ?? '') as string;
    const [feedItems, setFeedItems] = useState(items.data);
    const [hasMore, setHasMore] = useState(items.has_more);
    const [nextPage, setNextPage] = useState(items.next_page);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        setFeedItems(items.data);
        setHasMore(items.has_more);
        setNextPage(items.next_page);
    }, [items]);

    const patchItem = (
        id: string,
        patch: { likes_count?: number; comments_count?: number; liked_by_me?: boolean },
    ) => {
        setFeedItems((current) =>
            current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        );
    };

    const loadMore = async () => {
        if (loadingMore || !hasMore || nextPage === null) {
            return;
        }

        setLoadingMore(true);
        try {
            const params = new URLSearchParams({ page: String(nextPage) });
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

    return (
        <MobileLayout>
            <Head title="Publicações" />
            <div className="mx-auto w-full max-w-lg sm:max-w-xl md:max-w-2xl">
                {feedItems.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <NewspaperIcon className="h-7 w-7 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma publicação</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                            Quando houver novidades, elas aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <>
                        <ul className="divide-y-0 sm:space-y-4 sm:py-2">
                            {feedItems.map((item) => (
                                <PublicationFeedCard
                                    key={item.id}
                                    item={item}
                                    appUrl={appUrl}
                                    onEngagementChange={patchItem}
                                />
                            ))}
                        </ul>

                        {hasMore ? (
                            <div className="flex justify-center py-6">
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
                            <p className="pb-6 pt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                                Você viu tudo por aqui
                            </p>
                        )}
                    </>
                )}
            </div>
        </MobileLayout>
    );
}
