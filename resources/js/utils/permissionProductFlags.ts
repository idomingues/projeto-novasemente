/**
 * Metadados de produto para a matriz de perfis: quais permissões disparam
 * notificação de equipe e/ou abrem fila de atendimento.
 *
 * NS Conecta (conversations.*) não entra: acesso é por líder/departamento/membro.
 */

export type PermissionProductFlag = 'notification' | 'attendance';

const NOTIFICATION_PERMS = new Set<string>([
    'solicitations.view',
    'solicitations.manage',
    'mission.manage',
    'talents.moderate',
    'shared_talents.moderate',
    'escalas.manage',
    'pastoral_appointments.manage',
    'volunteers.ministry_operate',
]);

const ATTENDANCE_PERMS = new Set<string>([
    'solicitations.view',
    'solicitations.manage',
    'mission.manage',
    'talents.moderate',
    'shared_talents.moderate',
    'pastoral_appointments.manage',
    'volunteers.ministry_operate',
]);

export function permissionProductFlags(perm: string): PermissionProductFlag[] {
    const flags: PermissionProductFlag[] = [];
    if (NOTIFICATION_PERMS.has(perm)) {
        flags.push('notification');
    }
    if (ATTENDANCE_PERMS.has(perm)) {
        flags.push('attendance');
    }
    return flags;
}

export function permissionReceivesNotification(perm: string): boolean {
    return NOTIFICATION_PERMS.has(perm);
}

export function permissionIsAttendance(perm: string): boolean {
    return ATTENDANCE_PERMS.has(perm);
}
