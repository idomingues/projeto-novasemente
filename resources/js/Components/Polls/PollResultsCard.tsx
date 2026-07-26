import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid';
import type { PollResults } from './pollTypes';
import { voteCountLabel } from './pollTypes';

type Props = {
    question: string;
    allowMultiple: boolean;
    results: PollResults;
    selectedOptionIds?: number[];
};

export default function PollResultsCard({
    question,
    allowMultiple,
    results,
    selectedOptionIds = [],
}: Props) {
    const selected = new Set(selectedOptionIds);

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{question}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {allowMultiple ? 'Selecione uma ou mais opções' : 'Selecione uma opção'}
            </p>

            <ul className="mt-4 space-y-4">
                {results.options.map((option) => {
                    const isSelected = selected.has(option.id);
                    const width = option.votes_count > 0 ? Math.max(option.percent, 8) : 0;
                    const voters = option.voters ?? [];

                    return (
                        <li key={option.id}>
                            <div className="flex items-start gap-2">
                                <span className="mt-0.5 shrink-0">
                                    {isSelected ? (
                                        <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <span className="block h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={`text-sm font-medium ${
                                                isSelected
                                                    ? 'text-emerald-800 dark:text-emerald-200'
                                                    : 'text-zinc-800 dark:text-zinc-100'
                                            }`}
                                        >
                                            {option.label}
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                                            {option.votes_count}
                                            {option.votes_count > 0 && (
                                                <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                                            )}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out dark:bg-emerald-500"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                            {voteCountLabel(option.votes_count)}
                                            {option.votes_count > 0 ? ` · ${option.percent}%` : ''}
                                        </p>
                                        {voters.length > 0 && (
                                            <div className="flex -space-x-1.5">
                                                {voters.slice(0, 6).map((voter, idx) =>
                                                    voter.photo_url ? (
                                                        <img
                                                            key={`${voter.user_id ?? 'a'}-${voter.voted_at ?? idx}`}
                                                            src={voter.photo_url}
                                                            alt=""
                                                            title={voter.name}
                                                            className="h-5 w-5 rounded-full border border-white object-cover dark:border-zinc-900"
                                                        />
                                                    ) : (
                                                        <span
                                                            key={`${voter.user_id ?? 'a'}-${voter.voted_at ?? idx}`}
                                                            title={voter.name}
                                                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-zinc-200 text-[9px] font-semibold text-zinc-600 dark:border-zinc-900 dark:bg-zinc-700 dark:text-zinc-200"
                                                        >
                                                            {voter.name.slice(0, 1).toUpperCase()}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {voters.length > 0 && (
                                        <ul className="mt-2 divide-y divide-zinc-100 rounded-xl bg-zinc-50 px-3 dark:divide-zinc-800 dark:bg-zinc-800/50">
                                            {voters.map((voter, idx) => (
                                                <li
                                                    key={`${option.id}-${voter.user_id ?? 'a'}-${voter.voted_at ?? idx}`}
                                                    className="flex items-center gap-2.5 py-2"
                                                >
                                                    {voter.photo_url ? (
                                                        <img
                                                            src={voter.photo_url}
                                                            alt=""
                                                            className="h-7 w-7 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                                                            {voter.name.slice(0, 1).toUpperCase()}
                                                        </span>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                                            {voter.name}
                                                        </p>
                                                        {voter.voted_at_label && (
                                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                                {voter.voted_at_label}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
