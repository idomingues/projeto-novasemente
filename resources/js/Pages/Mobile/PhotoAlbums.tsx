import PublicationFeedCard, {
    type PublicationFeedItem,
} from '@/Components/Mobile/PublicationFeedCard';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, usePage } from '@inertiajs/react';
import { CameraIcon } from '@heroicons/react/24/outline';

interface AlbumRow {
    id: number;
    title: string;
    photographer_name?: string | null;
    published_at: string | null;
    cover_image_url: string | null;
    auto_cover_url: string | null;
    drive_view_url?: string | null;
}

interface Props {
    albums: AlbumRow[];
}

type PageProps = {
    appUrl?: string;
};

function albumToFeedItem(album: AlbumRow): PublicationFeedItem {
    const photographer = album.photographer_name?.trim() || '';

    return {
        id: `photos-${album.id}`,
        type: 'photos',
        type_label: 'Fotos',
        type_description: 'Álbum de fotos de eventos e momentos da igreja.',
        action_label: 'Ver álbum',
        title: album.title?.trim() || 'Álbum de fotos',
        excerpt: 'Confira as fotos deste momento da igreja.',
        image_url: album.cover_image_url || album.auto_cover_url,
        published_at: album.published_at,
        photographer_name: photographer || null,
        href: route('mobile.fotos.show', album.id),
        meta: photographer ? ['Álbum de fotos', `Fotógrafo: ${photographer}`] : ['Álbum de fotos'],
    };
}

export default function MobilePhotoAlbums({ albums }: Props) {
    const pageProps = usePage().props as PageProps;
    const appUrl = (pageProps.appUrl ?? '') as string;
    const feedItems = albums.map(albumToFeedItem);

    return (
        <MobileLayout>
            <Head title="Fotos" />

            <div className="mx-auto w-full max-w-lg space-y-5 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                {feedItems.length === 0 ? (
                    <div className="py-12 text-center lg:py-20">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <CameraIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhum álbum publicado</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-500">
                            Quando houver álbuns, eles aparecerão aqui.
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
                            />
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
