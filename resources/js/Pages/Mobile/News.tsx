import MobileLayout from '@/Layouts/MobileLayout';
import InstagramFeedCard, { type InstagramFeedPost } from '@/Components/News/InstagramFeedCard';
import InstagramViewLink from '@/Components/News/InstagramViewLink';
import { Head, Link, usePage } from '@inertiajs/react';
import { DocumentTextIcon, NewspaperIcon, PhotoIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import NewsPostCover from '@/Components/News/NewsPostCover';

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

interface Post extends InstagramFeedPost {
    content_type: ContentType;
    excerpt: string | null;
    body: string;
    has_video?: boolean;
}

interface Props {
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
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-emerald-900/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <PhotoIcon className="h-3.5 w-3.5" aria-hidden />
                Imagem
            </span>
        );
    }
    return null;
}

export default function MobileNews({ posts, config }: Props) {
    const resolvedConfig = config ?? {};
    const pageTitle = resolvedConfig.pageTitle ?? 'Notícias';
    const showRoute = resolvedConfig.showRoute ?? 'mobile.news.show';
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const isEmpty = posts.data.length === 0;

    return (
        <MobileLayout>
            <Head title={pageTitle} />
            <div className="mx-auto w-full max-w-lg space-y-8 sm:max-w-none">
                {isEmpty ? (
                    <div className="py-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <NewspaperIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma notícia publicada</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">As novidades aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {posts.data.map((p) => {
                            if (p.content_type === 'instagram_feed') {
                                return (
                                    <li key={p.id} className="min-w-0">
                                        <InstagramFeedCard
                                            post={p}
                                            appUrl={appUrl}
                                            variant="feed"
                                            showRoute={showRoute}
                                        />
                                    </li>
                                );
                            }

                            const thumb = p.cover_url || p.image_url;
                            const snippet = previewSnippet(p);
                            const instagramUrl = p.instagram_url?.trim() || '';
                            const showPlay = Boolean(p.has_video);

                            return (
                                <li
                                    key={p.id}
                                    className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                                >
                                    {thumb ? (
                                        <div className="relative rounded-t-2xl">
                                            <NewsPostCover
                                                imageSrc={imageSrc(thumb, appUrl)}
                                                instagramVideoUrl={
                                                    showPlay && instagramUrl ? instagramUrl : null
                                                }
                                                detailHref={
                                                    showPlay && instagramUrl
                                                        ? undefined
                                                        : route(showRoute, p.slug)
                                                }
                                                showPlayOverlay={showPlay}
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
                                                        <TypeCornerBadge type={p.content_type} />
                                                        <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                                            {formatDate(p.published_at)}
                                                        </span>
                                                    </>
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <Link
                                            href={route(showRoute, p.slug)}
                                            className="block cursor-pointer rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                                        >
                                            <div
                                                className={`relative flex h-32 items-center justify-center ${
                                                    p.content_type === 'instagram_link'
                                                        ? 'bg-gradient-to-br from-pink-100 via-purple-50 to-rose-100 dark:from-pink-950/30 dark:via-zinc-800 dark:to-purple-950/20'
                                                        : 'bg-gradient-to-br from-rose-100 via-zinc-100 to-amber-50 dark:from-rose-950/30 dark:via-zinc-800 dark:to-amber-950/20'
                                                }`}
                                            >
                                                <TypeCornerBadge type={p.content_type} />
                                                <DocumentTextIcon className="h-12 w-12 text-rose-500/70 dark:text-rose-400/60" />
                                                <span className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
                                                    {formatDate(p.published_at)}
                                                </span>
                                            </div>
                                        </Link>
                                    )}
                                    <Link
                                        href={route(showRoute, p.slug)}
                                        className="flex flex-1 cursor-pointer flex-col rounded-b-2xl p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                                    >
                                        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-900 dark:text-white">
                                            {p.title}
                                        </h2>
                                        {snippet ? (
                                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                                {snippet}
                                            </p>
                                        ) : null}
                                        <span className="mt-3 inline-block text-sm font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400">
                                            Ler publicação
                                        </span>
                                    </Link>
                                    {instagramUrl ? (
                                        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                                            <InstagramViewLink href={instagramUrl} />
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {posts.last_page > 1 && (
                    <nav className="flex justify-center">
                        <ul className="inline-flex overflow-hidden rounded-full border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                            {posts.links.map((link, index) => (
                                <li key={index}>
                                    {link.url ? (
                                        <Link
                                            href={link.url}
                                            className={`block cursor-pointer border-l border-zinc-200 px-4 py-2 text-sm first:border-l-0 dark:border-zinc-700 ${
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
