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

export function toDatetimeLocalString(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInputValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const EVENT_TZ = 'America/Sao_Paulo';
const tzOpts = { timeZone: EVENT_TZ };

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
