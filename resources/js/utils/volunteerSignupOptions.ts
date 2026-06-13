export type AttendanceDuration =
    | 'months_0_6'
    | 'months_6_12'
    | 'years_1_2'
    | 'more_than_2_years';

export type VolunteerPhase = 'interested' | 'in_training' | 'active';

export type ServiceEaseAreaSlug =
    | 'reception'
    | 'music'
    | 'communication'
    | 'teaching'
    | 'children_youth'
    | 'technology'
    | 'administration'
    | 'social_mission';

export const ATTENDANCE_DURATION_OPTIONS: { value: AttendanceDuration; label: string }[] = [
    { value: 'months_0_6', label: '0 a 6 meses' },
    { value: 'months_6_12', label: '6 meses a 1 ano' },
    { value: 'years_1_2', label: '1 a 2 anos' },
    { value: 'more_than_2_years', label: 'Mais de 2 anos' },
];

export const VOLUNTEER_PHASE_OPTIONS: { value: VolunteerPhase; label: string }[] = [
    { value: 'interested', label: 'Interessado' },
    { value: 'in_training', label: 'Em treinamento' },
    { value: 'active', label: 'Atuante' },
];

export const SERVICE_EASE_AREA_OPTIONS: { value: ServiceEaseAreaSlug; label: string }[] = [
    { value: 'reception', label: 'Recepção e acolhimento' },
    { value: 'music', label: 'Música e louvor' },
    { value: 'communication', label: 'Comunicação e mídia' },
    { value: 'teaching', label: 'Ensino e discipulado' },
    { value: 'children_youth', label: 'Crianças e adolescentes' },
    { value: 'technology', label: 'Tecnologia e sistemas' },
    { value: 'administration', label: 'Administração e organização' },
    { value: 'social_mission', label: 'Ação social e missionária' },
];

export const VOLUNTEER_SIGNUP_PAGE_COUNT = 3;

export function isValidVolunteerPhase(value: string): value is VolunteerPhase {
    return VOLUNTEER_PHASE_OPTIONS.some((option) => option.value === value);
}

export function hasServiceEaseAreaSelection(value: unknown): boolean {
    if (!Array.isArray(value)) return false;
    const allowed = new Set(SERVICE_EASE_AREA_OPTIONS.map((option) => option.value));
    return value.some((item) => allowed.has(String(item) as ServiceEaseAreaSlug));
}

export function toggleMultiSelectValue(current: string[], value: string): string[] {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function toggleServiceEaseAreaSlug(current: string[], slug: ServiceEaseAreaSlug): string[] {
    return toggleMultiSelectValue(current, slug);
}

export function formatMultiSelectSelectionCount(count: number): string {
    return `${count} selecionada${count === 1 ? '' : 's'}`;
}
