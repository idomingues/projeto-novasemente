import { PhotoIcon } from '@heroicons/react/24/outline';

type Props = {
    className?: string;
};

export default function MissionArtComingSoon({ className = '' }: Props) {
    return (
        <div
            aria-label="Arte em produção"
            className={`rounded-2xl border border-dashed border-amber-300/50 bg-gradient-to-br from-amber-50/80 via-white to-teal-50/60 px-4 py-10 text-center dark:border-amber-500/20 dark:from-amber-950/20 dark:via-zinc-900 dark:to-teal-950/20 ${className}`}
        >
            <PhotoIcon className="mx-auto h-9 w-9 text-amber-600/70 dark:text-amber-400/70" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Arte em produção</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                A identidade visual desta missão será publicada em breve.
            </p>
        </div>
    );
}
