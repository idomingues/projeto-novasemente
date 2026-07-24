import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import PublicationFeedCard, {
    type PublicationFeedItem,
} from '@/Components/Mobile/PublicationFeedCard';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, usePage } from '@inertiajs/react';
import { CameraIcon } from '@heroicons/react/24/outline';

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

type PageProps = {
    appUrl?: string;
};

function albumToFeedItem(album: AlbumRow): PublicationFeedItem {
    const photographer = album.photographer_name?.trim() || '';

    return {
        id: `mission-photos-${album.id}`,
        type: 'photos',
        type_label: 'Fotos',
        type_description: 'Álbum de fotos publicados pela equipe da Missão.',
        action_label: 'Ver álbum',
        title: album.title?.trim() || 'Álbum de fotos',
        excerpt: 'Confira as fotos deste momento da missão.',
        image_url: album.cover_image_url || album.auto_cover_url,
        published_at: album.published_at,
        photographer_name: photographer || null,
        href: route('mobile.mission.wall.show', album.id),
        meta: photographer ? ['Álbum de fotos', `Fotógrafo: ${photographer}`] : ['Álbum de fotos'],
    };
}

export default function MissionWall({ albums }: Props) {
    const pageProps = usePage().props as PageProps;
    const appUrl = (pageProps.appUrl ?? '') as string;
    const feedItems = albums.map(albumToFeedItem);

    return (
        <MobileLayout>
            <Head title="Mural da Missão" />

            <div className="mx-auto w-full max-w-lg space-y-5 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                <div>
                    <MissionHubBackLink />
                    <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-white">Mural</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Álbuns de fotos publicados pela equipe da Missão.
                    </p>
                </div>

                {feedItems.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <CameraIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600 dark:text-zinc-400">Nenhum álbum publicado</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-500">
                            Quando houver fotos no mural, os álbuns aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {feedItems.map((item) => (
                            <PublicationFeedCard
                                key={item.id}
                                item={item}
                                appUrl={appUrl}
                                expanded={false}
                                onToggle={() => undefined}
                                showTypeTag={false}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
