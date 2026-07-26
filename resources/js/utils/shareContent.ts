/** Monta URL absoluta a partir de caminho relativo ou URL completa. */
export function absoluteShareUrl(pathOrUrl: string, appUrl = ''): string {
    const raw = pathOrUrl.trim();
    if (!raw) {
        return typeof window !== 'undefined' ? window.location.href : '';
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return raw;
    }
    const base = (appUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    const path = raw.startsWith('/') ? raw : `/${raw}`;

    return `${base}${path}`;
}

/**
 * Compartilha via Web Share API (mobile) ou copia para a área de transferência.
 * Não exige login.
 */
export async function shareContent(opts: {
    title: string;
    text?: string;
    url: string;
}): Promise<'shared' | 'copied' | 'failed'> {
    const url = opts.url.trim();
    if (!url) {
        return 'failed';
    }

    const title = opts.title.trim() || 'Nova Semente';
    const text = (opts.text ?? title).trim();
    const clipboardPayload = text.includes(url) ? text : `${text}\n\n${url}`;

    try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            await navigator.share({ title, text, url });
            return 'shared';
        }
    } catch (error) {
        // Usuário cancelou o sheet nativo — não cai no fallback.
        if (error instanceof DOMException && error.name === 'AbortError') {
            return 'failed';
        }
    }

    try {
        await navigator.clipboard.writeText(clipboardPayload);
        return 'copied';
    } catch {
        return 'failed';
    }
}
