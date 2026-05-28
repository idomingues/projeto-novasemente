import type { VolunteerMinistryPhaseRow } from '@/utils/volunteerMinistryPhasesInList';
import { listEmpty } from '@/utils/volunteerRosterList';

export default function VolunteerMinistryDepartmentColumn({
    phases,
    valueKey,
}: {
    phases: VolunteerMinistryPhaseRow[];
    valueKey: 'inviteLabel' | 'departmentStatusLabel';
}) {
    if (phases.length === 0) {
        return <span className="text-zinc-400">?</span>;
    }

    return (
        <div className="space-y-1">
            {phases.map((row) => (
                <div key={row.ministryName} className="leading-snug">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">{row.ministryName}</span>
                    <span className="text-zinc-400 dark:text-zinc-500"> → </span>
                    <span className="text-zinc-600 dark:text-zinc-300">{listEmpty(row[valueKey])}</span>
                </div>
            ))}
        </div>
    );
}
