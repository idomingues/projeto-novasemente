import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { PlayCircleIcon, Bars3Icon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface PlaylistItem {
    id: string;
    title: string;
    thumbnail: string | null;
    url: string;
    videoCount: number;
}

interface Props {
    playlistsUrl: string;
    playlists: PlaylistItem[];
}

export default function VariosAcervo({ playlistsUrl, playlists }: Props) {
    return (
        <AdminLayout>
            <Head title="Séries" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Séries</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Playlists do YouTube da Nova Semente.
                    </p>
                </div>

                {playlists.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {playlists.map((pl) => (
                            <a
                                key={pl.id}
                                href={pl.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${pl.title} (abre em nova aba)`}
                                className="group block rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
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
                                            <PlayCircleIcon className="w-12 h-12 text-zinc-400" />
                                        </div>
                                    )}
                                    {pl.videoCount > 0 && (
                                        <div className="absolute bottom-0 right-0 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-tl-lg">
                                            <Bars3Icon className="w-3.5 h-3.5" />
                                            {pl.videoCount} {pl.videoCount === 1 ? 'vídeo' : 'vídeos'}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white text-sm line-clamp-2 group-hover:underline">
                                        {pl.title}
                                    </h2>
                                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Ver playlist completa
                                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[500px]">
                            <iframe
                                src={playlistsUrl}
                                title="Playlists do canal ADV Nova Semente"
                                className="w-full h-[70vh] min-h-[500px] border-0"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                allowFullScreen
                            />
                        </div>
                        <a
                            href={playlistsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir playlists no YouTube (nova aba)"
                            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Abrir no YouTube
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
