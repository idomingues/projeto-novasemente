import { Link, usePage } from '@inertiajs/react';
import { PlayCircleIcon } from '@heroicons/react/24/solid';
import FeedCaptionBody from '@/Components/News/FeedCaptionBody';
import FeedPostHeader, { type FeedPostAuthor } from '@/Components/News/FeedPostHeader';
import CoverWithVideoLink from '@/Components/News/CoverWithVideoLink';
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
    instagram_url?: string | null;
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
    showRoute?: 'mobile.news.show' | 'mobile.health.show';
}

function FeedMedia({
    post,
    appUrl,
    variant,
    showHref,
    instagramUrl,
}: {
    post: InstagramFeedPost;
    appUrl: string;
    variant: 'feed' | 'detail';
    showHref: string;
    instagramUrl: string;
}) {
    const videoUrl = post.video_url ? mediaSrc(post.video_url, appUrl) : '';
    const posterUrl = post.cover_url || post.image_url;
    const poster = posterUrl ? mediaSrc(posterUrl, appUrl) : undefined;
    const isDetail = variant === 'detail';
    const aspectClass = videoUrl ? 'aspect-[9/16]' : 'aspect-[4/5]';
    const imageLinksToInstagram = !videoUrl && Boolean(poster && instagramUrl);

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

    const image = (
        <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            loading={isDetail ? 'eager' : 'lazy'}
            decoding="async"
        />
    );

    if (imageLinksToInstagram) {
        return (
            <CoverWithVideoLink
                videoHref={instagramUrl}
                className={`w-full bg-zinc-100 dark:bg-zinc-800 ${aspectClass}`}
            >
                {image}
            </CoverWithVideoLink>
        );
    }

    if (isDetail) {
        return (
            <div className={`relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${aspectClass}`}>
                {image}
            </div>
        );
    }

    return (
        <Link
            href={showHref}
            className={`relative block w-full overflow-hidden bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:bg-zinc-800 ${aspectClass}`}
        >
            {image}
        </Link>
    );
}

export default function InstagramFeedCard({
    post,
    appUrl,
    variant = 'feed',
    showRoute = 'mobile.news.show',
}: Props) {
    const { currentChurch, defaultBrandLogoUrl } = usePage().props as {
        currentChurch?: { name: string; logo_url?: string | null } | null;
        defaultBrandLogoUrl?: string;
    };
    const publisherName = currentChurch?.name ?? 'Nova Semente';
    const publisherLogoUrl = currentChurch?.logo_url ?? defaultBrandLogoUrl ?? '/logo-ns.png';

    const caption = captionForPost(post);
    const showHref = route(showRoute, post.slug);
    const isDetail = variant === 'detail';
    const instagramUrl = post.instagram_url?.trim() || '';
    const posterUrl = post.cover_url || post.image_url;

    return (
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <FeedPostHeader
                title={post.title}
                author={post.author}
                churchName={publisherName}
                churchLogoUrl={publisherLogoUrl}
                publishedAt={post.published_at}
            />

            <FeedMedia
                post={post}
                appUrl={appUrl}
                variant={variant}
                showHref={showHref}
                instagramUrl={instagramUrl}
            />

            {(caption || (!instagramUrl && !isDetail) || (instagramUrl && !posterUrl && !post.video_url)) && (
                <div className="space-y-3 px-4 py-3">
                    {caption ? (
                        <FeedCaptionBody caption={caption} clampLines={!isDetail} />
                    ) : !isDetail ? (
                        <Link href={showHref} className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                            Ver publicação
                        </Link>
                    ) : null}
                    {instagramUrl && !post.video_url && !(post.cover_url || post.image_url) && (
                        <CoverWithVideoLink
                            videoHref={instagramUrl}
                            className="flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 via-purple-50 to-rose-100 dark:from-pink-950/40 dark:via-zinc-900 dark:to-purple-950/30"
                        >
                            <span className="sr-only">Ver vídeo</span>
                        </CoverWithVideoLink>
                    )}
                </div>
            )}
        </article>
    );
}
