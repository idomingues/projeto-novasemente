/**
 * URLs de inbox vêm por vezes como absolutas (APP_URL). Para o Inertia `Link`,
 * normaliza para path+query na mesma origem.
 */
export function notificationLinkHref(href: string): string {
    if (!href) {
        return href;
    }
    if (href.startsWith('/') && !href.startsWith('//')) {
        return href;
    }
    if (typeof window === 'undefined') {
        return href;
    }
    try {
        const u = new URL(href);
        if (u.origin === window.location.origin) {
            return `${u.pathname}${u.search}${u.hash}`;
        }
    } catch {
        return href;
    }
    return href;
}
