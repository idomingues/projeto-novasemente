import { useCallback, useMemo, useState, type ReactNode } from 'react';
import SortedMultiCheckboxList, { type SortedCheckboxOption } from '@/Components/SortedMultiCheckboxList';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { textMatchesSearchFields } from '@/utils/searchText';
import { confirmAction } from '@/utils/confirmDialog';

type SplitSortedMultiCheckboxPickerProps = {
    options: SortedCheckboxOption[];
    selectedIds: number[];
    onChange: (ids: number[]) => void | Promise<void>;
    maxHeightClass?: string;
    error?: string;
    className?: string;
    availableLabel?: string;
    selectedLabel?: string;
    showSearch?: boolean;
    /** Pergunta ao marcar/desmarcar (como na tela de departamentos); só aplica ao salvar o formulário */
    confirmChanges?: boolean;
    renderTrailingAction?: (option: SortedCheckboxOption, selected: boolean) => ReactNode;
};

const DEFAULT_PANE_MAX_HEIGHT = 'max-h-[min(52vh,460px)]';

export default function SplitSortedMultiCheckboxPicker({
    options,
    selectedIds,
    onChange,
    maxHeightClass = DEFAULT_PANE_MAX_HEIGHT,
    error,
    className,
    availableLabel = 'Disponíveis',
    selectedLabel = 'Selecionados',
    showSearch = true,
    confirmChanges = false,
    renderTrailingAction,
}: SplitSortedMultiCheckboxPickerProps) {
    const [availableFilter, setAvailableFilter] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('');

    const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

    const confirmSelectionChange = useCallback(
        async (action: 'add' | 'remove', ids: number[]): Promise<boolean> => {
            if (ids.length === 0) {
                return true;
            }

            const isAdd = action === 'add';

            if (ids.length === 1) {
                const item = optionById.get(ids[0]);
                const name = item?.name?.trim() || 'este departamento';
                return confirmAction({
                    title: isAdd ? 'Adicionar departamento?' : 'Remover departamento?',
                    text: isAdd
                        ? `Deseja adicionar o departamento «${name}» a este voluntário? A alteração só será aplicada ao salvar.`
                        : `Deseja remover o departamento «${name}» deste voluntário? A alteração só será aplicada ao salvar.`,
                    confirmButtonText: isAdd ? 'Adicionar' : 'Remover',
                    cancelButtonText: 'Cancelar',
                    danger: !isAdd,
                    icon: isAdd ? 'question' : 'warning',
                });
            }

            return confirmAction({
                title: isAdd ? 'Adicionar departamentos?' : 'Remover departamentos?',
                text: `Deseja ${isAdd ? 'adicionar' : 'remover'} ${ids.length} departamentos ${
                    isAdd ? 'a este voluntário' : 'deste voluntário'
                }? A alteração só será aplicada ao salvar.`,
                confirmButtonText: isAdd ? 'Adicionar' : 'Remover',
                cancelButtonText: 'Cancelar',
                danger: !isAdd,
                icon: isAdd ? 'question' : 'warning',
            });
        },
        [optionById],
    );

    const handleSelectionChange = useCallback(
        async (nextIds: number[]) => {
            if (!confirmChanges) {
                void onChange(nextIds);
                return;
            }

            const nextSet = new Set(nextIds);
            const removed = selectedIds.filter((id) => !nextSet.has(id));
            const added = nextIds.filter((id) => !selectedIds.includes(id));

            if (removed.length === 0 && added.length === 0) {
                void onChange(nextIds);
                return;
            }

            if (removed.length > 0) {
                const okRemove = await confirmSelectionChange('remove', removed);
                if (!okRemove) {
                    return;
                }
            }

            if (added.length > 0) {
                const okAdd = await confirmSelectionChange('add', added);
                if (!okAdd) {
                    return;
                }
            }

            void onChange(nextIds);
        },
        [confirmChanges, confirmSelectionChange, onChange, selectedIds],
    );

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const selectedListOptions = useMemo(() => {
        const q = selectedFilter.trim();
        return options
            .filter((o) => selectedSet.has(o.id))
            .filter((o) => !q || textMatchesSearchFields(q, o.name, o.subline));
    }, [options, selectedSet, selectedFilter]);

    const otherListOptions = useMemo(() => {
        const q = availableFilter.trim();
        return options
            .filter((o) => !selectedSet.has(o.id))
            .filter((o) => !q || textMatchesSearchFields(q, o.name, o.subline));
    }, [options, selectedSet, availableFilter]);

    return (
        <div className={className}>
            <div className="mx-auto grid min-h-0 w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-h-0 min-w-0 flex-col">
                    <p className="shrink-0 px-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {availableLabel}
                        <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                            ({otherListOptions.length})
                        </span>
                    </p>
                    {showSearch ? (
                        <TextInput
                            value={availableFilter}
                            onChange={(e) => setAvailableFilter(e.target.value)}
                            className="mt-1.5 block w-full"
                            placeholder="Buscar disponíveis…"
                            aria-label="Buscar disponíveis por nome"
                        />
                    ) : null}
                    <SortedMultiCheckboxList
                        className="mt-1.5 min-h-0 flex-1"
                        options={otherListOptions}
                        selectedIds={selectedIds}
                        onChange={handleSelectionChange}
                        maxHeightClass={maxHeightClass}
                        hideSectionLabels
                        emptyMessage={
                            availableFilter.trim()
                                ? 'Nenhum resultado para esta busca.'
                                : 'Todos já foram selecionados.'
                        }
                        showSelectedCount={false}
                        renderTrailingAction={renderTrailingAction}
                    />
                </div>

                <div className="flex min-h-0 min-w-0 flex-col sm:border-l sm:border-zinc-200 sm:pl-4 dark:sm:border-zinc-700">
                    <p className="shrink-0 px-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        {selectedLabel}
                        <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                            ({selectedListOptions.length}
                            {selectedFilter.trim() && selectedListOptions.length !== selectedIds.length
                                ? ` de ${selectedIds.length}`
                                : ''}
                            )
                        </span>
                    </p>
                    {showSearch ? (
                        <TextInput
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="mt-1.5 block w-full"
                            placeholder="Buscar selecionados…"
                            aria-label="Buscar selecionados por nome"
                        />
                    ) : null}
                    <SortedMultiCheckboxList
                        className="mt-1.5 min-h-0 flex-1"
                        options={selectedListOptions}
                        selectedIds={selectedIds}
                        onChange={handleSelectionChange}
                        maxHeightClass={maxHeightClass}
                        hideSectionLabels
                        emptyMessage={
                            selectedFilter.trim()
                                ? 'Nenhum selecionado corresponde a esta busca.'
                                : 'Nenhum selecionado.'
                        }
                        showSelectedCount={false}
                        renderTrailingAction={renderTrailingAction}
                    />
                </div>
            </div>
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}
