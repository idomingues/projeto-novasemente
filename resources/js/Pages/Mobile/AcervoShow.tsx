import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, PlayCircleIcon } from '@heroicons/react/24/outline';

interface AcervoShowItem {
    id: number;
    title: string;
    url: string;
    embed_url: string | null;
    videoCount: number | null;
}

interface Props {
    item: AcervoShowItem;
}

function withAutoPlay(embedUrl: string): string {
    const hasQuery = embedUrl.includes('?');
    const q = 'autoplay=1&mute=1&playsinline=1&rel=0';
    return `${embedUrl}${hasQuery ? '&' : '?'}${q}`;
}

export default function MobileAcervoShow({ item }: Props) {
    const hasEmbed = Boolean(item.embed_url);

    return (
        <MobileLayout>
            <Head title={item.title} />
            <div className="space-y-4">
                <Link
                    href={route('mobile.acervo')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                    <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                    Voltar às séries
                </Link>

                <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 p-4 dark:border-zinc-800 sm:p-6">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                YouTube
                            </span>
                            {item.videoCount != null ? (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {item.videoCount} {item.videoCount === 1 ? 'vídeo' : 'vídeos'}
                                </p>
                            ) : null}
                        </div>
                        <h1 className="text-xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                            {item.title}
                        </h1>
                    </div>

                    {hasEmbed ? (
                        <div className="overflow-hidden border-t border-zinc-200 bg-black dark:border-zinc-700">
                            <div className="aspect-video w-full">
                                <iframe
                                    title={item.title}
                                    src={withAutoPlay(item.embed_url as string)}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 border-t border-zinc-200 bg-zinc-50 px-6 py-10 dark:border-zinc-700 dark:bg-zinc-950/50">
                            <PlayCircleIcon className="h-12 w-12 text-zinc-400" aria-hidden />
                            <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
                                Não foi possível incorporar este link. Abra no YouTube.
                            </p>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                Abrir no YouTube
                            </a>
                        </div>
                    )}

                    {hasEmbed ? (
                        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                                Abrir no YouTube (app ou navegador)
                            </a>
                        </div>
                    ) : null}
                </article>
            </div>
        </MobileLayout>
    );
}

