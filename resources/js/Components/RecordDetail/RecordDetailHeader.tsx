import SecondaryButton from '@/Components/SecondaryButton';
import UserListAvatar from '@/Components/UserListAvatar';

export default function RecordDetailHeader({
    title,
    subtitle,
    photoUrl,
    badge,
    onClose,
}: {
    title: string;
    subtitle?: string | null;
    photoUrl?: string | null;
    badge?: string | null;
    onClose: () => void;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-white p-4 dark:border-teal-900/50 dark:from-teal-950/35 dark:via-zinc-900/80 dark:to-zinc-900/80">
            <div className="flex min-w-0 items-center gap-4">
                <UserListAvatar name={title} photoUrl={photoUrl} size="lg" previewOnClick />
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h2>
                    {subtitle ? <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p> : null}
                    {badge ? (
                        <span className="mt-1.5 inline-flex rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                            {badge}
                        </span>
                    ) : null}
                </div>
            </div>
            <SecondaryButton type="button" onClick={onClose}>
                Fechar
            </SecondaryButton>
        </div>
    );
}
