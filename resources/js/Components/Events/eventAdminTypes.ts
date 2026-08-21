/** Cores sugeridas (hex) — complementam o código livre e o seletor nativo. */
export const EVENT_COLOR_PRESETS = [
    '#2563EB',
    '#059669',
    '#DC2626',
    '#D97706',
    '#7C3AED',
    '#DB2777',
    '#0891B2',
    '#4F46E5',
    '#16A34A',
    '#EA580C',
    '#64748B',
    '#18181B',
] as const;

export function normalizeHexColor(v: string | undefined | null): string {
    const t = (v ?? '').trim();
    if (!t) return '';
    const withHash = t.startsWith('#') ? t : `#${t}`;
    return withHash.toUpperCase();
}

export function colorPickerSafeValue(hex: string): string {
    const n = normalizeHexColor(hex);
    return /^#[0-9A-F]{6}$/i.test(n) ? n : '#2563EB';
}

export type EventItemForAdmin = {
    id: number;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    location: string | null;
    price: string | null;
    purchase_url: string | null;
    video_type: 'youtube' | 'instagram' | null;
    video_url: string | null;
    image_url: string | null;
    color: string | null;
};

export function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('/')) return `${appUrl}${url}`;
    return url;
}

export const EVENT_TZ = 'America/Sao_Paulo';
const tzOpts = { timeZone: EVENT_TZ };

function tzDateParts(d: Date): Record<string, string> {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: EVENT_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(d);

    return Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
}

/** Valor para input datetime-local no fuso da igreja (evita toISOString em UTC). */
export function toDatetimeLocalString(d: Date): string {
    const p = tzDateParts(d);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function toDateInputValue(d: Date): string {
    const p = tzDateParts(d);
    return `${p.year}-${p.month}-${p.day}`;
}

export function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tzOpts });
}

export function formatDateTime(iso: string, allDay: boolean): string {
    const d = new Date(iso);
    if (allDay) {
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', ...tzOpts });
    }
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        ...tzOpts,
    });
}
