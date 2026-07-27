import { CheckCircleIcon } from '@heroicons/react/24/solid';
import type { PollResults } from './pollTypes';
import { percentLabel } from './pollTypes';

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
                    const width = option.percent > 0 ? Math.max(option.percent, 8) : 0;

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
                                        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                                            {percentLabel(option.percent)}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out dark:bg-emerald-500"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
