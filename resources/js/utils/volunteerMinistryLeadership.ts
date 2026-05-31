import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';

export function volunteerUserIsSuperAdmin(v: VolunteerDetailData): boolean {
    return Boolean(v.user?.roles?.includes('super_admin'));
}

export function volunteerUserIsPanelTeam(v: VolunteerDetailData): boolean {
    return Boolean(
        v.user?.roles?.some((r) => ['admin', 'super_admin', 'pastor', 'secretaria'].includes(r)),
    );
}

/**
 * Quem tem `volunteers.manage` pode marcar/remover líder na aba Departamentos.
 * Conta ligada a super_admin continua bloqueada (proteção de acesso).
 */
export function volunteerCanSetMinistryLeadership(v: VolunteerDetailData, canVolunteerManage: boolean): boolean {
    if (!canVolunteerManage || !v.has_app_account) {
        return false;
    }

    return !volunteerUserIsSuperAdmin(v);
}

export function leaderMinistryIdsFromVolunteer(v: VolunteerDetailData): number[] {
    return (v.user?.led_ministries ?? []).map((m) => m.id);
}
