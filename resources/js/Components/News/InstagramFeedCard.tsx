import { Link } from '@inertiajs/react';
import { PlayCircleIcon } from '@heroicons/react/24/solid';

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
}

function formatFeedDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function plainCaption(post: InstagramFeedPost): string {
    const raw = (post.body || post.excerpt || '').trim();
    if (!raw) return '';
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
    const caption = plainCaption(post);
    const showHref = route('mobile.news.show', post.slug);
    const isDetail = variant === 'detail';

    return (
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 px-4 py-3">
                <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-[11px] font-bold text-white shadow-sm"
                    aria-hidden
                >
                    IG
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{post.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatFeedDate(post.published_at)}</p>
                </div>
            </div>

            <FeedMedia post={post} appUrl={appUrl} variant={variant} showHref={showHref} />

            {(caption || !isDetail) && (
                <div className="px-4 py-3">
                    {caption ? (
                        <p
                            className={`text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 ${
                                isDetail ? 'whitespace-pre-wrap break-words' : 'line-clamp-4'
                            }`}
                        >
                            {!isDetail && (
                                <Link href={showHref} className="mr-1 font-semibold hover:underline">
                                    {post.title}
                                </Link>
                            )}
                            {isDetail ? caption : ` ${caption}`}
                        </p>
                    ) : !isDetail ? (
                        <Link href={showHref} className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                            Ver publicação
                        </Link>
                    ) : null}
                </div>
            )}
        </article>
    );
}
