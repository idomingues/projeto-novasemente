import type { PollResults } from './pollTypes';

type Props = {
    results: PollResults;
    compact?: boolean;
};

/** Barras + contagem compactas para cards de lista. */
export default function PollCardResults({ results, compact = true }: Props) {
    return (
        <ul className={compact ? 'mt-3 space-y-2' : 'mt-3 space-y-2.5'}>
            {results.options.map((option) => {
                const width = option.votes_count > 0 ? Math.max(option.percent, 8) : 0;

                return (
                    <li key={option.id}>
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                {option.label}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                                {option.votes_count}
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
