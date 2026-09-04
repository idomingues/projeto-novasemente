import UserListAvatar from '@/Components/UserListAvatar';

export type PersonIdentity = {
    name: string | null;
    email?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
};

export default function PersonListIdentity({
    name,
    email,
    phone,
    photoUrl,
    nameClassName = 'font-medium text-zinc-900 dark:text-white',
}: PersonIdentity & { nameClassName?: string }) {
    const displayName = (name ?? '').trim() || '—';
    const emailLabel = email?.trim() || '';
    const phoneLabel = phone?.trim() || '';

    return (
        <div className="flex min-w-0 items-center gap-3">
            <UserListAvatar name={displayName} photoUrl={photoUrl} size="md" />
            <div className="min-w-0">
                <div className={`truncate ${nameClassName}`}>{displayName}</div>
                {emailLabel ? (
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{emailLabel}</div>
                ) : null}
                {phoneLabel ? (
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{phoneLabel}</div>
                ) : null}
            </div>
        </div>
    );
}
