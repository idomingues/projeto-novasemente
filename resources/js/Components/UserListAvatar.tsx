import { PhotoPreviewButton } from '@/Components/PhotoPreview';

type Size = 'sm' | 'md' | 'lg';

const sizeClasses: Record<Size, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-20 w-20 text-lg',
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
    const displayName = (name ?? '').trim() || '—';
    const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';
    const url = photoUrl?.trim() || null;
    const dim = sizeClasses[size];

    if (url && previewOnClick) {
        return (
            <PhotoPreviewButton
                photoUrl={url}
                name={displayName !== '—' ? displayName : null}
                className={`${dim} shrink-0 rounded-full ${
                    size === 'lg'
                        ? 'ring-2 ring-white shadow-sm dark:ring-zinc-800'
                        : 'ring-1 ring-zinc-200 dark:ring-zinc-700'
                }`}
                imageClassName="h-full w-full rounded-full object-cover"
            />
        );
    }

    if (url) {
        return (
            <div className={`${dim} shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700`}>
                <img src={url} alt="" className="h-full w-full rounded-full object-cover" loading="lazy" decoding="async" />
            </div>
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
