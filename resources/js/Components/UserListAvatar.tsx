import UserPhotoPreviewOverlay from '@/Components/UserPhotoPreviewOverlay';
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
    /** Ao clicar na foto, abre visualização ampliada (não propaga o clique da linha). */
    previewOnClick?: boolean;
}) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const displayName = (name ?? '').trim() || '—';
    const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';
    const url = photoUrl?.trim() || null;
    const dim = sizeClasses[size];
    const previewLabel =
        displayName !== '—' ? `Foto de ${displayName}` : 'Foto do voluntário';

    if (url) {
        const img = (
            <img
                src={url}
                alt=""
                className="h-full w-full rounded-full object-cover"
                loading="lazy"
                decoding="async"
            />
        );

        const canPreview = previewOnClick;

        return (
            <>
                {canPreview ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewOpen(true);
                        }}
                        className={`${dim} shrink-0 cursor-zoom-in rounded-full ring-1 ring-zinc-200 transition hover:ring-2 hover:ring-teal-400/80 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:ring-zinc-700 dark:hover:ring-teal-500/60`}
                        aria-label={`Ampliar ${previewLabel.toLowerCase()}`}
                        title="Clique para ampliar"
                    >
                        {img}
                    </button>
                ) : (
                    <div className={`${dim} shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700`}>
                        {img}
                    </div>
                )}
                {previewOpen && canPreview ? (
                    <UserPhotoPreviewOverlay
                        photoUrl={url}
                        title={previewLabel}
                        onClose={() => setPreviewOpen(false)}
                    />
                ) : null}
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
