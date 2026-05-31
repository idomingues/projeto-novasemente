import SplitSortedMultiCheckboxPicker from '@/Components/SplitSortedMultiCheckboxPicker';
import VolunteerMinistryLeaderToggle from '@/Components/Volunteers/VolunteerMinistryLeaderToggle';
import type { SortedCheckboxOption } from '@/Components/SortedMultiCheckboxList';
import { volunteerCanSetMinistryLeadership } from '@/utils/volunteerMinistryLeadership';
import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';

type Props = {
    volunteer: VolunteerDetailData;
    canVolunteerManage: boolean;
    options: SortedCheckboxOption[];
    ministryIds: number[];
    leaderMinistryIds: number[];
    onMinistryIdsChange: (ids: number[]) => void;
    onLeaderMinistryIdsChange: (ids: number[]) => void;
    error?: string;
    confirmChanges?: boolean;
    maxHeightClass?: string;
};

export default function VolunteerServeMinistriesPicker({
    volunteer,
    canVolunteerManage,
    options,
    ministryIds,
    leaderMinistryIds,
    onMinistryIdsChange,
    onLeaderMinistryIdsChange,
    error,
    confirmChanges = true,
    maxHeightClass = 'max-h-[min(50vh,360px)]',
}: Props) {
    const canSetLeadership = volunteerCanSetMinistryLeadership(volunteer, canVolunteerManage);
    const leaderSet = new Set(leaderMinistryIds);

    const handleMinistryIdsChange = (ids: number[]) => {
        onMinistryIdsChange(ids);
        onLeaderMinistryIdsChange(leaderMinistryIds.filter((id) => ids.includes(id)));
    };

    const toggleLeader = (ministryId: number) => {
        const next = new Set(leaderMinistryIds);
        if (next.has(ministryId)) {
            next.delete(ministryId);
        } else {
            next.add(ministryId);
        }
        onLeaderMinistryIdsChange(Array.from(next));
    };

    return (
        <div className="space-y-3">
            {options.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum departamento cadastrado nesta igreja.</p>
            ) : (
                <SplitSortedMultiCheckboxPicker
                    options={options}
                    selectedIds={ministryIds}
                    onChange={handleMinistryIdsChange}
                    maxHeightClass={maxHeightClass}
                    confirmChanges={confirmChanges}
                    error={error}
                    renderTrailingAction={(option, selected) => {
                        if (!selected) {
                            return null;
                        }
                        if (canSetLeadership) {
                            return (
                                <VolunteerMinistryLeaderToggle
                                    isLeader={leaderSet.has(option.id)}
                                    onToggle={() => toggleLeader(option.id)}
                                />
                            );
                        }
                        if (leaderSet.has(option.id)) {
                            return (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                                    Líder
                                </span>
                            );
                        }
                        return null;
                    }}
                />
            )}
        </div>
    );
}
