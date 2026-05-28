import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { PlayCircleIcon, Bars3Icon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface PlaylistItem {
    id: string;
    title: string;
    thumbnail: string | null;
    url: string;
    videoCount: number;
}

interface Props {
    playlists: PlaylistItem[];
    playlistsUrl: string;
}

export default function MobileAcervo({ playlists, playlistsUrl }: Props) {
    return (
        <MobileLayout>
            <Head title="Séries" />
            <div className="space-y-6">
                <div>
                    <Link href={route('mobile.more')} className="text-sm text-zinc-500 underline dark:text-zinc-400">
                        ← Mais
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Séries</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Veja todas as séries já passadas na Nova Semente.
                    </p>
                </div>

                {playlists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {playlists.map((pl) => (
                            <a
                                key={pl.id}
                                href={pl.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${pl.title} (abre em nova aba)`}
                                className="group block rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden active:scale-[0.98] transition-transform"
                            >
                                <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
                                    {pl.thumbnail ? (
                                        <img
                                            src={pl.thumbnail}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <PlayCircleIcon className="w-10 h-10 text-zinc-400" />
                                        </div>
                                    )}
                                    {pl.videoCount > 0 && (
                                        <div className="absolute bottom-0 right-0 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-[10px] font-medium rounded-tl-lg">
                                            <Bars3Icon className="w-3 h-3" />
                                            {pl.videoCount} {pl.videoCount === 1 ? 'vídeo' : 'vídeos'}
                                        </div>
                                    )}
                                </div>
                                <div className="p-2">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white text-xs line-clamp-2">
                                        {pl.title}
                                    </h2>
                                    <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Ver playlist
                                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[400px]">
                            <iframe
                                src={playlistsUrl}
                                title="Playlists do canal ADV Nova Semente"
                                className="w-full h-[60vh] min-h-[400px] border-0"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                allowFullScreen
                            />
                        </div>
                        <a
                            href={playlistsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir no YouTube (nova aba)"
                            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                        >
                            Abrir no YouTube
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
