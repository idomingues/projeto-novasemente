import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { MagnifyingGlassIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import { textIncludesSearch } from '@/utils/searchText';
import {
    scheduleIconButtonClass,
    type ScheduleVolunteerOption,
    type VolunteerAddOptions,
} from '@/Components/Escalas/VolunteerAddPopover';

export type CoordinatorFace = {
    id: number;
    volunteerId: number;
    memberName: string;
    recurringSeries: boolean;
    saturdayNumber: number | null;
    scheduleDate: string | null;
};

interface PickerProps {
    scheduleVolunteers: ScheduleVolunteerOption[];
    canAssign: boolean;
    saturdayNumber?: number | null;
    month?: number | null;
    year?: number | null;
    variant: 'cta' | 'button';
    label: string;
    onPick: (volunteerId: number, options?: VolunteerAddOptions) => void;
}

function CoordinatorPicker({
    scheduleVolunteers,
    canAssign,
    saturdayNumber,
    month,
    year,
    variant,
    label,
    onPick,
}: PickerProps) {
    const [nameFilter, setNameFilter] = useState('');
    const [addRecurring, setAddRecurring] = useState(true);

    const filteredVolunteers = useMemo(() => {
        if (!nameFilter.trim()) return scheduleVolunteers;
        const q = nameFilter.trim();
        return scheduleVolunteers.filter((v) => textIncludesSearch(v.name, q));
    }, [scheduleVolunteers, nameFilter]);

    const pickVolunteer = (volunteerId: number, close: () => void) => {
        const options: VolunteerAddOptions =
            saturdayNumber != null && month != null && year != null
                ? {
                      recurring: addRecurring,
                      assignment_month: addRecurring ? undefined : month,
                      assignment_year: addRecurring ? undefined : year,
                  }
                : {};
        onPick(volunteerId, options);
        setNameFilter('');
        close();
    };

    if (!canAssign) {
        return null;
    }

    return (
        <Popover className={variant === 'cta' ? 'block w-full' : 'relative'}>
            <PopoverButton
                type="button"
                onClick={() => {
                    setNameFilter('');
                    setAddRecurring(true);
                }}
                className={
                    variant === 'cta'
                        ? 'flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-left shadow-sm ring-1 ring-zinc-200/80 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
                        : `${scheduleIconButtonClass} cursor-pointer !rounded-lg px-2.5 text-xs font-medium`
                }
                title={label}
            >
                {variant === 'cta' ? (
                    <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            <UserPlusIcon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-900 dark:text-white">
                                {label}
                            </span>
                            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                Escolha quem organiza os voluntários neste dia
                            </span>
                        </span>
                    </>
                ) : (
                    label
                )}
            </PopoverButton>
            <PopoverPanel
                anchor="bottom start"
                className="z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden dark:border-zinc-700 dark:bg-zinc-800"
            >
                {({ close }) => (
                    <>
                        {saturdayNumber != null && month != null && year != null && (
                            <div className="border-b border-zinc-100 p-2 dark:border-zinc-700">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={addRecurring}
                                        onChange={(e) => setAddRecurring(e.target.checked)}
                                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600"
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Incluir em todos os meses</span>
                                </label>
                                {!addRecurring && (
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Apenas para{' '}
                                        {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
                                            new Date(year, month - 1, 1),
                                        )}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="border-b border-zinc-100 p-2 dark:border-zinc-700">
                            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Escolha o coordenador</p>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    value={nameFilter}
                                    onChange={(e) => setNameFilter(e.target.value)}
                                    placeholder="Buscar por nome..."
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-500"
                                />
                            </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1">
                            {filteredVolunteers.length === 0 ? (
                                <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    {scheduleVolunteers.length === 0
                                        ? 'Não há voluntários ativos neste departamento.'
                                        : 'Nenhum resultado'}
                                </p>
                            ) : (
                                <ul className="space-y-0.5">
                                    {filteredVolunteers.map((v) => (
                                        <li key={v.volunteerId}>
                                            <button
                                                type="button"
                                                onClick={() => pickVolunteer(v.volunteerId, close)}
                                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-700/80"
                                            >
                                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-600 dark:text-zinc-300">
                                                    {v.name.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate">{v.name}</span>
                                                    {v.hasAppAccount === false && (
                                                        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                                                            Sem conta no app — não poderá montar a equipe
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </PopoverPanel>
        </Popover>
    );
}

interface SlotProps {
    coordinator: CoordinatorFace | null;
    canAssign: boolean;
    scheduleVolunteers: ScheduleVolunteerOption[];
    saturdayNumber?: number | null;
    month?: number | null;
    year?: number | null;
    onPick: (volunteerId: number, options?: VolunteerAddOptions) => void;
    onRemove: (coordinator: CoordinatorFace) => void;
    emptyLabel?: string;
}

/** Área do coordenador no sábado: convite claro quando vazio; nome + trocar quando definido. */
export default function CoordinatorSlot({
    coordinator,
    canAssign,
    scheduleVolunteers,
    saturdayNumber,
    month,
    year,
    onPick,
    onRemove,
    emptyLabel = 'Definir coordenador deste sábado',
}: SlotProps) {
    if (!coordinator && !canAssign) {
        return null;
    }

    if (!coordinator) {
        return (
            <div className="mb-4">
                <CoordinatorPicker
                    scheduleVolunteers={scheduleVolunteers}
                    canAssign={canAssign}
                    saturdayNumber={saturdayNumber}
                    month={month}
                    year={year}
                    variant="cta"
                    label={emptyLabel}
                    onPick={onPick}
                />
            </div>
        );
    }

    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white px-2.5 py-1 text-sm text-zinc-800 ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Coordenador
                </span>
                <span className="truncate font-medium">{coordinator.memberName}</span>
            </p>
            {canAssign && (
                <div className="flex items-center gap-1.5">
                    <CoordinatorPicker
                        scheduleVolunteers={scheduleVolunteers}
                        canAssign={canAssign}
                        saturdayNumber={saturdayNumber}
                        month={month}
                        year={year}
                        variant="button"
                        label="Trocar"
                        onPick={onPick}
                    />
                    <button
                        type="button"
                        onClick={() => void onRemove(coordinator)}
                        className={`${scheduleIconButtonClass} cursor-pointer`}
                        title="Remover coordenador"
                        aria-label="Remover coordenador"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
