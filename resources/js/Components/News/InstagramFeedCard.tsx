import { Link } from '@inertiajs/react';

function imageSrc(url: string | null, appUrl: string): string {
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

export default function InstagramFeedCard({ post, appUrl, variant = 'feed' }: Props) {
    const thumb = post.cover_url || post.image_url;
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

            {thumb ? (
                isDetail ? (
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        <img
                            src={imageSrc(thumb, appUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="eager"
                            decoding="async"
                        />
                    </div>
                ) : (
                    <Link
                        href={showHref}
                        className="relative block aspect-[4/5] w-full overflow-hidden bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:bg-zinc-800"
                    >
                        <img
                            src={imageSrc(thumb, appUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    </Link>
                )
            ) : null}

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
