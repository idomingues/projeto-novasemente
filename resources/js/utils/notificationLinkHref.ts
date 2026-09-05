/**
 * URLs de inbox vêm por vezes como absolutas (APP_URL / produção / localhost).
 * Para o Inertia `Link`, sempre normaliza http(s) para path+query na origem atual —
 * senão o clique tenta visitar outro host e a SPA fica em tela branca.
 */
export function notificationLinkHref(href: string): string {
    if (!href) {
        return href;
    }
    if (href.startsWith('/') && !href.startsWith('//')) {
        return href;
    }
    try {
        const base =
            typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : 'http://localhost';
        const u = new URL(href, base);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
            return `${u.pathname}${u.search}${u.hash}`;
        }
    } catch {
        return href;
    }
    return href;
}
