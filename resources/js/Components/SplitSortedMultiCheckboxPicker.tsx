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
    showSearch = true,
    confirmChanges = false,
    renderTrailingAction,
}: SplitSortedMultiCheckboxPickerProps) {
    const [filter, setFilter] = useState('');

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

    const filteredOptions = useMemo(() => {
        const q = filter.trim();
        if (!q) {
            return options;
        }
        return options.filter((o) => textMatchesSearchFields(q, o.name, o.subline));
    }, [options, filter]);

    return (
        <div className={className}>
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-col">
                {showSearch ? (
                    <TextInput
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full"
                        placeholder="Buscar departamentos…"
                        aria-label="Buscar departamentos por nome"
                    />
                ) : null}
                <SortedMultiCheckboxList
                    className={showSearch ? 'mt-1.5 min-h-0 flex-1' : 'min-h-0 flex-1'}
                    options={filteredOptions}
                    selectedIds={selectedIds}
                    onChange={handleSelectionChange}
                    maxHeightClass={maxHeightClass}
                    hideSectionLabels
                    emptyMessage={
                        filter.trim() ? 'Nenhum resultado para esta busca.' : 'Nenhum departamento disponível.'
                    }
                    showSelectedCount
                    renderTrailingAction={renderTrailingAction}
                />
            </div>
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}
