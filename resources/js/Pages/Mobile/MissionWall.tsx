import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowTopRightOnSquareIcon, CalendarDaysIcon, CameraIcon } from '@heroicons/react/24/outline';

type AlbumRow = {
    id: number;
    title: string;
    photographer_name?: string | null;
    published_at: string | null;
    cover_image_url: string | null;
    auto_cover_url: string | null;
    drive_view_url?: string | null;
};

interface Props {
    albums: AlbumRow[];
}

function formatPublishedLabel(iso: string | null): string {
    if (!iso) {
        return 'Sem data';
    }
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatBigDate(iso: string | null): string {
    if (!iso) {
        return 'Sem data';
    }
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
    });
}

export default function MissionWall({ albums }: Props) {
    return (
        <MobileLayout>
            <Head title="Mural da Missão" />

            <div className="space-y-6">
                <div>
                    <MissionHubBackLink />
                    <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-white">Mural</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Álbuns de fotos publicados pela equipe da Missão.</p>
                </div>

                {albums.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <CameraIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600 dark:text-zinc-400">Nenhum álbum publicado</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-500">
                            Quando houver fotos no mural, os álbuns aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {albums.map((a) => {
                            const cover = a.cover_image_url || a.auto_cover_url;
                            return (
                                <li
                                    key={a.id}
                                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                                >
                                    <Link href={route('mobile.mission.wall.show', a.id)} className="block">
                                        {cover ? (
                                            <div className="relative aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                                                <span className="absolute bottom-2 left-3 inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                                    <CalendarDaysIcon className="h-4 w-4" />
                                                    {formatPublishedLabel(a.published_at)}
                                                </span>
                                                {a.drive_view_url ? (
                                                    <a
                                                        href={a.drive_view_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/70"
                                                        title="Abrir no Drive"
                                                        aria-label="Abrir no Drive"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ArrowTopRightOnSquareIcon className="h-5 w-5" aria-hidden />
                                                    </a>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800">
                                                <CameraIcon className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                                {formatBigDate(a.published_at)}
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{a.title}</p>
                                            {a.photographer_name ? (
                                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{a.photographer_name}</p>
                                            ) : null}
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
