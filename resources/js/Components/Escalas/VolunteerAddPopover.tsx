import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

export interface VolunteerAddOptions {
    recurring?: boolean;
    assignment_month?: number;
    assignment_year?: number;
    schedule_role_id?: number | null;
}

export interface ScheduleRoleOption {
    id: number;
    name: string;
    ministryId: number | null;
}

interface Member {
    id: number;
    name: string;
}

interface Props {
    members: Member[];
    existingMemberIds: number[];
    canEdit: boolean;
    onPick: (memberId: number, options?: VolunteerAddOptions) => void;
    saturdayNumber?: number | null;
    month?: number | null;
    year?: number | null;
    scheduleRoles?: ScheduleRoleOption[];
}

/** Mesmo tamanho e base visual do botão de check-in na escala. */
export const scheduleIconButtonClass =
    'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-900';

/** Botão + com o mesmo tamanho/estilo do botão de check-in ao lado. */
export default function VolunteerAddPopover({
    members,
    existingMemberIds,
    canEdit,
    onPick,
    saturdayNumber,
    month,
    year,
    scheduleRoles = [],
}: Props) {
    const [memberFilter, setMemberFilter] = useState('');
    const [addRecurring, setAddRecurring] = useState(true);
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');

    const availableMembers = useMemo(
        () => members.filter((m) => !existingMemberIds.includes(m.id)),
        [members, existingMemberIds],
    );

    const filteredMembers = useMemo(() => {
        if (!memberFilter.trim()) return availableMembers;
        const q = memberFilter.trim().toLowerCase();
        return availableMembers.filter((m) => m.name.toLowerCase().includes(q));
    }, [availableMembers, memberFilter]);

    const pickMember = (memberId: number, close: () => void) => {
        const parsed = selectedRoleId === '' ? null : Number.parseInt(selectedRoleId, 10);
        const schedule_role_id = parsed !== null && !Number.isNaN(parsed) ? parsed : null;

        const options: VolunteerAddOptions =
            saturdayNumber != null && month != null && year != null
                ? {
                      recurring: addRecurring,
                      assignment_month: addRecurring ? undefined : month,
                      assignment_year: addRecurring ? undefined : year,
                      schedule_role_id,
                  }
                : { schedule_role_id };
        onPick(memberId, options);
        setMemberFilter('');
        close();
    };

    if (!canEdit) {
        return null;
    }

    return (
        <Popover className="relative">
            <PopoverButton
                type="button"
                onClick={() => {
                    setMemberFilter('');
                    setSelectedRoleId('');
                }}
                className={scheduleIconButtonClass}
                title="Adicionar voluntário a esta escala"
                aria-label="Adicionar voluntário a esta escala"
            >
                <PlusIcon className="h-5 w-5" />
            </PopoverButton>
            <PopoverPanel
                anchor="bottom end"
                className="z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden dark:border-zinc-700 dark:bg-zinc-800"
            >
                {({ close }) => (
                    <>
                        {scheduleRoles.length > 0 && (
                            <div className="border-b border-zinc-100 p-2 dark:border-zinc-700">
                                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                    Função (opcional)
                                </label>
                                <select
                                    value={selectedRoleId}
                                    onChange={(e) => setSelectedRoleId(e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                >
                                    <option value="">Sem função</option>
                                    {scheduleRoles.map((r) => (
                                        <option key={r.id} value={String(r.id)}>
                                            {r.name}
                                            {r.ministryId == null ? ' (geral)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Escolha o voluntário</p>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    value={memberFilter}
                                    onChange={(e) => setMemberFilter(e.target.value)}
                                    placeholder="Buscar por nome..."
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-500"
                                />
                            </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1">
                            {filteredMembers.length === 0 ? (
                                <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    {availableMembers.length === 0 ? 'Todos já estão na escala' : 'Nenhum resultado'}
                                </p>
                            ) : (
                                <ul className="space-y-0.5">
                                    {filteredMembers.map((m) => (
                                        <li key={m.id}>
                                            <button
                                                type="button"
                                                onClick={() => pickMember(m.id, close)}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-700/80"
                                            >
                                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-600 dark:text-zinc-300">
                                                    {m.name.charAt(0).toUpperCase()}
                                                </span>
                                                {m.name}
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
