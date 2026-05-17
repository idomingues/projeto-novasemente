export interface FeedPostAuthor {
    name: string;
    photo_url?: string | null;
}

interface Props {
    title: string;
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

function buildSubtitle(author: FeedPostAuthor | null | undefined, churchName: string, dateLabel: string): string {
    const parts: string[] = [];
    const authorName = author?.name?.trim();
    if (authorName) {
        parts.push(authorName);
    }
    if (churchName.trim()) {
        parts.push(churchName.trim());
    }
    if (dateLabel) {
        parts.push(dateLabel);
    }
    return parts.join(' · ');
}

export default function FeedPostHeader({
    title,
    author,
    churchName,
    churchLogoUrl,
    publishedAt,
    compact = false,
}: Props) {
    const headline = title.trim() || churchName;
    const avatarUrl = author?.photo_url?.trim() || churchLogoUrl;
    const dateLabel = formatFeedDate(publishedAt);
    const subtitle = buildSubtitle(author, churchName, dateLabel);
    const avatarClass = compact ? 'h-8 w-8' : 'h-9 w-9';

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
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-white">{headline}</p>
                {subtitle ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
                ) : null}
            </div>
        </div>
    );
}
