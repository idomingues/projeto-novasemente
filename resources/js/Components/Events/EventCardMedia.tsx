import CoverWithVideoLink from '@/Components/News/CoverWithVideoLink';
import NewsPostCover from '@/Components/News/NewsPostCover';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import {
    eventHasYoutubeVideo,
    eventInstagramVideoUrl,
    type MobileEventListItem,
} from '@/utils/mobileEventDisplay';

interface Props {
    ev: MobileEventListItem;
    onOpenDetail: () => void;
}

/** Capa do evento na lista: play + link Instagram ou abertura do modal (YouTube). */
export default function EventCardMedia({ ev, onOpenDetail }: Props) {
    if (!ev.image_url) {
        return null;
    }

    const instagramUrl = eventInstagramVideoUrl(ev);
    const hasYoutube = eventHasYoutubeVideo(ev);

    const downloadBtn = (
        <ImageDownloadButton
            src={ev.image_url}
            filenameBase={`evento-${ev.id}`}
            className="absolute bottom-2 right-2 z-10"
            stopPropagation
            size="sm"
        />
    );

    if (instagramUrl) {
        return (
            <div className="relative border-t border-zinc-100 dark:border-zinc-800">
                <CoverWithVideoLink
                    videoHref={instagramUrl}
                    className="block w-full rounded-none"
                    ariaLabel="Ver vídeo"
                >
                    <div className="relative aspect-[16/10] w-full sm:aspect-[2/1]">
                        <img
                            src={ev.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                        {downloadBtn}
                    </div>
                </CoverWithVideoLink>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onOpenDetail}
            className="relative w-full border-t border-zinc-100 text-left dark:border-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
        >
            <NewsPostCover
                imageSrc={ev.image_url}
                showYoutubePlayOverlay={hasYoutube}
                aspectClass="aspect-[16/10] w-full sm:aspect-[2/1]"
                overlaySlot={downloadBtn}
            />
        </button>
    );
}
