import UserListAvatar from '@/Components/UserListAvatar';

export type PersonIdentity = {
    name: string | null;
    email?: string | null;
    photoUrl?: string | null;
};

export default function PersonListIdentity({
    name,
    email,
    photoUrl,
    nameClassName = 'font-medium text-zinc-900 dark:text-white',
}: PersonIdentity & { nameClassName?: string }) {
    const displayName = (name ?? '').trim() || '—';

    return (
        <div className="flex min-w-0 items-center gap-3">
            <UserListAvatar name={displayName} photoUrl={photoUrl} size="md" />
            <div className="min-w-0">
                <div className={`truncate ${nameClassName}`}>{displayName}</div>
                {email?.trim() ? (
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{email.trim()}</div>
                ) : null}
            </div>
        </div>
    );
}
