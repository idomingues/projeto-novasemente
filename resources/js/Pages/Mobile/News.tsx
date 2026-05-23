import MobileLayout from '@/Layouts/MobileLayout';
import InstagramFeedCard, { type InstagramFeedPost } from '@/Components/News/InstagramFeedCard';
import { Head, Link, usePage } from '@inertiajs/react';
import { DocumentTextIcon, NewspaperIcon, PhotoIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import { InstagramBrandIcon } from '@/Components/SocialBrandIcons';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

type ContentType = 'article' | 'youtube' | 'pdf' | 'image' | 'instagram_feed' | 'instagram_link';

interface Post {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    content_type: ContentType;
    image_url: string | null;
    cover_url: string | null;
    published_at: string | null;
}

interface Props {
    feedPosts: InstagramFeedPost[];
    posts: {
        data: Post[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
    };
    config?: {
        pageTitle?: string;
        showRoute?: 'mobile.news.show' | 'mobile.health.show';
        sectionTitle?: string;
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

function previewSnippet(p: Post): string {
    if (p.excerpt?.trim()) return p.excerpt.trim();
    const raw = (p.body || '').trim();
    if (!raw) {
        if (p.content_type === 'youtube') return 'Vídeo no YouTube';
        if (p.content_type === 'pdf') return 'Documento PDF';
        if (p.content_type === 'image') return 'Imagem';
        if (p.content_type === 'instagram_link') return 'Publicação no Instagram';
        return '';
    }
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.length > 220 ? `${plain.slice(0, 220)}…` : plain;
}

function TypeCornerBadge({ type }: { type: ContentType }) {
    if (type === 'youtube') {
        return (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <PlayCircleIcon className="h-3.5 w-3.5" aria-hidden />
                Vídeo
            </span>
        );
    }
    if (type === 'pdf') {
        return (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-rose-900/85 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <DocumentTextIcon className="h-3.5 w-3.5" aria-hidden />
                PDF
            </span>
        );
    }
    if (type === 'image') {
        return (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <PhotoIcon className="h-3.5 w-3.5" aria-hidden />
                Imagem
            </span>
        );
    }
    if (type === 'instagram_link') {
        return (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-pink-900/85 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <InstagramBrandIcon className="h-3.5 w-3.5" aria-hidden />
                Instagram
            </span>
        );
    }
    return null;
}

export default function MobileNews({ feedPosts, posts, config }: Props) {
    const resolvedConfig = config ?? {};
    const pageTitle = resolvedConfig.pageTitle ?? 'Notícias';
    const showRoute = resolvedConfig.showRoute ?? 'mobile.news.show';
    const sectionTitle = resolvedConfig.sectionTitle ?? 'Notícias';
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const hasFeed = feedPosts.length > 0;
    const hasGrid = posts.data.length > 0;
    const isEmpty = !hasFeed && !hasGrid;

    return (
        <MobileLayout>
            <Head title={pageTitle} />
            <div className="space-y-8">
                {isEmpty ? (
                    <div className="py-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <NewspaperIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma notícia publicada</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">As novidades aparecerão aqui.</p>
                    </div>
                ) : (
                    <>
                        {hasFeed && (
                            <section className="space-y-4">
                                <ul className="mx-auto flex max-w-md flex-col gap-6">
                                    {feedPosts.map((p) => (
                                        <li key={p.id}>
                                            <InstagramFeedCard
                                                post={p}
                                                appUrl={appUrl}
                                                variant="feed"
                                                showRoute={showRoute}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {hasGrid && (
                            <section className="space-y-4">
                                {hasFeed && (
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{sectionTitle}</h2>
                                )}
                                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {posts.data.map((p) => {
                                        const thumb = p.cover_url || p.image_url;
                                        const snippet = previewSnippet(p);
                                        return (
                                            <li
                                                key={p.id}
                                                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                                            >
                                                {thumb ? (
                                                    <div className="relative">
                                                        <Link
                                                            href={route(showRoute, p.slug)}
                                                            className="block rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                                                        >
                                                            <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                                <TypeCornerBadge type={p.content_type} />
                                                                <img
                                                                    src={imageSrc(thumb, appUrl)}
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                    onError={(e) => {
                                                                        const el = e.currentTarget;
                                                                        el.style.display = 'none';
                                                                        const next = el.nextElementSibling as HTMLElement | null;
                                                                        if (next) next.style.display = 'flex';
                                                                    }}
                                                                />
                                                                <div
                                                                    className="absolute inset-0 hidden items-center justify-center bg-zinc-200 dark:bg-zinc-700"
                                                                    style={{ display: 'none' }}
                                                                    aria-hidden
                                                                >
                                                                    <NewspaperIcon className="h-12 w-12 text-zinc-400" />
                                                                </div>
                                                                <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                                                    {formatDate(p.published_at)}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={route(showRoute, p.slug)}
                                                        className="block rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                                                    >
                                                        <div
                                                            className={`relative flex h-32 items-center justify-center ${
                                                                p.content_type === 'instagram_link'
                                                                    ? 'bg-gradient-to-br from-pink-100 via-purple-50 to-rose-100 dark:from-pink-950/30 dark:via-zinc-800 dark:to-purple-950/20'
                                                                    : 'bg-gradient-to-br from-rose-100 via-zinc-100 to-amber-50 dark:from-rose-950/30 dark:via-zinc-800 dark:to-amber-950/20'
                                                            }`}
                                                        >
                                                            <TypeCornerBadge type={p.content_type} />
                                                            {p.content_type === 'instagram_link' ? (
                                                                <InstagramBrandIcon className="h-12 w-12 text-pink-600/80 dark:text-pink-400/70" />
                                                            ) : (
                                                                <DocumentTextIcon className="h-12 w-12 text-rose-500/70 dark:text-rose-400/60" />
                                                            )}
                                                            <span className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
                                                                {formatDate(p.published_at)}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                )}
                                                <Link
                                                    href={route(showRoute, p.slug)}
                                                    className="block rounded-b-2xl p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                                                >
                                                    <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-900 dark:text-white">
                                                        {p.title}
                                                    </h2>
                                                    {!thumb && (
                                                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                            {formatDate(p.published_at)}
                                                        </p>
                                                    )}
                                                    {snippet && (
                                                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                                            {snippet}
                                                        </p>
                                                    )}
                                                    <span className="mt-3 inline-block text-sm font-semibold text-primary-600 dark:text-primary-400">
                                                        Ver publicação
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}
                    </>
                )}

                {posts.last_page > 1 && (
                    <nav className="flex justify-center">
                        <ul className="inline-flex overflow-hidden rounded-full border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                            {posts.links.map((link, index) => (
                                <li key={index}>
                                    {link.url ? (
                                        <Link
                                            href={link.url}
                                            className={`block border-l border-zinc-200 px-4 py-2 text-sm first:border-l-0 dark:border-zinc-700 ${
                                                link.active
                                                    ? 'bg-zinc-900 font-semibold text-white dark:bg-white dark:text-zinc-900'
                                                    : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            className="block cursor-default border-l border-zinc-200 px-4 py-2 text-sm text-zinc-400 first:border-l-0 dark:border-zinc-700 dark:text-zinc-600"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </div>
        </MobileLayout>
    );
}
