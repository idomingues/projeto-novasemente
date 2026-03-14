import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { PlayCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface Props {
    playlistsUrl: string;
}

export default function MobileAcervo({ playlistsUrl }: Props) {
    return (
        <MobileLayout>
            <Head title="Acervo" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Acervo</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Playlists do YouTube da Nova Semente.
                    </p>
                </div>
                <a
                    href={playlistsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 active:scale-[0.99] transition-transform"
                >
                    <div className="w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <PlayCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="font-semibold text-zinc-900 dark:text-white block">
                            Ver playlists no YouTube
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            Acesse o canal ADV Nova Semente
                        </span>
                    </div>
                    <ArrowTopRightOnSquareIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                </a>
            </div>
        </MobileLayout>
    );
}
