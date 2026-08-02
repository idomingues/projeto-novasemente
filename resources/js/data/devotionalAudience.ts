export type DevotionalAudience = 'adultos' | 'mulheres' | 'jovens';

export const DEVOTIONAL_AUDIENCE_DEFAULT: DevotionalAudience = 'adultos';

export const DEVOTIONAL_AUDIENCE_OPTIONS: { value: DevotionalAudience; label: string }[] = [
    { value: 'adultos', label: 'Adulto' },
    { value: 'mulheres', label: 'Mulher' },
    { value: 'jovens', label: 'Jovem' },
];

const STORAGE_KEY = 'ns-devotional-audience';
export const DEVOTIONAL_AUDIENCE_COOKIE = 'ns_devotional_audience';

export function normalizeDevotionalAudience(value: unknown): DevotionalAudience {
    const v = String(value ?? '')
        .trim()
        .toLowerCase();
    if (v === 'mulheres' || v === 'jovens' || v === 'adultos') {
        return v;
    }
    return DEVOTIONAL_AUDIENCE_DEFAULT;
}

function readCookieAudience(): DevotionalAudience | null {
    try {
        const match = document.cookie.match(/(?:^|; )ns_devotional_audience=([^;]*)/);
        if (!match?.[1]) {
            return null;
        }
        return normalizeDevotionalAudience(decodeURIComponent(match[1]));
    } catch {
        return null;
    }
}

function writeCookieAudience(audience: DevotionalAudience): void {
    try {
        const maxAge = 60 * 60 * 24 * 400;
        document.cookie = `${DEVOTIONAL_AUDIENCE_COOKIE}=${encodeURIComponent(audience)};path=/;max-age=${maxAge};SameSite=Lax`;
    } catch {
        // ignore
    }
}

/** Preferência salva (localStorage + cookie). */
export function readStoredDevotionalAudience(): DevotionalAudience {
    try {
        const fromStorage = window.localStorage.getItem(STORAGE_KEY);
        if (fromStorage) {
            return normalizeDevotionalAudience(fromStorage);
        }
    } catch {
        // ignore
    }
    return readCookieAudience() ?? DEVOTIONAL_AUDIENCE_DEFAULT;
}

export function storeDevotionalAudience(audience: DevotionalAudience): void {
    const next = normalizeDevotionalAudience(audience);
    try {
        window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // ignore
    }
    writeCookieAudience(next);
}

export function devotionalAudienceTitle(audience: DevotionalAudience): string {
    switch (audience) {
        case 'mulheres':
            return 'Devocional da Mulher';
        case 'jovens':
            return 'Devocional Jovem';
        default:
            return 'Meditação diária';
    }
}
