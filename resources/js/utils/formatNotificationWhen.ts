/** Rótulo de data/hora para itens do feed de notificações (pt-BR). */
export function formatNotificationWhen(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / 86_400_000);

    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let dayLabel: string;
    if (dayDiff === 0) {
        dayLabel = 'Hoje';
    } else if (dayDiff === 1) {
        dayLabel = 'Ontem';
    } else if (date.getFullYear() === now.getFullYear()) {
        dayLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } else {
        dayLabel = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    return `${dayLabel} · ${time}`;
}
