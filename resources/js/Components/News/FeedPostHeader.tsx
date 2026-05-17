export interface FeedPostAuthor {
    name: string;
    photo_url?: string | null;
}

interface Props {
    author?: FeedPostAuthor | null;
    churchName: string;
    churchLogoUrl: string;
    publishedAt: string | null;
    /** Tamanho do avatar (modal admin usa menor) */
    compact?: boolean;
}

function formatFeedDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function FeedPostHeader({ author, churchName, churchLogoUrl, publishedAt, compact = false }: Props) {
    const displayName = author?.name?.trim() || churchName;
    const avatarUrl = author?.photo_url?.trim() || churchLogoUrl;
    const dateLabel = formatFeedDate(publishedAt);
    const avatarClass = compact ? 'h-8 w-8' : 'h-9 w-9';
    const showChurchSubtitle = Boolean(author?.name?.trim());

    return (
        <div className={`flex items-center gap-3 ${compact ? 'px-4 pb-3 pt-4' : 'px-4 py-3'}`}>
            <img
                src={avatarUrl}
                alt=""
                className={`${avatarClass} shrink-0 rounded-full object-cover object-center ring-1 ring-zinc-200 dark:ring-zinc-700 ${
                    !author?.photo_url ? 'dark:invert' : ''
                }`}
            />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{displayName}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {showChurchSubtitle && churchName ? (
                        <>
                            <span>{churchName}</span>
                            {dateLabel ? <span> · {dateLabel}</span> : null}
                        </>
                    ) : (
                        dateLabel
                    )}
                </p>
            </div>
        </div>
    );
}
