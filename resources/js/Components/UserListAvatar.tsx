import Modal from '@/Components/Modal';
import { useState } from 'react';

type Size = 'sm' | 'md';

const sizeClasses: Record<Size, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
};

export default function UserListAvatar({
    name,
    photoUrl,
    size = 'md',
    previewOnClick = true,
}: {
    name: string | null | undefined;
    photoUrl?: string | null;
    size?: Size;
    /** Abre a foto ampliada ao clicar (não propaga o clique da linha). */
    previewOnClick?: boolean;
}) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const displayName = (name ?? '').trim() || '—';
    const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';
    const url = photoUrl?.trim() || null;
    const dim = sizeClasses[size];
    const previewTitle = displayName !== '—' ? `Foto de ${displayName}` : 'Foto do voluntário';

    if (url) {
        const thumb = (
            <img
                src={url}
                alt=""
                className="h-full w-full rounded-full object-cover"
                loading="lazy"
                decoding="async"
            />
        );

        if (!previewOnClick) {
            return (
                <div className={`${dim} shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700`}>
                    {thumb}
                </div>
            );
        }

        return (
            <>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setPreviewOpen(true);
                    }}
                    className={`${dim} shrink-0 cursor-zoom-in rounded-full ring-1 ring-zinc-200 transition hover:ring-2 hover:ring-teal-400/80 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:ring-zinc-700 dark:hover:ring-teal-500/60`}
                    aria-label={`Ampliar ${previewTitle.toLowerCase()}`}
                    title="Clique para ampliar"
                >
                    {thumb}
                </button>
                <Modal show={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" disableBodyScroll>
                    <div className="px-4 pb-6 pt-12 text-center sm:px-6">
                        <img
                            src={url}
                            alt={previewTitle}
                            className="mx-auto max-h-[min(70vh,32rem)] w-full rounded-2xl object-contain"
                        />
                        {displayName !== '—' ? (
                            <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-200">{displayName}</p>
                        ) : null}
                    </div>
                </Modal>
            </>
        );
    }

    return (
        <div
            className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300`}
            aria-hidden
        >
            {initial}
        </div>
    );
}
