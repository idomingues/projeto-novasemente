import { Link, usePage } from '@inertiajs/react';
import { PlayCircleIcon } from '@heroicons/react/24/solid';
import FeedCaptionBody from '@/Components/News/FeedCaptionBody';
import FeedPostHeader, { type FeedPostAuthor } from '@/Components/News/FeedPostHeader';
import { feedCaptionText } from '@/utils/feedCaption';

function mediaSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

export interface InstagramFeedPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    image_url: string | null;
    cover_url: string | null;
    video_url?: string | null;
    published_at: string | null;
    author?: FeedPostAuthor | null;
}

function captionForPost(post: InstagramFeedPost): string {
    return feedCaptionText(post.body || post.excerpt || '', post.title);
}

interface Props {
    post: InstagramFeedPost;
    appUrl: string;
    /** Lista no feed: legenda truncada; detalhe: texto completo */
    variant?: 'feed' | 'detail';
}

function FeedMedia({
    post,
    appUrl,
    variant,
    showHref,
}: {
    post: InstagramFeedPost;
    appUrl: string;
    variant: 'feed' | 'detail';
    showHref: string;
}) {
    const videoUrl = post.video_url ? mediaSrc(post.video_url, appUrl) : '';
    const posterUrl = post.cover_url || post.image_url;
    const poster = posterUrl ? mediaSrc(posterUrl, appUrl) : undefined;
    const isDetail = variant === 'detail';
    const aspectClass = videoUrl ? 'aspect-[9/16]' : 'aspect-[4/5]';

    if (videoUrl) {
        const video = (
            <video
                src={videoUrl}
                poster={poster}
                className="h-full w-full object-cover"
                controls={isDetail}
                playsInline
                muted={!isDetail}
                loop={!isDetail}
                autoPlay={!isDetail}
                preload={isDetail ? 'metadata' : 'auto'}
            />
        );

        if (isDetail) {
            return (
                <div className={`relative w-full overflow-hidden bg-zinc-950 ${aspectClass}`}>
                    {video}
                </div>
            );
        }

        return (
            <Link
                href={showHref}
                className={`relative block w-full overflow-hidden bg-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${aspectClass}`}
            >
                {video}
                <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 p-1.5 text-white">
                    <PlayCircleIcon className="h-6 w-6" aria-hidden />
                </span>
            </Link>
        );
    }

    const thumb = poster;
    if (!thumb) {
        return null;
    }

    if (isDetail) {
        return (
            <div className={`relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${aspectClass}`}>
                <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                />
            </div>
        );
    }

    return (
        <Link
            href={showHref}
            className={`relative block w-full overflow-hidden bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:bg-zinc-800 ${aspectClass}`}
        >
            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        </Link>
    );
}

export default function InstagramFeedCard({ post, appUrl, variant = 'feed' }: Props) {
    const { currentChurch, defaultBrandLogoUrl } = usePage().props as {
        currentChurch?: { name: string; logo_url?: string | null } | null;
        defaultBrandLogoUrl?: string;
    };
    const publisherName = currentChurch?.name ?? 'Nova Semente';
    const publisherLogoUrl = currentChurch?.logo_url ?? defaultBrandLogoUrl ?? '/logo-ns.png';

    const caption = captionForPost(post);
    const showHref = route('mobile.news.show', post.slug);
    const isDetail = variant === 'detail';

    return (
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <FeedPostHeader
                author={post.author}
                churchName={publisherName}
                churchLogoUrl={publisherLogoUrl}
                publishedAt={post.published_at}
            />

            <FeedMedia post={post} appUrl={appUrl} variant={variant} showHref={showHref} />

            {(post.title || caption || !isDetail) && (
                <div className="space-y-1 px-4 py-3">
                    {post.title ? (
                        isDetail ? (
                            <h2 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                                {post.title}
                            </h2>
                        ) : (
                            <Link
                                href={showHref}
                                className="block text-sm font-semibold leading-snug text-zinc-900 hover:underline dark:text-white"
                            >
                                {post.title}
                            </Link>
                        )
                    ) : null}
                    {caption ? (
                        <FeedCaptionBody caption={caption} clampLines={!isDetail} />
                    ) : !isDetail && !post.title ? (
                        <Link href={showHref} className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                            Ver publicação
                        </Link>
                    ) : null}
                </div>
            )}
        </article>
    );
}
