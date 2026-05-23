/** Valida e normaliza URLs de post/reel do Instagram (alinhado ao backend `InstagramUrl`). */
export function instagramShortcodeFromUrl(url: string): string | null {
    const m = url
        .trim()
        .match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[\w.-]+\/)?(?:p|reels?|tv)\/([\w-]+)/i);
    return m?.[1] ?? null;
}

export function isValidInstagramPostUrl(url: string): boolean {
    return instagramShortcodeFromUrl(url) !== null;
}

export function normalizeInstagramPostUrl(url: string): string | null {
    const code = instagramShortcodeFromUrl(url);
    if (!code) {
        return null;
    }
    if (/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[\w.-]+\/)?reels?\//i.test(url)) {
        return `https://www.instagram.com/reel/${code}/`;
    }
    if (/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[\w.-]+\/)?tv\//i.test(url)) {
        return `https://www.instagram.com/tv/${code}/`;
    }
    return `https://www.instagram.com/p/${code}/`;
}
