export type MissionRosterFilters = {
    search: string;
    mission_phase_id: string;
    overdue: boolean;
    sort: string;
    sort_dir: string;
    has_app_account: string;
    has_email: string;
    has_phone: string;
    has_birth_date: string;
    has_belief: string;
    participates_religion: string;
    baptized: string;
    first_time_nova_semente: string;
    studied_bible_structured: string;
    lgpd_consent: string;
    studied_bible: string;
    wants_bible_study_partner: string;
    belief_which: string;
    religion_which: string;
    profession: string;
    profile_type: string;
    ministry_preference: string;
    engagement_level: string;
    created_from: string;
    created_to: string;
    birth_date_from: string;
    birth_date_to: string;
};

export const MISSION_SORT_DEFAULT = 'name';
export const MISSION_SORT_DIR_DEFAULT = 'asc';

type MissionSortOption = { value: string; label: string; sort: string; sort_dir: string };

export function missionSortOptions(): MissionSortOption[] {
    return [
        { value: 'name:asc', label: 'Nome (A–Z)', sort: 'name', sort_dir: 'asc' },
        { value: 'name:desc', label: 'Nome (Z–A)', sort: 'name', sort_dir: 'desc' },
        { value: 'created_at:desc', label: 'Cadastro (mais recente)', sort: 'created_at', sort_dir: 'desc' },
        { value: 'created_at:asc', label: 'Cadastro (mais antigo)', sort: 'created_at', sort_dir: 'asc' },
        { value: 'phase:asc', label: 'Fase (ordem do fluxo)', sort: 'phase', sort_dir: 'asc' },
        { value: 'phase:desc', label: 'Fase (inversa)', sort: 'phase', sort_dir: 'desc' },
        { value: 'phase_entered:desc', label: 'Tempo na fase (mais tempo)', sort: 'phase_entered', sort_dir: 'desc' },
        { value: 'phase_entered:asc', label: 'Tempo na fase (mais recente)', sort: 'phase_entered', sort_dir: 'asc' },
    ];
}

export function missionSortSelectValue(sort: string | undefined, sortDir: string | undefined): string {
    const s = sort && sort !== '' ? sort : MISSION_SORT_DEFAULT;
    const d = sortDir === 'desc' ? 'desc' : MISSION_SORT_DIR_DEFAULT;
    return `${s}:${d}`;
}

const ROSTER_QUERY_SKIP = new Set(['search', 'mission_phase_id', 'overdue', 'sort', 'sort_dir']);

export function missionActiveFiltersCount(filters: MissionRosterFilters): number {
    return (Object.entries(filters) as [string, unknown][]).filter(([key, value]) => {
        if (ROSTER_QUERY_SKIP.has(key)) {
            return false;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        return value !== '' && value !== null && value !== undefined;
    }).length;
}

export function missionVolunteersQuery(
    filters: MissionRosterFilters,
    search: string,
    extra: Record<string, string> = {},
    options?: { kanban?: boolean },
): Record<string, string> {
    const out: Record<string, string> = { ...extra };
    const merged = { ...filters, search };

    for (const [key, value] of Object.entries(merged)) {
        if (key === 'overdue') {
            if (value === true) {
                out.overdue = '1';
            }
            continue;
        }
        if (value !== '' && value !== null && value !== undefined) {
            out[key] = String(value);
        }
    }

    if (options?.kanban) {
        out.per_page = '500';
        out.mission_phase_id = '';
        out.page = '1';
    }

    return out;
}

export const MISSION_FILTER_FORM_DEFAULTS: Omit<MissionRosterFilters, 'search' | 'mission_phase_id' | 'overdue' | 'sort' | 'sort_dir'> = {
    has_app_account: '',
    has_email: '',
    has_phone: '',
    has_birth_date: '',
    has_belief: '',
    participates_religion: '',
    baptized: '',
    first_time_nova_semente: '',
    studied_bible_structured: '',
    lgpd_consent: '',
    studied_bible: '',
    wants_bible_study_partner: '',
    belief_which: '',
    religion_which: '',
    profession: '',
    profile_type: '',
    ministry_preference: '',
    engagement_level: '',
    created_from: '',
    created_to: '',
    birth_date_from: '',
    birth_date_to: '',
};
