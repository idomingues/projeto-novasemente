/** URL absoluta para fetch de imagens (paths relativos, blob: ou http(s)). */
export function resolveImageFetchUrl(src: string, appUrl = ''): string {
    const trimmed = src.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    const base = (appUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
}
