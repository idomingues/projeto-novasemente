import { PlayIcon } from '@heroicons/react/24/solid';

interface Props {
    /** Miniatura (ex.: lista na home). */
    compact?: boolean;
}

/** Overlay estilo YouTube: play visível no toque; no desktop aparece ao passar o rato. */
export default function VideoPlayOverlay({ compact = false }: Props) {
    return (
        <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-100 transition duration-200 md:bg-black/0 md:opacity-0 md:group-hover:bg-black/35 md:group-hover:opacity-100"
            aria-hidden
        >
            <span
                className={`flex items-center justify-center rounded-full bg-black/60 shadow-lg ring-2 ring-white/90 backdrop-blur-[2px] transition duration-200 group-hover:scale-105 ${
                    compact ? 'h-8 w-8' : 'h-14 w-14 sm:h-16 sm:w-16'
                }`}
            >
                <PlayIcon
                    className={`ml-0.5 text-white ${compact ? 'h-4 w-4' : 'h-7 w-7 sm:h-8 sm:w-8'}`}
                />
            </span>
        </div>
    );
}
