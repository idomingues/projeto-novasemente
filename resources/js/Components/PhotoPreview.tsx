import Modal from '@/Components/Modal';
import { useState, type MouseEvent, type ReactNode } from 'react';

export function photoPreviewTitle(name: string | null | undefined): string {
    const displayName = (name ?? '').trim();
    return displayName !== '' ? `Foto de ${displayName}` : 'Foto';
}

type PhotoPreviewModalProps = {
    show: boolean;
    photoUrl: string;
    title: string;
    onClose: () => void;
};

export function PhotoPreviewModal({ show, photoUrl, title, onClose }: PhotoPreviewModalProps) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md" disableBodyScroll>
            <div className="px-4 pb-6 pt-12 text-center sm:px-6">
                <img
                    src={photoUrl}
                    alt={title}
                    className="mx-auto max-h-[min(70vh,32rem)] w-full rounded-2xl object-contain"
                />
                {title !== 'Foto' ? (
                    <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-200">{title.replace(/^Foto de /, '')}</p>
                ) : null}
            </div>
        </Modal>
    );
}

type PhotoPreviewButtonProps = {
    photoUrl: string | null | undefined;
    name?: string | null;
    /** Classes do botão/trigger (tamanho, borda, cursor). */
    className?: string;
    /** Classes da imagem interna. */
    imageClassName?: string;
    stopPropagation?: boolean;
    children?: ReactNode;
};

/**
 * Foto clicável que abre modal ampliado. Use em listas, cabeçalhos e avatares de pessoa.
 */
export function PhotoPreviewButton({
    photoUrl,
    name,
    className = '',
    imageClassName = 'h-full w-full object-cover',
    stopPropagation = true,
    children,
}: PhotoPreviewButtonProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const url = photoUrl?.trim() || null;
    const title = photoPreviewTitle(name);

    if (!url) {
        return children ?? null;
    }

    const open = (e: MouseEvent) => {
        if (stopPropagation) {
            e.stopPropagation();
            e.preventDefault();
        }
        setPreviewOpen(true);
    };

    return (
        <>
            <button
                type="button"
                onClick={open}
                className={`cursor-zoom-in overflow-hidden transition hover:ring-2 hover:ring-teal-400/80 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:hover:ring-teal-500/60 ${className}`}
                aria-label={`Ampliar ${title.toLowerCase()}`}
                title="Clique para ampliar"
            >
                {children ?? <img src={url} alt="" className={imageClassName} loading="lazy" decoding="async" />}
            </button>
            <PhotoPreviewModal show={previewOpen} photoUrl={url} title={title} onClose={() => setPreviewOpen(false)} />
        </>
    );
}
