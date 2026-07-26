import { PlayIcon } from '@heroicons/react/24/solid';

interface Props {
    /** Miniatura (ex.: lista na home). */
    compact?: boolean;
    /** Sempre visível (útil em listas mobile sem hover). */
    alwaysVisible?: boolean;
}

/** Overlay estilo YouTube: play visível no toque; no desktop aparece ao passar o rato. */
export default function VideoPlayOverlay({ compact = false, alwaysVisible = false }: Props) {
    if (alwaysVisible) {
        return (
            <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 transition duration-200 group-active:bg-black/40"
                aria-hidden
            >
                <span
                    className={`flex items-center justify-center rounded-full bg-white/25 shadow-md ring-1 ring-white/50 backdrop-blur-[3px] transition duration-200 group-active:bg-black/75 group-active:shadow-lg group-active:ring-2 group-active:ring-white/95 ${
                        compact ? 'h-8 w-8' : 'h-11 w-11 sm:h-12 sm:w-12'
                    }`}
                >
                    <PlayIcon
                        className={`ml-0.5 text-white/90 drop-shadow-sm transition duration-200 group-active:text-white ${
                            compact ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6'
                        }`}
                    />
                </span>
            </div>
        );
    }

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
