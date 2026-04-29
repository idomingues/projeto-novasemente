import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

interface MusicaShow {
    id: number;
    title: string;
    youtube_url: string;
    youtube_embed_url: string | null;
    published_at: string | null;
}

interface Props {
    musica: MusicaShow;
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function MobileMusicShow({ musica }: Props) {
    const hasEmbed = Boolean(musica.youtube_embed_url);

    return (
        <MobileLayout>
            <Head title={musica.title} />
            <div className="space-y-4">
                <Link
                    href={route('mobile.musica')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                    <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                    Voltar à música
                </Link>

                <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 p-4 dark:border-zinc-800 sm:p-6">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                YouTube
                            </span>
                            {musica.published_at ? (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(musica.published_at)}</p>
                            ) : null}
                        </div>
                        <h1 className="text-xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                            {musica.title}
                        </h1>
                    </div>

                    {hasEmbed ? (
                        <div className="overflow-hidden border-t border-zinc-200 bg-black dark:border-zinc-700">
                            <div className="aspect-video w-full">
                                <iframe
                                    title={musica.title}
                                    src={`${musica.youtube_embed_url}?rel=0`}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 border-t border-zinc-200 bg-zinc-50 px-6 py-10 dark:border-zinc-700 dark:bg-zinc-950/50">
                            <MusicalNoteIcon className="h-12 w-12 text-zinc-400" aria-hidden />
                            <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
                                Não foi possível incorporar este link. Abra o vídeo no YouTube.
                            </p>
                            <a
                                href={musica.youtube_url}
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
                                href={musica.youtube_url}
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
