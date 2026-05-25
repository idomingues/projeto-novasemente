type Size = 'sm' | 'md';

const sizeClasses: Record<Size, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
};

export default function UserListAvatar({
    name,
    photoUrl,
    size = 'md',
}: {
    name: string | null | undefined;
    photoUrl?: string | null;
    size?: Size;
}) {
    const displayName = (name ?? '').trim() || '—';
    const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';
    const url = photoUrl?.trim() || null;
    const dim = sizeClasses[size];

    if (url) {
        return (
            <img
                src={url}
                alt=""
                className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700`}
                loading="lazy"
                decoding="async"
            />
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
