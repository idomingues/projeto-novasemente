import { Link, usePage } from '@inertiajs/react';
import FeedCaptionBody from '@/Components/News/FeedCaptionBody';
import FeedPostHeader, { type FeedPostAuthor } from '@/Components/News/FeedPostHeader';
import InstagramViewLink from '@/Components/News/InstagramViewLink';
import NewsPostCover from '@/Components/News/NewsPostCover';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';
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
    has_video?: boolean;
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
}: {
    post: InstagramFeedPost;
    appUrl: string;
    variant: 'feed' | 'detail';
    showHref: string;
}) {
    const hostedVideoUrl = post.video_url ? mediaSrc(post.video_url, appUrl) : '';
    const posterUrl = post.cover_url || post.image_url;
    const poster = posterUrl ? mediaSrc(posterUrl, appUrl) : undefined;
    const isDetail = variant === 'detail';
    const showPlay = Boolean(post.has_video) && !isDetail;

    if (hostedVideoUrl && isDetail) {
        return (
            <div className="relative w-full overflow-hidden bg-zinc-950">
                <video
                    src={hostedVideoUrl}
                    poster={poster}
                    className="h-auto max-h-[min(80vh,56rem)] w-full object-contain"
                    controls
                    playsInline
                    preload="metadata"
                />
            </div>
        );
    }

    if (hostedVideoUrl && !isDetail) {
        return (
            <Link
                href={showHref}
                className="relative block aspect-[9/16] w-full cursor-pointer overflow-hidden bg-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
            >
                <video
                    src={hostedVideoUrl}
                    poster={poster}
                    className="h-full w-full object-cover object-top"
                    playsInline
                    muted
                    loop
                    autoPlay
                    preload="auto"
                />
                {showPlay ? <VideoPlayOverlay /> : null}
            </Link>
        );
    }

    if (!poster) {
        return null;
    }

    if (isDetail) {
        return (
            <div className="relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                    src={poster}
                    alt=""
                    className="h-auto w-full object-contain object-top"
                    loading="eager"
                    decoding="async"
                />
            </div>
        );
    }

    return (
        <NewsPostCover
            imageSrc={poster}
            detailHref={showHref}
            aspectClass="aspect-[4/5]"
            showPlayOverlay={showPlay}
            imageLoading="lazy"
        />
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
    const hasHostedVideo = Boolean(post.video_url);

    return (
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <FeedPostHeader
                title={post.title}
                author={post.author}
                churchName={publisherName}
                churchLogoUrl={publisherLogoUrl}
                publishedAt={post.published_at}
            />

            <FeedMedia post={post} appUrl={appUrl} variant={variant} showHref={showHref} />

            {(caption || instagramUrl || (!instagramUrl && !isDetail) || (instagramUrl && !posterUrl && !hasHostedVideo)) && (
                <div className="space-y-3 px-4 py-3">
                    {caption ? (
                        <FeedCaptionBody caption={caption} clampLines={!isDetail} />
                    ) : !isDetail ? (
                        <Link
                            href={showHref}
                            className="cursor-pointer text-sm font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                            Ler publicação
                        </Link>
                    ) : null}
                    {instagramUrl ? <InstagramViewLink href={instagramUrl} /> : null}
                </div>
            )}
        </article>
    );
}
