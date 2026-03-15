import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

/** Atualiza favicon e nome da igreja no documento conforme o cadastro. */
export default function AppHead() {
    const { appName, faviconUrl } = usePage().props as {
        appName?: string | null;
        faviconUrl?: string | null;
    };

    useEffect(() => {
        if (faviconUrl) {
            let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.type = 'image/svg+xml';
            link.href = `/favicon.svg?img=${encodeURIComponent(faviconUrl)}`;
        }
    }, [faviconUrl]);

    useEffect(() => {
        const updateTitle = () => {
            const name = appName || 'Laravel';
            const parts = document.title.split(/\s*[‑–—-]\s*/);
            const pageTitle = parts[0]?.trim() || '';
            document.title = pageTitle ? `${pageTitle} – ${name}` : name;
        };
        const id = setTimeout(updateTitle, 0);
        return () => clearTimeout(id);
    }, [appName]);
}
