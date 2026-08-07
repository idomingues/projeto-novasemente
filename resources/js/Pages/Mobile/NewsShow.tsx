import MobileLayout from '@/Layouts/MobileLayout';
import InstagramFeedCard from '@/Components/News/InstagramFeedCard';
import InstagramViewLink from '@/Components/News/InstagramViewLink';
import PdfReflowReader from '@/Components/Mobile/PdfReflowReader';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, NewspaperIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import NewsPostCover from '@/Components/News/NewsPostCover';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

type ContentType = 'article' | 'youtube' | 'pdf' | 'image' | 'instagram_feed' | 'instagram_link';

interface Post {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    content_type: ContentType;
    youtube_url: string | null;
    youtube_embed_url: string | null;
    instagram_url: string | null;
    pdf_url: string | null;
    video_url?: string | null;
    has_video?: boolean;
    image_url: string | null;
    cover_url: string | null;
    published_at: string | null;
}

interface Props {
    post: Post;
    config?: {
        listRoute?: 'mobile.news' | 'mobile.health';
        listLabel?: string;
        showRoute?: 'mobile.news.show' | 'mobile.health.show';
    };
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function bodyLooksLikeHtml(body: string): boolean {
    const t = body.trim();
    if (!t) return false;
    return /<\/?[a-z][a-z0-9]*\b/i.test(t);
}

function typeLabel(t: ContentType): string {
    switch (t) {
        case 'youtube':
            return 'Vídeo';
        case 'pdf':
            return 'Documento';
        case 'image':
            return 'Imagem';
        case 'instagram_feed':
            return 'Notícia';
        case 'instagram_link':
            return 'Instagram';
        default:
            return 'Notícia';
    }
}

export default function MobileNewsShow({ post, config }: Props) {
    const resolvedConfig = config ?? {};
    const listRoute = resolvedConfig.listRoute ?? 'mobile.news';
    const listLabel = resolvedConfig.listLabel ?? 'notícias';
    const showRoute = resolvedConfig.showRoute ?? 'mobile.news.show';
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const cover = post.cover_url;
    const isYoutube = post.content_type === 'youtube';
    const isPdf = post.content_type === 'pdf';
    const isInstagramFeed = post.content_type === 'instagram_feed';
    const instagramUrl = post.instagram_url?.trim() || '';
    const pdfUrl = post.pdf_url ? imageSrc(post.pdf_url, appUrl) : '';

    if (isPdf && pdfUrl) {
        return (
            <MobileLayout>
                <Head title={post.title} />
                <div className="-mx-4 min-w-0 overflow-x-hidden sm:mx-0">
                    <div className="mb-3 px-4 sm:px-0">
                        <Link
                            href={route(listRoute)}
                            className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                        >
                            <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
                            {`Voltar às ${listLabel}`}
                        </Link>
                    </div>

                    <PdfReflowReader
                        title={post.title}
                        coverUrl={cover ? imageSrc(cover, appUrl) : null}
                        pdfUrl={pdfUrl}
                        contentKey={`${listRoute === 'mobile.health' ? 'health' : 'news'}:pdf:${post.id}`}
                        className="sm:px-0"
                    />
                </div>
            </MobileLayout>
        );
    }

    if (isInstagramFeed) {
        return (
            <MobileLayout>
                <Head title={post.title} />
                <div className="space-y-4">
                    <Link
                        href={route(listRoute)}
                        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                        {`Voltar às ${listLabel}`}
                    </Link>
                    <InstagramFeedCard post={post} appUrl={appUrl} variant="detail" showRoute={showRoute} />
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout>
            <Head title={post.title} />
            <div className="mx-auto w-full min-w-0 max-w-lg space-y-3">
                <Link
                    href={route(listRoute)}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                    <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
                    {`Voltar às ${listLabel}`}
                </Link>

                <article className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {cover ? (
                        <NewsPostCover
                            imageSrc={imageSrc(cover, appUrl)}
                            aspectClass=""
                            imageClassName="h-auto w-full object-contain object-top"
                            imageLoading="eager"
                            showPlayOverlay={false}
                            onImageError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = 'none';
                                const next = el.nextElementSibling as HTMLElement | null;
                                if (next) next.style.display = 'flex';
                            }}
                            imageFallback={
                                <div
                                    className="hidden min-h-40 w-full items-center justify-center bg-zinc-200 dark:bg-zinc-700"
                                    style={{ display: 'none' }}
                                    aria-hidden
                                >
                                    <NewspaperIcon className="h-12 w-12 text-zinc-400" />
                                </div>
                            }
                        />
                    ) : isPdf ? (
                        <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-rose-100 via-zinc-100 to-amber-50 dark:from-rose-950/40 dark:via-zinc-900 dark:to-amber-950/30">
                            <div className="flex flex-col items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                <DocumentTextIcon className="h-16 w-16 text-rose-600/80 dark:text-rose-400/80" />
                                <span className="text-sm font-medium">Documento PDF</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800">
                            <NewspaperIcon className="h-14 w-14 text-zinc-400 dark:text-zinc-500" />
                        </div>
                    )}

                    <div className="min-w-0 p-4 sm:p-5">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                {typeLabel(post.content_type)}
                            </span>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(post.published_at)}</p>
                        </div>
                        <h1 className="text-xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                            {post.title}
                        </h1>
                        {post.excerpt && (
                            <p className="mt-3 border-l-4 border-primary-500 pl-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {post.excerpt}
                            </p>
                        )}

                        {instagramUrl ? (
                            <div className="mt-4">
                                <InstagramViewLink href={instagramUrl} />
                            </div>
                        ) : null}

                        {isYoutube && post.youtube_embed_url && (
                            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-inner dark:border-zinc-700">
                                <div className="aspect-video w-full">
                                    <iframe
                                        title={post.title}
                                        src={`${post.youtube_embed_url}?rel=0`}
                                        className="h-full w-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        )}

                        {post.body?.trim() ? (
                            bodyLooksLikeHtml(post.body) ? (
                                <div
                                    className="mt-5 max-w-full break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 [&_*]:max-w-full [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_img]:h-auto [&_img]:max-w-full [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: post.body }}
                                />
                            ) : (
                                <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                    {post.body}
                                </div>
                            )
                        ) : null}
                    </div>
                </article>
            </div>
        </MobileLayout>
    );
}
