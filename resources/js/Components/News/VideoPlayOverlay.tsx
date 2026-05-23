import { PlayIcon } from '@heroicons/react/24/solid';

/** Overlay estilo YouTube: play visível no toque; no desktop aparece ao passar o rato. */
export default function VideoPlayOverlay() {
    return (
        <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-100 transition duration-200 md:bg-black/0 md:opacity-0 md:group-hover:bg-black/35 md:group-hover:opacity-100"
            aria-hidden
        >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 shadow-lg ring-2 ring-white/90 backdrop-blur-[2px] transition duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
                <PlayIcon className="ml-0.5 h-7 w-7 text-white sm:h-8 sm:w-8" />
            </span>
        </div>
    );
}
