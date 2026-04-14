import { resolveImageFetchUrl } from '@/lib/resolveImageFetchUrl';

function extensionFromMime(mime: string): string {
    const m = mime.toLowerCase();
    if (m.includes('png')) return 'png';
    if (m.includes('webp')) return 'webp';
    if (m.includes('gif')) return 'gif';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
    if (m.includes('svg')) return 'svg';
    return 'jpg';
}

function extensionFromPath(url: string): string {
    const clean = url.split('?')[0]?.toLowerCase() ?? '';
    const m = clean.match(/\.([a-z0-9]+)$/i);
    if (m && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(m[1])) {
        return m[1] === 'jpeg' ? 'jpg' : m[1];
    }
    return 'jpg';
}

function sanitizeFilenameBase(name: string): string {
    const s = name.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return s.slice(0, 80) || 'imagem';
}

/**
 * Descarrega uma imagem (mesma origem ou com CORS permitido).
 * Para URLs externas sem CORS, use fallback no UI.
 */
export async function downloadImageFromUrl(
    src: string,
    filenameBase: string,
    options?: { appUrl?: string; signal?: AbortSignal }
): Promise<void> {
    const abs = resolveImageFetchUrl(src, options?.appUrl);
    if (!abs) {
        throw new Error('EMPTY');
    }

    const sameOrigin =
        typeof window !== 'undefined' &&
        (() => {
            try {
                return new URL(abs, window.location.href).origin === window.location.origin;
            } catch {
                return false;
            }
        })();

    const res = await fetch(abs, {
        mode: 'cors',
        credentials: sameOrigin ? 'include' : 'omit',
        signal: options?.signal,
    });

    if (!res.ok) {
        throw new Error('HTTP');
    }

    const blob = await res.blob();
    const ext = blob.type ? extensionFromMime(blob.type) : extensionFromPath(abs);
    const safe = sanitizeFilenameBase(filenameBase);
    const objectUrl = URL.createObjectURL(blob);

    try {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${safe}.${ext}`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}
