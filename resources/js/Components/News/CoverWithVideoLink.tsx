import type { ReactNode } from 'react';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';

interface Props {
    videoHref: string;
    className?: string;
    ariaLabel?: string;
    compactPlay?: boolean;
    children: ReactNode;
}

/** Envolve a capa/imagem: hover com ícone de play e abre o link do vídeo (ex.: Instagram). */
export default function CoverWithVideoLink({
    videoHref,
    className = '',
    ariaLabel = 'Ver vídeo',
    compactPlay = false,
    children,
}: Props) {
    return (
        <a
            href={videoHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ariaLabel}
            className={`group relative block cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${className}`}
        >
            {children}
            <VideoPlayOverlay compact={compactPlay} />
        </a>
    );
}
