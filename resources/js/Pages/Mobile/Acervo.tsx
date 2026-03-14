import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { FilmIcon, PlayCircleIcon } from '@heroicons/react/24/outline';

interface CultoItem {
    id: number;
    title: string;
    youtube_url: string;
    youtube_embed_url: string | null;
    youtube_thumb_url: string | null;
    published_at: string | null;
}

interface Props {
    cultos: CultoItem[];
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function MobileAcervo({ cultos }: Props) {
    return (
        <MobileLayout>
            <Head title="Acervo" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Acervo</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Sermões da Nova Semente.
                    </p>
                </div>

                {cultos.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <FilmIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum sermão publicado</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">Os vídeos aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="space-y-5">
                        {cultos.map((c) => (
                            <li
                                key={c.id}
                                className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-[0.99] transition-transform"
                            >
                                <a
                                    href={c.youtube_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    {c.youtube_thumb_url ? (
                                        <div className="relative aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                            <img
                                                src={c.youtube_thumb_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <PlayCircleIcon className="w-16 h-16 text-white drop-shadow-lg" />
                                            </div>
                                            <span className="absolute bottom-2 left-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                                                {formatDate(c.published_at)}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                                            <FilmIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <h2 className="font-semibold text-zinc-900 dark:text-white text-lg leading-snug line-clamp-2">
                                            {c.title}
                                        </h2>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                                            {formatDate(c.published_at)}
                                        </p>
                                    </div>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
