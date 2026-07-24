import { Link, usePage } from '@inertiajs/react';
import {
    BanknotesIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ChatBubbleOvalLeftIcon,
    FilmIcon,
    HeartIcon as HeartOutlineIcon,
    MusicalNoteIcon,
    NewspaperIcon,
    PhotoIcon,
    PlayCircleIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import CoverWithVideoLink from '@/Components/News/CoverWithVideoLink';
import InstagramViewLink from '@/Components/News/InstagramViewLink';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';
import PublicationCommentsSheet from '@/Components/Mobile/PublicationCommentsSheet';
import type { ComponentType, SVGProps } from 'react';
import { useEffect, useState } from 'react';

export type PublicationFeedItem = {
    id: string;
    type: string;
    type_label: string;
    type_description: string;
    action_label: string;
    title: string;
    excerpt: string;
    body?: string | null;
    body_is_html?: boolean;
    requires_open?: boolean;
    instagram_url?: string | null;
    image_url: string | null;
    cover_play_overlay?: boolean;
    published_at: string | null;
    photographer_name?: string | null;
    href: string;
    meta: string[];
    likes_count?: number;
    comments_count?: number;
    liked_by_me?: boolean;
};

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const TYPE_ICONS: Record<string, MenuIcon> = {
    news: NewspaperIcon,
    culto: FilmIcon,
    health: HeartOutlineIcon,
    charity_donation: BanknotesIcon,
    library: BookOpenIcon,
    photos: PhotoIcon,
    events: CalendarDaysIcon,
    revista: NewspaperIcon,
    acervo: PlayCircleIcon,
    musica: MusicalNoteIcon,
    donation_campaign: BanknotesIcon,
};

const DEFAULT_ICON = SparklesIcon;

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

function formatRelative(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - d.getTime()) / 1000));
    if (diffSec < 60) return 'agora';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `há ${days} d`;
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function formatPhotoDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatWhen(iso: string | null): string {
    return formatRelative(iso);
}

function stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

type Props = {
    item: PublicationFeedItem;
    appUrl: string;
    expanded?: boolean;
    onToggle?: () => void;
    showTypeTag?: boolean;
    onEngagementChange?: (
        id: string,
        patch: { likes_count?: number; comments_count?: number; liked_by_me?: boolean },
    ) => void;
};

type PageProps = {
    csrf_token?: string;
};

export default function PublicationFeedCard({ item, appUrl, onEngagementChange }: Props) {
    const page = usePage().props as PageProps;
    const csrf = page.csrf_token ?? '';
    const Icon = TYPE_ICONS[item.type] ?? DEFAULT_ICON;
    const src = imageSrc(item.image_url, appUrl);
    const [coverBroken, setCoverBroken] = useState(false);
    const [liked, setLiked] = useState(Boolean(item.liked_by_me));
    const [likesCount, setLikesCount] = useState(item.likes_count ?? 0);
    const [commentsCount, setCommentsCount] = useState(item.comments_count ?? 0);
    const [likeBusy, setLikeBusy] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [captionExpanded, setCaptionExpanded] = useState(false);

    useEffect(() => {
        setLiked(Boolean(item.liked_by_me));
        setLikesCount(item.likes_count ?? 0);
        setCommentsCount(item.comments_count ?? 0);
    }, [item.id, item.liked_by_me, item.likes_count, item.comments_count]);

    const showCover = Boolean(src) && !coverBroken;
    const isNews = item.type === 'news' || item.type === 'health';
    const isPhotos = item.type === 'photos';
    const commentsEnabled = !isPhotos;
    const previewPlain = stripHtml((item.excerpt || item.body || '').trim());
    const instagramUrl = item.instagram_url?.trim() || '';
    const openInstagramOnPlay = Boolean(item.cover_play_overlay) && Boolean(instagramUrl);
    const whenLabel = formatRelative(item.published_at);
    const photoDateLabel = formatPhotoDate(item.published_at);
    const photographerLabel = item.photographer_name?.trim() || '';

    const coverAspectClass = isNews ? '' : isPhotos ? 'aspect-[4/5]' : 'aspect-square';
    const placeholderAspectClass = isPhotos ? 'aspect-[4/5]' : 'aspect-square';
    const coverImageClass = isNews
        ? 'block h-auto w-full object-contain'
        : 'h-full w-full object-cover object-center';

    const toggleLike = async () => {
        if (likeBusy) return;

        const prevLiked = liked;
        const prevCount = likesCount;
        const nextLiked = !prevLiked;
        const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
        setLiked(nextLiked);
        setLikesCount(nextCount);
        onEngagementChange?.(item.id, { liked_by_me: nextLiked, likes_count: nextCount });
        setLikeBusy(true);

        try {
            const response = await fetch(route('mobile.publications.like', { feedId: item.id }), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            if (!response.ok) {
                setLiked(prevLiked);
                setLikesCount(prevCount);
                onEngagementChange?.(item.id, { liked_by_me: prevLiked, likes_count: prevCount });
                return;
            }
            const payload = (await response.json()) as { liked: boolean; likes_count: number };
            setLiked(payload.liked);
            setLikesCount(payload.likes_count);
            onEngagementChange?.(item.id, {
                liked_by_me: payload.liked,
                likes_count: payload.likes_count,
            });
        } catch {
            setLiked(prevLiked);
            setLikesCount(prevCount);
            onEngagementChange?.(item.id, { liked_by_me: prevLiked, likes_count: prevCount });
        } finally {
            setLikeBusy(false);
        }
    };

    const openComments = () => {
        if (!commentsEnabled) return;
        setCommentsOpen(true);
    };

    const coverFrame = showCover ? (
        <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${coverAspectClass}`}>
            <img
                src={src}
                alt=""
                className={coverImageClass}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setCoverBroken(true)}
            />
            {!openInstagramOnPlay && item.cover_play_overlay ? <VideoPlayOverlay /> : null}
        </div>
    ) : null;

    const media = showCover && coverFrame ? (
        openInstagramOnPlay ? (
            <CoverWithVideoLink
                videoHref={instagramUrl}
                ariaLabel="Ver vídeo no Instagram"
                className="block w-full cursor-pointer"
            >
                {coverFrame}
            </CoverWithVideoLink>
        ) : item.href ? (
            <Link href={item.href} className="block cursor-pointer">
                {coverFrame}
            </Link>
        ) : (
            coverFrame
        )
    ) : (
        <Link
            href={item.href || '#'}
            className={`flex cursor-pointer items-center justify-center bg-zinc-100 dark:bg-zinc-800 ${placeholderAspectClass}`}
        >
            <Icon className="h-10 w-10 text-zinc-400 dark:text-zinc-500" aria-hidden strokeWidth={1.5} />
        </Link>
    );

    return (
        <li className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-2xl sm:border sm:shadow-sm">
            <article>
                {!isPhotos ? (
                    <header className="flex items-center gap-3 px-3 py-2.5">
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-sm"
                            aria-hidden
                        >
                            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{item.type_label}</p>
                        </div>
                    </header>
                ) : null}

                {media}

                <div className="space-y-2 px-3 pb-4 pt-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void toggleLike()}
                            disabled={likeBusy}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed dark:text-white dark:hover:bg-zinc-800"
                            aria-label={liked ? 'Remover curtida' : 'Curtir'}
                            aria-pressed={liked}
                        >
                            {liked ? (
                                <HeartSolidIcon className="h-7 w-7 text-rose-500" aria-hidden />
                            ) : (
                                <HeartOutlineIcon className="h-7 w-7" aria-hidden strokeWidth={1.8} />
                            )}
                        </button>
                        {commentsEnabled ? (
                            <button
                                type="button"
                                onClick={openComments}
                                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-900 transition hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800"
                                aria-label="Comentários"
                            >
                                <ChatBubbleOvalLeftIcon className="h-7 w-7" aria-hidden strokeWidth={1.8} />
                            </button>
                        ) : null}
                    </div>

                    {likesCount > 0 ? (
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {likesCount === 1 ? '1 curtida' : `${likesCount} curtidas`}
                        </p>
                    ) : null}

                    {isPhotos ? (
                        <div className="space-y-0.5">
                            {photographerLabel ? (
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                    Fotógrafo: {photographerLabel}
                                </p>
                            ) : null}
                            {photoDateLabel ? (
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                    {photoDateLabel}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <>
                            <div className="text-sm leading-snug text-zinc-800 dark:text-zinc-100">
                                <span className="font-semibold">{item.type_label}</span>{' '}
                                <span className={captionExpanded ? '' : 'line-clamp-2'}>
                                    <span className="font-medium">{item.title}</span>
                                    {previewPlain && previewPlain !== item.title ? (
                                        <>
                                            {' '}
                                            <span className="font-normal text-zinc-600 dark:text-zinc-300">
                                                {previewPlain}
                                            </span>
                                        </>
                                    ) : null}
                                </span>
                                {previewPlain.length > 120 || item.title.length > 80 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCaptionExpanded((v) => !v)}
                                        className="ml-1 cursor-pointer text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                    >
                                        {captionExpanded ? 'menos' : 'mais'}
                                    </button>
                                ) : null}
                            </div>

                            {instagramUrl ? (
                                <div className="pt-0.5">
                                    <InstagramViewLink href={instagramUrl} />
                                </div>
                            ) : null}

                            {commentsEnabled ? (
                                commentsCount > 0 ? (
                                    <button
                                        type="button"
                                        onClick={openComments}
                                        className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                    >
                                        {commentsCount === 1
                                            ? 'Ver o comentário'
                                            : `Ver todos os ${commentsCount} comentários`}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={openComments}
                                        className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                    >
                                        Adicionar um comentário…
                                    </button>
                                )
                            ) : null}

                            {whenLabel ? (
                                <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    {whenLabel}
                                </p>
                            ) : null}
                        </>
                    )}
                </div>
            </article>

            {commentsEnabled ? (
                <PublicationCommentsSheet
                    show={commentsOpen}
                    feedId={item.id}
                    onClose={() => setCommentsOpen(false)}
                    onCountChange={(count) => {
                        setCommentsCount(count);
                        onEngagementChange?.(item.id, { comments_count: count });
                    }}
                />
            ) : null}
        </li>
    );
}

export { formatWhen, imageSrc };
