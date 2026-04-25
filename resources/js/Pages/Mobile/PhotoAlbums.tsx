import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { CameraIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface AlbumRow {
    id: number;
    title: string;
    published_at: string | null;
    cover_image_url: string | null;
    auto_cover_url: string | null;
}

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

export default function MobilePhotoAlbums({ albums }: Props) {
    return (
        <MobileLayout>
            <Head title="Fotos" />

            <div className="space-y-6">
                {albums.length === 0 ? (
                    <div className="py-12 lg:py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <CameraIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum álbum publicado</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                            Quando houver álbuns, eles aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {albums.map((a) => {
                            const cover = a.cover_image_url || a.auto_cover_url;
                            return (
                                <li
                                    key={a.id}
                                    className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99] transition-all"
                                >
                                    <Link href={route('mobile.fotos.show', a.id)} className="block">
                                        {cover ? (
                                            <div className="relative aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                <span className="absolute bottom-2 left-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm inline-flex items-center gap-1.5">
                                                    <CalendarDaysIcon className="w-4 h-4" />
                                                    {formatPublishedLabel(a.published_at)}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="aspect-video bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                                                <CameraIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                                {formatBigDate(a.published_at)}
                                            </p>
                                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mt-1">
                                                {a.title || 'Culto'}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                {formatPublishedLabel(a.published_at)}
                                            </p>
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

