import MobileLayout from '@/Layouts/MobileLayout';
import NewsPostCover from '@/Components/News/NewsPostCover';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, NewspaperIcon } from '@heroicons/react/24/outline';

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    section: string;
    section_label: string;
    author_name: string | null;
    source_url: string;
    image_url: string | null;
    cover_url: string | null;
    published_at: string | null;
}

interface Props {
    article: Article;
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

function bodyLooksLikeHtml(body: string): boolean {
    const t = body.trim();
    if (!t) return false;
    return /<\/?[a-z][a-z0-9]*\b/i.test(t);
}

export default function MobileRevistaAdventistaShow({ article }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const cover = article.cover_url || article.image_url;

    return (
        <MobileLayout>
            <Head title={article.title} />
            <div className="mx-auto w-full min-w-0 max-w-lg space-y-3">
                <Link
                    href={route('mobile.revista-adventista', article.section ? { section: article.section } : {})}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                    <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Voltar à Revista Adventista
                </Link>

                <article className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {cover ? (
                        <NewsPostCover
                            imageSrc={imageSrc(cover, appUrl)}
                            imageLoading="eager"
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
                        />
                    ) : (
                        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-sky-100 to-teal-50 dark:from-sky-950/30 dark:to-teal-950/20">
                            <NewspaperIcon className="h-14 w-14 text-teal-500/70 dark:text-teal-400/60" />
                        </div>
                    )}

                    <div className="min-w-0 p-4 sm:p-5">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                                {article.section_label}
                            </span>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(article.published_at)}</p>
                        </div>

                        <h1 className="text-xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                            {article.title}
                        </h1>

                        {article.author_name && (
                            <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">{article.author_name}</p>
                        )}

                        {article.excerpt && (
                            <p className="mt-3 border-l-4 border-teal-500 pl-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {article.excerpt}
                            </p>
                        )}

                        {article.body?.trim() ? (
                            bodyLooksLikeHtml(article.body) ? (
                                <div
                                    className="mt-5 max-w-full break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 [&_*]:max-w-full [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_img]:h-auto [&_img]:max-w-full [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: article.body }}
                                />
                            ) : (
                                <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                    {article.body}
                                </div>
                            )
                        ) : null}

                        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                            <a
                                href={article.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                            >
                                <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
                                Ler no site da Revista Adventista
                            </a>
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Conteúdo © Casa Publicadora Brasileira / Revista Adventista
                            </p>
                        </div>
                    </div>
                </article>
            </div>
        </MobileLayout>
    );
}
