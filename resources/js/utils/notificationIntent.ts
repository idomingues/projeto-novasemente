/** Classificação de notificação: ação (precisa atender) vs informativo. */
export type NotificationIntent = 'action' | 'info';

export function normalizeNotificationIntent(value: unknown): NotificationIntent {
    return value === 'action' ? 'action' : 'info';
}

export function isActionNotificationIntent(value: unknown): boolean {
    return normalizeNotificationIntent(value) === 'action';
}

/** Ordena itens de ação antes dos informativos; empate por data (mais recente primeiro). */
export function compareNotificationsByIntentThenDate(
    a: { intent?: string; created_at: string },
    b: { intent?: string; created_at: string },
): number {
    const aAction = isActionNotificationIntent(a.intent) ? 0 : 1;
    const bAction = isActionNotificationIntent(b.intent) ? 0 : 1;
    if (aAction !== bAction) {
        return aAction - bAction;
    }
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
}
