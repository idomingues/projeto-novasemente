import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useState, type MouseEvent } from 'react';
import { downloadImageFromUrl } from '@/lib/downloadImage';
import { resolveImageFetchUrl } from '@/lib/resolveImageFetchUrl';
import { appToast } from '@/utils/appToast';

type Props = {
    /** URL da imagem (relativa ao app, absoluta ou blob:) */
    src: string;
    /** Base do nome do ficheiro (sem extensão) */
    filenameBase: string;
    /** Base URL da app (props Inertia `appUrl`) para paths relativos */
    appUrl?: string;
    /** Classes do botão (ex.: posição absoluta) */
    className?: string;
    stopPropagation?: boolean;
    /** Texto acessível / tooltip */
    title?: string;
    /** `sm` para miniaturas estreitas */
    size?: 'sm' | 'md';
};

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
    sm: 'h-8 w-8 p-1.5',
    md: 'h-10 w-10 p-2',
};

const ICON_CLASS: Record<NonNullable<Props['size']>, string> = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
};

export default function ImageDownloadButton({
    src,
    filenameBase,
    appUrl = '',
    className = '',
    stopPropagation = false,
    title = 'Salvar imagem',
    size = 'md',
}: Props) {
    const [busy, setBusy] = useState(false);

    if (!src.trim()) {
        return null;
    }

    const onClick = async (e: MouseEvent<HTMLButtonElement>) => {
        if (stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
        setBusy(true);
        try {
            await downloadImageFromUrl(src, filenameBase, { appUrl });
            appToast('Imagem guardada.', 'success');
        } catch {
            const abs = resolveImageFetchUrl(src, appUrl);
            const isBlob = abs.startsWith('blob:');
            let crossOrigin = false;
            if (typeof window !== 'undefined' && !isBlob) {
                try {
                    crossOrigin = new URL(abs, window.location.href).origin !== window.location.origin;
                } catch {
                    crossOrigin = false;
                }
            }
            if (crossOrigin && typeof window !== 'undefined') {
                window.open(abs, '_blank', 'noopener,noreferrer');
                appToast('Abri a imagem noutro separador — use o menu do browser para salvar.', 'info');
            } else {
                appToast('Não foi possível salvar. Em telemóvel: toque longo na imagem → «Salvar imagem».', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={(e) => void onClick(e)}
            disabled={busy}
            title={title}
            aria-label={title}
            className={`inline-flex shrink-0 items-center justify-center rounded-full bg-black/65 text-white shadow-sm ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60 ${SIZE_CLASS[size]} ${className}`}
        >
            <ArrowDownTrayIcon className={`${ICON_CLASS[size]} ${busy ? 'animate-pulse' : ''}`} strokeWidth={2.2} aria-hidden />
        </button>
    );
}
