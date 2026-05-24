export type VolunteerMinistryPhaseRow = {
    ministryName: string;
    phaseLabel: string;
};

type VolunteerMinistryPhasesListRow = {
    ministryPhases?: VolunteerMinistryPhaseRow[];
};

/** Linhas «Departamento → fase» para a coluna Fases Depto no quadro. */
export function volunteerMinistryPhasesInList(row: VolunteerMinistryPhasesListRow): VolunteerMinistryPhaseRow[] {
    return row.ministryPhases ?? [];
}
