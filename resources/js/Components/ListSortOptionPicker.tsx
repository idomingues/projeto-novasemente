import { CheckIcon } from '@heroicons/react/24/solid';

export type ListSortOption = { value: string; label: string };

type Props = {
    options: readonly ListSortOption[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
};

export default function ListSortOptionPicker({ options, value, onChange, ariaLabel = 'Ordenação' }: Props) {
    return (
        <ul role="radiogroup" aria-label={ariaLabel} className="mt-4 space-y-2">
            {options.map((o) => {
                const selected = value === o.value;
                return (
                    <li key={o.value}>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(o.value)}
                            className={[
                                'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                                selected
                                    ? 'border-teal-500/80 bg-teal-50/90 text-teal-950 ring-1 ring-teal-500/30 dark:border-teal-500/50 dark:bg-teal-950/40 dark:text-teal-100'
                                    : 'border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50',
                            ].join(' ')}
                        >
                            <span className="min-w-0 flex-1">{o.label}</span>
                            {selected ? (
                                <CheckIcon className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                            ) : (
                                <span className="h-5 w-5 shrink-0" aria-hidden />
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
