import type { ReactNode, SyntheticEvent } from 'react';
import { Link } from '@inertiajs/react';
import CoverWithVideoLink from '@/Components/News/CoverWithVideoLink';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';

interface Props {
    imageSrc: string;
    /** Link externo (ex.: Instagram em eventos). Mantém capa clicável com play. */
    instagramVideoUrl?: string | null;
    /** Página de detalhe na app. */
    detailHref?: string;
    aspectClass?: string;
    wrapperClassName?: string;
    imageClassName?: string;
    imageLoading?: 'lazy' | 'eager';
    /** Mostra o ícone de play (notícias: só quando marcado «Tem vídeo»). */
    showPlayOverlay?: boolean;
    /** Alias legado usado em eventos / YouTube. */
    showYoutubePlayOverlay?: boolean;
    onImageError?: (e: SyntheticEvent<HTMLImageElement>) => void;
    imageFallback?: ReactNode;
    overlaySlot?: ReactNode;
    compactPlay?: boolean;
}

/**
 * Capa de notícia/evento unificada (grade, feed e detalhe).
 */
export default function NewsPostCover({
    imageSrc,
    instagramVideoUrl,
    detailHref,
    aspectClass = 'aspect-[16/10]',
    wrapperClassName = '',
    imageClassName = 'h-full w-full object-cover object-top',
    imageLoading = 'lazy',
    showPlayOverlay = false,
    showYoutubePlayOverlay = false,
    onImageError,
    imageFallback,
    overlaySlot,
    compactPlay = false,
}: Props) {
    const videoUrl = instagramVideoUrl?.trim() || '';
    const hasExternalVideo = Boolean(videoUrl);
    const playOverlay = showPlayOverlay || showYoutubePlayOverlay;

    const frame = (
        <div
            className={`group relative overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${aspectClass} ${wrapperClassName}`}
        >
            <img
                src={imageSrc}
                alt=""
                className={imageClassName}
                loading={imageLoading}
                decoding="async"
                onError={onImageError}
            />
            {imageFallback}
            {!hasExternalVideo && playOverlay ? <VideoPlayOverlay compact={compactPlay} /> : null}
            {overlaySlot}
        </div>
    );

    if (hasExternalVideo) {
        return (
            <CoverWithVideoLink videoHref={videoUrl} compactPlay={compactPlay} className="block w-full">
                {frame}
            </CoverWithVideoLink>
        );
    }

    if (detailHref) {
        return (
            <Link
                href={detailHref}
                className="group relative block w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
            >
                {frame}
            </Link>
        );
    }

    return frame;
}
