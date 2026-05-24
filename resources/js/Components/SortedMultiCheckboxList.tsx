import { useMemo, type ReactNode } from 'react';

export type SortedCheckboxOption = {
    id: number;
    name: string;
    disabled?: boolean;
    /** Texto à direita (ex.: Só consulta, Já encaminhado) */
    trailing?: string | null;
    /** Segunda linha abaixo do nome (ex.: e-mail) */
    subline?: string | null;
};

type SortedMultiCheckboxListProps = {
    options: SortedCheckboxOption[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    /** Conteúdo extra à direita da linha (ex.: botão ver ficha) */
    renderTrailingAction?: (option: SortedCheckboxOption, selected: boolean) => ReactNode;
    maxHeightClass?: string;
    emptyMessage?: string;
    className?: string;
    showSelectedCount?: boolean;
};

const DEFAULT_MAX_HEIGHT = 'max-h-40';

export default function SortedMultiCheckboxList({
    options,
    selectedIds,
    onChange,
    renderTrailingAction,
    maxHeightClass = DEFAULT_MAX_HEIGHT,
    emptyMessage = 'Nenhum resultado.',
    className,
    showSelectedCount = true,
}: SortedMultiCheckboxListProps) {
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const { selectedOptions, otherOptions } = useMemo(() => {
        const byName = (a: SortedCheckboxOption, b: SortedCheckboxOption) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        return {
            selectedOptions: options.filter((o) => selectedSet.has(o.id)).sort(byName),
            otherOptions: options.filter((o) => !selectedSet.has(o.id)).sort(byName),
        };
    }, [options, selectedSet]);

    const toggle = (id: number) => {
        const opt = options.find((o) => o.id === id);
        if (opt?.disabled) {
            return;
        }
        const set = new Set(selectedIds);
        if (set.has(id)) {
            set.delete(id);
        } else {
            set.add(id);
        }
        onChange(Array.from(set));
    };

    const renderRow = (o: SortedCheckboxOption, checked: boolean) => (
        <li key={o.id}>
            <div
                className={`flex items-start gap-1 rounded-lg px-2 py-1.5 ${
                    checked
                        ? 'bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40'
                        : 'hover:bg-white dark:hover:bg-zinc-800'
                }`}
            >
                <label
                    className={`flex min-w-0 flex-1 items-start gap-2 ${
                        o.disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                    }`}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        disabled={o.disabled}
                        onChange={() => toggle(o.id)}
                        className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600"
                    />
                    <span className="min-w-0 text-sm">
                        <span className="font-medium text-zinc-900 dark:text-white">{o.name}</span>
                        {o.subline ? (
                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{o.subline}</span>
                        ) : null}
                    </span>
                </label>
                {o.trailing ? (
                    <span className="mt-0.5 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{o.trailing}</span>
                ) : null}
                {renderTrailingAction?.(o, checked)}
            </div>
        </li>
    );

    return (
        <div className={className}>
            <div
                className={`overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-700 dark:bg-zinc-800/40 ${maxHeightClass}`}
            >
                {selectedOptions.length === 0 && otherOptions.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
                ) : (
                    <ul className="space-y-1">
                        {selectedOptions.length > 0 ? (
                            <>
                                <li className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                    Selecionados
                                </li>
                                {selectedOptions.map((o) => renderRow(o, true))}
                            </>
                        ) : null}
                        {selectedOptions.length > 0 && otherOptions.length > 0 ? (
                            <li className="my-1 border-t border-zinc-200 dark:border-zinc-600" aria-hidden />
                        ) : null}
                        {otherOptions.length > 0 ? (
                            <>
                                {selectedOptions.length > 0 ? (
                                    <li className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        Outros
                                    </li>
                                ) : null}
                                {otherOptions.map((o) => renderRow(o, false))}
                            </>
                        ) : null}
                    </ul>
                )}
            </div>
            {showSelectedCount ? (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'}
                </p>
            ) : null}
        </div>
    );
}
