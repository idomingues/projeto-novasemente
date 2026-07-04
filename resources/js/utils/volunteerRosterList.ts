import type { VolunteerMinistryPhaseRow } from '@/utils/volunteerMinistryPhasesInList';

export type VolunteerRosterListRow = {
    id: number;
    name: string | null;
    photoUrl?: string | null;
    hasUserAccount?: boolean;
    email: string | null;
    phone: string | null;
    active: boolean;
    createdAt: string | null;
    updatedAt?: string | null;
    hasLeaderNotes?: boolean;
    recentlyUpdated?: boolean;
    stageId: number | undefined;
    stageName: string;
    adminWorkflowStageId?: number | null;
    adminWorkflowStageName?: string | null;
    pendingInvite?: boolean;
    pendingInviteMinistryNames?: string[];
    forwardedMinistryIds?: number[];
    ministryNames: string[];
    ministryPhases?: VolunteerMinistryPhaseRow[];
    interestPreview: string | null;
};

export type VolunteerRosterBoardFilters = {
    search: string;
    has_leader_notes: string;
    has_user_account: string;
    has_whatsapp: string;
    has_social_networks: string;
    is_official_member: string;
    member_record_at_nova_semente: string;
    has_previous_ministry_volunteer_experience: string;
    needs_pastoral_guidance: string;
    lgpd_data_consent: string;
    active: string;
    app_access_only: string;
    role: string;
    has_email: string;
    has_phone: string;
    has_birth_date: string;
    attendance_duration: string;
    attendance_duration_text: string;
    created_from: string;
    created_to: string;
    birth_date_from: string;
    birth_date_to: string;
    member_record_church: string;
    professional_area: string;
    ministry_ids: string;
    text_interest: string;
    pipeline_stage_id: string;
    arquivados?: boolean;
    sort: string;
    sort_dir: string;
};

export type VolunteerRosterSortOption = { value: string; label: string; sort: string; sort_dir: string };

export const ROSTER_SORT_DEFAULT = 'name';
export const ROSTER_SORT_DIR_DEFAULT = 'asc';

export function rosterSortOptions(canVolunteerManage: boolean): VolunteerRosterSortOption[] {
    const stageSort = canVolunteerManage ? 'workflow_stage' : 'stage';
    const stageLabel = canVolunteerManage ? 'Fase principal' : 'Fase';

    return [
        { value: 'name:asc', label: 'Nome (A–Z)', sort: 'name', sort_dir: 'asc' },
        { value: 'name:desc', label: 'Nome (Z–A)', sort: 'name', sort_dir: 'desc' },
        { value: 'created_at:desc', label: 'Cadastro (mais recente)', sort: 'created_at', sort_dir: 'desc' },
        { value: 'created_at:asc', label: 'Cadastro (mais antigo)', sort: 'created_at', sort_dir: 'asc' },
        { value: `${stageSort}:asc`, label: `${stageLabel} (A–Z)`, sort: stageSort, sort_dir: 'asc' },
        { value: `${stageSort}:desc`, label: `${stageLabel} (Z–A)`, sort: stageSort, sort_dir: 'desc' },
    ];
}

export function rosterSortSelectValue(sort: string | undefined, sortDir: string | undefined): string {
    const s = sort && sort !== '' ? sort : ROSTER_SORT_DEFAULT;
    const d = sortDir === 'desc' ? 'desc' : ROSTER_SORT_DIR_DEFAULT;
    return `${s}:${d}`;
}

export function listEmpty(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    if (trimmed === '' || trimmed === '—') {
        return '?';
    }
    return trimmed;
}

export function formatShortDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '—';
    }
}

export function formatVolunteerResultsSummary(volunteers: {
    data: unknown[];
    total?: number;
    from?: number | null;
    to?: number | null;
}): string {
    const total = typeof volunteers.total === 'number' ? volunteers.total : volunteers.data.length;
    if (total === 0) {
        return 'Nenhum registro encontrado';
    }
    const word = total === 1 ? 'registro' : 'registros';
    const from = volunteers.from;
    const to = volunteers.to;
    const paginated = typeof from === 'number' && typeof to === 'number' && total > volunteers.data.length;
    if (paginated) {
        return `${total} ${word} encontrados · mostrando ${from}–${to}`;
    }
    return `${total} ${word} encontrados`;
}
