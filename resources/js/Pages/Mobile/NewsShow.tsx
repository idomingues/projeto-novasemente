import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, NewspaperIcon } from '@heroicons/react/24/outline';
import ImageDownloadButton from '@/Components/ImageDownloadButton';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

interface Post {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    image_url: string | null;
    published_at: string | null;
}

interface Props {
    post: Post;
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function MobileNewsShow({ post }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';

    return (
        <MobileLayout>
            <Head title={post.title} />
            <div className="space-y-4">
                <Link
                    href={route('mobile.news')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                    <ArrowLeftIcon className="w-4 h-4" aria-hidden />
                    Voltar às notícias
                </Link>

                <article className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    {post.image_url ? (
                        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                            <img
                                src={imageSrc(post.image_url, appUrl)}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="eager"
                                decoding="async"
                                onError={(e) => {
                                    const el = e.currentTarget;
                                    el.style.display = 'none';
                                    const next = el.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = 'flex';
                                }}
                            />
                            <div className="absolute inset-0 hidden items-center justify-center bg-zinc-200 dark:bg-zinc-700" style={{ display: 'none' }} aria-hidden>
                                <NewspaperIcon className="w-12 h-12 text-zinc-400" />
                            </div>
                            <ImageDownloadButton
                                src={imageSrc(post.image_url, appUrl)}
                                appUrl={appUrl}
                                filenameBase={`noticia-${post.slug}`}
                                className="absolute top-2 right-2 z-10"
                            />
                        </div>
                    ) : (
                        <div className="h-40 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                            <NewspaperIcon className="w-14 h-14 text-zinc-400 dark:text-zinc-500" />
                        </div>
                    )}

                    <div className="p-4 sm:p-6">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{formatDate(post.published_at)}</p>
                        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{post.title}</h1>
                        {post.excerpt && (
                            <p className="mt-3 text-zinc-600 dark:text-zinc-300 text-base leading-relaxed border-l-4 border-primary-500 pl-3">
                                {post.excerpt}
                            </p>
                        )}
                        <div
                            className="mt-5 text-zinc-700 dark:text-zinc-300 text-[15px] leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2"
                            dangerouslySetInnerHTML={{ __html: post.body }}
                        />
                    </div>
                </article>
            </div>
        </MobileLayout>
    );
}
