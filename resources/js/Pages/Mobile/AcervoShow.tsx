import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface AcervoEpisode {
    video_id: string;
    title: string;
    thumbnail: string;
}

interface AcervoShowItem {
    id: number;
    title: string;
    url: string;
    embed_url: string | null;
    playlist_id: string | null;
    videoCount: number | null;
    episodes: AcervoEpisode[];
}

interface Props {
    item: AcervoShowItem;
}

function episodeEmbedUrl(videoId: string, playlistId: string | null): string {
    const base = `https://www.youtube.com/embed/${videoId}`;
    return playlistId ? `${base}?list=${playlistId}` : base;
}

function withAutoPlay(embedUrl: string): string {
    const hasQuery = embedUrl.includes('?');
    const q = 'autoplay=1&mute=1&playsinline=1&rel=0';
    return `${embedUrl}${hasQuery ? '&' : '?'}${q}`;
}

export default function MobileAcervoShow({ item }: Props) {
    const episodes = item.episodes ?? [];
    const [activeVideoId, setActiveVideoId] = useState<string | null>(
        episodes[0]?.video_id ?? null,
    );

    const activeEmbed =
        activeVideoId !== null
            ? episodeEmbedUrl(activeVideoId, item.playlist_id)
            : item.embed_url;
    const hasEmbed = Boolean(activeEmbed);
    const videoCount = item.videoCount ?? (episodes.length > 0 ? episodes.length : null);

    return (
        <MobileLayout>
            <Head title={item.title} />
            <div className="space-y-4">
                <Link
                    href={route('mobile.acervo')}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
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
                            {videoCount != null ? (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {videoCount} {videoCount === 1 ? 'vídeo' : 'vídeos'}
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
                                    key={activeEmbed}
                                    title={item.title}
                                    src={withAutoPlay(activeEmbed as string)}
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
                                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                Abrir no YouTube
                            </a>
                        </div>
                    )}

                    {episodes.length > 0 ? (
                        <div className="border-t border-zinc-100 dark:border-zinc-800">
                            <h2 className="px-4 pt-4 text-sm font-semibold text-zinc-900 dark:text-white sm:px-6">
                                Episódios
                            </h2>
                            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800" role="list">
                                {episodes.map((episode, index) => {
                                    const isActive = episode.video_id === activeVideoId;
                                    return (
                                        <li key={episode.video_id}>
                                            <button
                                                type="button"
                                                onClick={() => setActiveVideoId(episode.video_id)}
                                                aria-current={isActive ? 'true' : undefined}
                                                className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition sm:px-6 ${
                                                    isActive
                                                        ? 'bg-teal-50 dark:bg-teal-950/30'
                                                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                                                }`}
                                            >
                                                <span
                                                    className={`mt-0.5 w-6 shrink-0 text-center text-xs font-semibold tabular-nums ${
                                                        isActive
                                                            ? 'text-teal-700 dark:text-teal-300'
                                                            : 'text-zinc-400 dark:text-zinc-500'
                                                    }`}
                                                >
                                                    {index + 1}
                                                </span>
                                                <img
                                                    src={episode.thumbnail}
                                                    alt=""
                                                    className="h-14 w-24 shrink-0 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-800"
                                                    loading="lazy"
                                                />
                                                <span
                                                    className={`min-w-0 flex-1 text-sm font-medium leading-snug ${
                                                        isActive
                                                            ? 'text-teal-900 dark:text-teal-100'
                                                            : 'text-zinc-800 dark:text-zinc-200'
                                                    }`}
                                                >
                                                    {episode.title}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : null}

                    {hasEmbed ? (
                        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
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
