/** Fuso fixo da igreja para exibir data/hora igual ao cadastro (evita confusão com UTC). */
export const EVENT_TZ = 'America/Sao_Paulo';

export type MobileEventListItem = {
    id: number;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    location: string | null;
    price: string | null;
    purchase_url: string | null;
    image_url: string | null;
    color: string | null;
};

/** Texto descritivo de valor (aceita string vinda da API ou undefined em caches antigos). */
export function priceText(value: string | null | undefined): string | null {
    if (value == null) {
        return null;
    }
    const s = String(value).trim();

    return s.length > 0 ? s : null;
}

export function getDayMonth(iso: string): { day: string; month: string } {
    const d = new Date(iso);

    return {
        day: d.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: EVENT_TZ }),
        month: d
            .toLocaleDateString('pt-BR', { month: 'short', timeZone: EVENT_TZ })
            .replace('.', ''),
    };
}

/** Texto único para data/hora no card e no modal. */
export function formatWhenLine(ev: MobileEventListItem): string {
    const start = new Date(ev.starts_at);
    const tz = { timeZone: EVENT_TZ };
    if (ev.all_day) {
        return start.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            ...tz,
        });
    }
    if (!ev.ends_at) {
        return start.toLocaleString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            ...tz,
        });
    }
    const end = new Date(ev.ends_at);
    const sameCalendarDay =
        start.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', ...tz }) ===
        end.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', ...tz });
    if (sameCalendarDay) {
        const datePart = start.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            ...tz,
        });
        const t0 = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tz });
        const t1 = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tz });

        return `${datePart}, ${t0} – ${t1}`;
    }

    return `${start.toLocaleString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        ...tz,
    })} → ${end.toLocaleString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        ...tz,
    })}`;
}
