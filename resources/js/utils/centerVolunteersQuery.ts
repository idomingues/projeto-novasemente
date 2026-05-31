import type { VolunteerRosterBoardFilters } from '@/utils/volunteerRosterList';

export type CenterGroupBy = 'departamento' | 'fase';

export type CenterVinculo = 'vinculados' | 'encaminhados';

export function centerVolunteersQuery(
    groupBy: CenterGroupBy,
    selectedMinistryId: number | null,
    selectedPhaseKey: string | null,
    boardFilters: VolunteerRosterBoardFilters,
    search: string,
    centerVinculo?: CenterVinculo | null,
): Record<string, string> {
    const out: Record<string, string> = { agrupar: groupBy };

    if (groupBy === 'fase') {
        if (selectedPhaseKey) {
            out.fase = selectedPhaseKey;
        }
    } else if (selectedMinistryId === 0) {
        out.ministerio = 'none';
    } else if (selectedMinistryId !== null && selectedMinistryId > 0) {
        out.ministerio = String(selectedMinistryId);
        if (centerVinculo === 'encaminhados') {
            out.vinculo = 'encaminhados';
        }
    }

    const merged = { ...boardFilters, search };
    for (const [key, value] of Object.entries(merged)) {
        if (key === 'arquivados') {
            continue;
        }
        if (value !== '' && value !== null && value !== undefined) {
            out[key] = String(value);
        }
    }

    return out;
}
