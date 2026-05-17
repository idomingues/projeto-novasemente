import { useEffect, useState } from 'react';

/** Visualizador PDF do Chrome/Edge/WebView (fragmento na URL). Safari pode ignorar. */
export const PDF_VIEW_PORTRAIT = '#zoom=140';

export const PDF_VIEW_LANDSCAPE = '#view=FitH';

export function stripUrlFragment(url: string): string {
    const i = url.indexOf('#');
    return i === -1 ? url : url.slice(0, i);
}

/** URL para abrir o PDF no browser ou iframe (não usar em links com `download`). */
export function pdfUrlWithViewerParams(pdfUrl: string, fragment: string): string {
    const base = stripUrlFragment(pdfUrl);
    const f = fragment.startsWith('#') ? fragment : `#${fragment}`;
    return `${base}${f}`;
}

/**
 * Fragmento adequado à orientação: retrato = zoom maior para leitura no celular.
 */
export function usePdfViewerFragment(): string {
    const [fragment, setFragment] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return PDF_VIEW_PORTRAIT;
        }
        try {
            return window.matchMedia('(orientation: portrait)').matches
                ? PDF_VIEW_PORTRAIT
                : PDF_VIEW_LANDSCAPE;
        } catch {
            return PDF_VIEW_PORTRAIT;
        }
    });

    useEffect(() => {
        const apply = () => {
            let portrait = true;
            try {
                portrait = window.matchMedia('(orientation: portrait)').matches;
            } catch {
                portrait = true;
            }
            setFragment(portrait ? PDF_VIEW_PORTRAIT : PDF_VIEW_LANDSCAPE);
        };

        apply();
        const mq = window.matchMedia('(orientation: portrait)');
        mq.addEventListener('change', apply);
        let orientTimer: number | undefined;
        const onOrientationChange = () => {
            if (orientTimer !== undefined) {
                window.clearTimeout(orientTimer);
            }
            orientTimer = window.setTimeout(apply, 200);
        };
        window.addEventListener('orientationchange', onOrientationChange);

        return () => {
            mq.removeEventListener('change', apply);
            window.removeEventListener('orientationchange', onOrientationChange);
            if (orientTimer !== undefined) {
                window.clearTimeout(orientTimer);
            }
        };
    }, []);

    return fragment;
}
