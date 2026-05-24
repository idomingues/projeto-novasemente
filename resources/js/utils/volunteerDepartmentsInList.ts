import { formatListPreview } from '@/utils/formatListPreview';

type VolunteerDepartmentsRow = {
    pendingInvite?: boolean;
    pendingInviteMinistryNames?: string[];
    ministryNames: string[];
};

/** Departamentos visíveis na lista do quadro (vínculo ou encaminhamento pendente). */
export function volunteerDepartmentsInList(row: VolunteerDepartmentsRow): string {
    if (row.pendingInvite && (row.pendingInviteMinistryNames?.length ?? 0) > 0) {
        return formatListPreview(row.pendingInviteMinistryNames ?? []);
    }

    return formatListPreview(row.ministryNames);
}
