import { PlayIcon } from '@heroicons/react/24/solid';

interface Props {
    /** Miniatura (ex.: lista na home). */
    compact?: boolean;
    /** Variante com feedback de toque (ex.: capa do culto). */
    alwaysVisible?: boolean;
}

/** Overlay estilo YouTube: play sempre visível para indicar vídeo; hover/toque reforça o contraste. */
export default function VideoPlayOverlay({ compact = false, alwaysVisible = false }: Props) {
    return (
        <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center transition duration-200 ${
                alwaysVisible
                    ? 'bg-black/15 group-active:bg-black/40'
                    : 'bg-black/25 group-hover:bg-black/40 group-active:bg-black/40'
            }`}
            aria-hidden
        >
            <span
                className={`flex items-center justify-center rounded-full shadow-lg ring-2 ring-white/90 backdrop-blur-[2px] transition duration-200 group-hover:scale-105 group-active:scale-105 ${
                    alwaysVisible
                        ? 'bg-white/25 group-active:bg-black/75 group-active:ring-white/95'
                        : 'bg-black/65'
                } ${compact ? 'h-8 w-8' : 'h-14 w-14 sm:h-16 sm:w-16'}`}
            >
                <PlayIcon
                    className={`ml-0.5 text-white drop-shadow-sm ${
                        compact ? 'h-4 w-4' : 'h-7 w-7 sm:h-8 sm:w-8'
                    }`}
                />
            </span>
        </div>
    );
}
