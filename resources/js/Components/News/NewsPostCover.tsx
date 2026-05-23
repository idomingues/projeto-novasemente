import type { ReactNode, SyntheticEvent } from 'react';
import { Link } from '@inertiajs/react';
import CoverWithVideoLink from '@/Components/News/CoverWithVideoLink';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';

interface Props {
    imageSrc: string;
    /** Link externo do vídeo (Instagram). Capa clicável com overlay de play. */
    instagramVideoUrl?: string | null;
    /** Página de detalhe na app (quando não há link de vídeo externo). */
    detailHref?: string;
    aspectClass?: string;
    wrapperClassName?: string;
    imageClassName?: string;
    imageLoading?: 'lazy' | 'eager';
    showYoutubePlayOverlay?: boolean;
    onImageError?: (e: SyntheticEvent<HTMLImageElement>) => void;
    imageFallback?: ReactNode;
    overlaySlot?: ReactNode;
    compactPlay?: boolean;
}

/**
 * Capa de notícia unificada: link Instagram + ícone de play (grade, feed e detalhe).
 */
export default function NewsPostCover({
    imageSrc,
    instagramVideoUrl,
    detailHref,
    aspectClass = 'aspect-[16/10]',
    wrapperClassName = '',
    imageClassName = 'h-full w-full object-cover',
    imageLoading = 'lazy',
    showYoutubePlayOverlay = false,
    onImageError,
    imageFallback,
    overlaySlot,
    compactPlay = false,
}: Props) {
    const videoUrl = instagramVideoUrl?.trim() || '';
    const hasExternalVideo = Boolean(videoUrl);

    const frame = (
        <div
            className={`relative overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${aspectClass} ${wrapperClassName}`}
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
            {!hasExternalVideo && showYoutubePlayOverlay && <VideoPlayOverlay compact={compactPlay} />}
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
                className="group relative block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
            >
                {frame}
            </Link>
        );
    }

    return frame;
}
