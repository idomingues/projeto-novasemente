import { Combobox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useState, useMemo } from 'react';

export interface SearchableOption {
    id: number | string;
    name: string;
}

interface SearchableSelectProps {
    label: string;
    value: number | string | '';
    onChange: (value: number | string | '') => void;
    options: SearchableOption[];
    placeholder?: string;
    emptyOption?: string;
    error?: string;
    id?: string;
}

export default function SearchableSelect({
    label,
    value,
    onChange,
    options,
    placeholder = 'Buscar...',
    emptyOption,
    error,
    id = 'searchable-select',
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        if (!query.trim()) return options;
        const q = query.toLowerCase().trim();
        return options.filter((o) => o.name.toLowerCase().includes(q));
    }, [options, query]);

    const selectedOption = options.find((o) => o.id === value);
    const getDisplayValue = (val: number | string | null) => {
        if (val === null || val === '') return emptyOption ?? '';
        return options.find((o) => o.id === val)?.name ?? '';
    };

    const optionsWithEmpty = emptyOption ? [{ id: '' as const, name: emptyOption }, ...options] : options;
    const filteredWithEmpty = useMemo(() => {
        if (!query.trim()) return optionsWithEmpty;
        const q = query.toLowerCase().trim();
        return optionsWithEmpty.filter((o) => o.name.toLowerCase().includes(q));
    }, [optionsWithEmpty, query]);

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {label}
            </label>
            <Combobox
                value={value === '' || value === null || value === undefined ? null : String(value)}
                onChange={(v) => onChange(v === null ? '' : (v as number | string))}
            >
                <div className="relative mt-1">
                    <Combobox.Input
                        id={id}
                        displayValue={(val: number | string | null) => getDisplayValue(val)}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={value === '' ? placeholder : undefined}
                        className="block w-full min-h-[2.75rem] h-11 py-2.5 pl-3 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm shadow-sm focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400">
                        <ChevronUpDownIcon className="w-5 h-5" />
                    </Combobox.Button>
                    <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1 shadow-lg">
                        {filteredWithEmpty.map((opt) => (
                            <Combobox.Option
                                key={String(opt.id)}
                                value={opt.id === '' ? null : opt.id}
                                className={({ active }) =>
                                    `relative cursor-pointer py-2.5 pl-3 pr-9 ${active ? 'bg-zinc-100 dark:bg-zinc-800' : ''} text-zinc-900 dark:text-white`
                                }
                            >
                                {opt.name}
                            </Combobox.Option>
                        ))}
                        {filteredWithEmpty.length === 0 && (
                            <div className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                Nenhum resultado.
                            </div>
                        )}
                    </Combobox.Options>
                </div>
            </Combobox>
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
