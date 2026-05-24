export type VolunteerMinistryPhaseRow = {
    ministryName: string;
    inviteLabel: string;
    departmentStatusLabel: string;
};

type VolunteerMinistryPhasesListRow = {
    ministryPhases?: VolunteerMinistryPhaseRow[];
};

/** Linhas por departamento (convite e fase do líder) no quadro de voluntários. */
export function volunteerMinistryPhasesInList(row: VolunteerMinistryPhasesListRow): VolunteerMinistryPhaseRow[] {
    return row.ministryPhases ?? [];
}
