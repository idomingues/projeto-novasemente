import { Link, usePage } from '@inertiajs/react';
import {
    BanknotesIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ChartBarIcon,
    ChatBubbleOvalLeftIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    FilmIcon,
    HeartIcon as HeartOutlineIcon,
    MusicalNoteIcon,
    NewspaperIcon,
    PhotoIcon,
    PlayCircleIcon,
    ShareIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import CoverWithVideoLink from '@/Components/News/CoverWithVideoLink';
import InstagramViewLink from '@/Components/News/InstagramViewLink';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';
import PublicationCommentsSheet from '@/Components/Mobile/PublicationCommentsSheet';
import { absoluteShareUrl, shareContent } from '@/utils/shareContent';
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
    polls: ChartBarIcon,
};

const TYPE_TAG_STYLES: Record<string, string> = {
    news: 'bg-teal-50 text-teal-800 ring-teal-200/80 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-800/60',
    culto: 'bg-violet-50 text-violet-800 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/60',
    health: 'bg-rose-50 text-rose-800 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-800/60',
    charity_donation:
        'bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60',
    library:
        'bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60',
    photos:
        'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200/80 dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:ring-fuchsia-800/60',
    events:
        'bg-orange-50 text-orange-800 ring-orange-200/80 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-800/60',
    revista: 'bg-blue-50 text-blue-800 ring-blue-200/80 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-800/60',
    acervo:
        'bg-indigo-50 text-indigo-800 ring-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-800/60',
    musica:
        'bg-purple-50 text-purple-800 ring-purple-200/80 dark:bg-purple-950/50 dark:text-purple-200 dark:ring-purple-800/60',
    polls:
        'bg-cyan-50 text-cyan-900 ring-cyan-200/80 dark:bg-cyan-950/50 dark:text-cyan-200 dark:ring-cyan-800/60',
};

const DEFAULT_TAG_STYLE =
    'bg-zinc-100 text-zinc-700 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/60';
const DEFAULT_ICON = SparklesIcon;

function PublicationFeedTypeTag({ type, label }: { type: string; label: string }) {
    const Icon = TYPE_ICONS[type] ?? DEFAULT_ICON;
    const tone = TYPE_TAG_STYLES[type] ?? DEFAULT_TAG_STYLE;

    return (
        <span
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset ${tone}`}
            aria-label={`Tipo: ${label}`}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2} />
            <span className="truncate">{label}</span>
        </span>
    );
}

function formatCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 10_000) return `${(n / 1000).toFixed(1).replace('.0', '')} mil`;
    if (n < 1_000_000) return `${Math.round(n / 1000)} mil`;
    return `${(n / 1_000_000).toFixed(1).replace('.0', '')} mi`;
}

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

function formatPhotoDateTitle(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatWhen(iso: string | null): string {
    return formatRelative(iso);
}

function stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Tipos com leitura inline no feed; os demais só navegam (sem ícone de expandir). */
const EXPANDABLE_TYPES = new Set(['news', 'health', 'revista']);

/** Acima disso (~1 parágrafo), mostra o botão de expandir com efeito de folha. */
const SHORT_BODY_LIMIT = 220;

type Props = {
    item: PublicationFeedItem;
    appUrl: string;
    expanded?: boolean;
    onToggle?: () => void;
    showTypeTag?: boolean;
    /** Na página Fotos fica false; no feed de publicações permanece true. */
    commentsEnabled?: boolean;
    onEngagementChange?: (
        id: string,
        patch: { likes_count?: number; comments_count?: number; liked_by_me?: boolean },
    ) => void;
};

type PageProps = {
    auth?: { user?: { id: number } | null };
    csrf_token?: string;
};

export default function PublicationFeedCard({
    item,
    appUrl,
    expanded = false,
    onToggle,
    commentsEnabled = true,
    onEngagementChange,
}: Props) {
    const page = usePage().props as PageProps;
    const user = page.auth?.user ?? null;
    const csrf = page.csrf_token ?? '';
    const Icon = TYPE_ICONS[item.type] ?? DEFAULT_ICON;
    const src = imageSrc(item.image_url, appUrl);
    const [coverBroken, setCoverBroken] = useState(false);
    const [liked, setLiked] = useState(Boolean(item.liked_by_me));
    const [likesCount, setLikesCount] = useState(item.likes_count ?? 0);
    const [commentsCount, setCommentsCount] = useState(item.comments_count ?? 0);
    const [likeBusy, setLikeBusy] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [localExpanded, setLocalExpanded] = useState(false);
    const [shareHint, setShareHint] = useState<string | null>(null);

    useEffect(() => {
        setLiked(Boolean(item.liked_by_me));
        setLikesCount(item.likes_count ?? 0);
        setCommentsCount(item.comments_count ?? 0);
    }, [item.id, item.liked_by_me, item.likes_count, item.comments_count]);

    const showCover = Boolean(src) && !coverBroken;
    const isNews = item.type === 'news' || item.type === 'health';
    const isPhotos = item.type === 'photos';
    const fullText = (item.body ?? item.excerpt ?? '').trim();
    const previewText = (item.excerpt || fullText).trim();
    const fullPlain = stripHtml(fullText);
    const previewPlain = stripHtml(previewText);
    const instagramUrl = item.instagram_url?.trim() || '';
    const showInstagram = Boolean(instagramUrl);
    const showOpenCta = Boolean(item.requires_open && item.href) && !showInstagram;
    const actionLabel = item.action_label || 'Abrir';
    const isLongBody =
        fullPlain.length > SHORT_BODY_LIMIT || fullPlain.length > previewPlain.length + 40;
    const canExpand =
        EXPANDABLE_TYPES.has(item.type) && (showOpenCta || isLongBody);
    const isControlled = typeof onToggle === 'function';
    const isExpanded = canExpand && (isControlled ? expanded : localExpanded);
    const handleToggleExpand = () => {
        if (isControlled) {
            onToggle?.();
            return;
        }
        setLocalExpanded((current) => !current);
    };
    const openInstagramOnPlay = Boolean(item.cover_play_overlay) && Boolean(instagramUrl);
    const whenLabel = formatRelative(item.published_at);
    const photographerLabel = item.photographer_name?.trim() || '';
    const photoDateTitle = formatPhotoDateTitle(item.published_at);

    const isPolls = item.type === 'polls';
    const coverAspectClass = isNews ? '' : isPhotos ? 'aspect-[4/5]' : isPolls ? 'aspect-[16/9]' : 'aspect-square';
    const placeholderAspectClass = isPhotos ? 'aspect-[4/5]' : isPolls ? 'aspect-[16/9]' : 'aspect-square';
    const coverImageClass = isNews
        ? 'block h-auto w-full object-contain'
        : isPolls
          ? 'h-full w-full object-cover object-center'
          : 'h-full w-full object-cover object-center';

    const goLogin = () => {
        window.location.href = route('login');
    };

    const sharePublication = async () => {
        const url = absoluteShareUrl(item.href || window.location.href, appUrl);
        const title = isPhotos
            ? photoDateTitle || item.title || 'Álbum de fotos'
            : item.title || item.type_label || 'Publicação';
        const text = isPhotos
            ? photographerLabel
                ? `${title} — Fotógrafa: ${photographerLabel}`
                : title
            : title;

        const result = await shareContent({ title, text, url });
        if (result === 'copied') {
            setShareHint('Link copiado');
            window.setTimeout(() => setShareHint(null), 2000);
        }
    };

    const toggleLike = async () => {
        if (!user) {
            goLogin();
            return;
        }
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
            if (response.status === 401) {
                goLogin();
                return;
            }
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

    const coverFrame = showCover ? (
        <div className={`group relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${coverAspectClass}`}>
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
        <li className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
            <article>
                <div className="w-full">{media}</div>

                <div className="space-y-2 p-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <PublicationFeedTypeTag type={item.type} label={item.type_label} />
                        {!isPhotos && whenLabel ? (
                            <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                                · {whenLabel}
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={() => void toggleLike()}
                            disabled={likeBusy}
                            className="group inline-flex h-9 cursor-pointer items-center text-zinc-900 transition hover:bg-zinc-100/80 disabled:cursor-not-allowed dark:text-white dark:hover:bg-zinc-800/80"
                            aria-label={liked ? 'Remover curtida' : 'Curtir'}
                            aria-pressed={liked}
                        >
                            <span className="inline-flex h-9 w-9 items-center justify-center">
                                {liked ? (
                                    <HeartSolidIcon className="h-6 w-6 text-rose-500 drop-shadow-sm" aria-hidden />
                                ) : (
                                    <HeartOutlineIcon
                                        className="h-6 w-6 transition group-hover:scale-105"
                                        aria-hidden
                                        strokeWidth={1.7}
                                    />
                                )}
                            </span>
                            {likesCount > 0 ? (
                                <span className="-ml-1 pr-1.5 text-[11px] font-semibold leading-none tabular-nums tracking-tight text-zinc-600 dark:text-zinc-300">
                                    {likesCount}
                                </span>
                            ) : null}
                        </button>
                        {commentsEnabled ? (
                            <button
                                type="button"
                                onClick={() => setCommentsOpen(true)}
                                className="group inline-flex h-9 cursor-pointer items-center text-zinc-900 transition hover:bg-zinc-100/80 dark:text-white dark:hover:bg-zinc-800/80"
                                aria-label={
                                    commentsCount > 0
                                        ? `Comentários, ${commentsCount}`
                                        : 'Comentários'
                                }
                            >
                                <span className="inline-flex h-9 w-9 items-center justify-center">
                                    <ChatBubbleOvalLeftIcon
                                        className="h-6 w-6 transition group-hover:scale-105"
                                        aria-hidden
                                        strokeWidth={1.7}
                                    />
                                </span>
                                {commentsCount > 0 ? (
                                    <span className="-ml-1 pr-1.5 text-[11px] font-semibold leading-none tabular-nums tracking-tight text-zinc-600 dark:text-zinc-300">
                                        {formatCount(commentsCount)}
                                    </span>
                                ) : null}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void sharePublication()}
                            className="group inline-flex h-9 cursor-pointer items-center text-zinc-900 transition hover:bg-zinc-100/80 dark:text-white dark:hover:bg-zinc-800/80"
                            aria-label="Compartilhar"
                            title={shareHint ?? 'Compartilhar'}
                        >
                            <span className="inline-flex h-9 w-9 items-center justify-center">
                                <ShareIcon
                                    className="h-6 w-6 transition group-hover:scale-105"
                                    aria-hidden
                                    strokeWidth={1.7}
                                />
                            </span>
                            {shareHint ? (
                                <span className="-ml-1 pr-1.5 text-[11px] font-semibold leading-none tracking-tight text-emerald-700 dark:text-emerald-300">
                                    {shareHint}
                                </span>
                            ) : null}
                        </button>
                    </div>

                    {isPhotos ? (
                        <div className="space-y-1.5 pt-0.5">
                            <p className="text-[1.375rem] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white lg:text-base xl:text-[15px]">
                                {photoDateTitle || item.title}
                            </p>
                            {photographerLabel ? (
                                <p className="text-[13px] font-medium tracking-[0.04em] text-zinc-500 dark:text-zinc-400">
                                    Fotógrafa:{' '}
                                    <span className="font-semibold tracking-normal text-zinc-800 dark:text-zinc-100">
                                        {photographerLabel}
                                    </span>
                                </p>
                            ) : null}
                            {showInstagram ? (
                                <InstagramViewLink href={instagramUrl} variant="icon" className="-ml-1.5" />
                            ) : null}
                        </div>
                    ) : isPolls ? (
                        <div className="space-y-3">
                            <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-white">
                                {item.title}
                            </h2>
                            {item.href ? (
                                <Link
                                    href={item.href}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                >
                                    {actionLabel}
                                    <ChevronDownIcon className="h-3.5 w-3.5 -rotate-90" aria-hidden />
                                </Link>
                            ) : null}
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-white">
                                {item.title}
                            </h2>

                            {!canExpand && fullText ? (
                                EXPANDABLE_TYPES.has(item.type) || fullPlain.length <= SHORT_BODY_LIMIT ? (
                                    item.body_is_html ? (
                                        <div
                                            className="max-w-full break-words text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300 [&_*]:max-w-full [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline [&_p]:mb-3 [&_p:last-child]:mb-0"
                                            dangerouslySetInnerHTML={{ __html: fullText }}
                                        />
                                    ) : (
                                        <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                                            {fullPlain}
                                        </p>
                                    )
                                ) : previewPlain ? (
                                    <p className="line-clamp-2 text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                                        {previewPlain}
                                    </p>
                                ) : null
                            ) : null}

                            {canExpand && !isExpanded && previewPlain ? (
                                <p className="line-clamp-2 text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                                    {previewPlain}
                                </p>
                            ) : null}

                            {canExpand ? (
                                <div
                                    className={`publication-feed-leaf-stage grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                    }`}
                                >
                                    <div className="min-h-0 overflow-hidden">
                                        <div
                                            className={`publication-feed-leaf space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 ${
                                                isExpanded ? 'is-open' : ''
                                            }`}
                                        >
                                            {fullText ? (
                                                item.body_is_html ? (
                                                    <div
                                                        className="max-w-full break-words text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-300 [&_*]:max-w-full [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline [&_p]:mb-3 [&_p:last-child]:mb-0"
                                                        dangerouslySetInnerHTML={{ __html: fullText }}
                                                    />
                                                ) : (
                                                    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                                                        {fullText}
                                                    </p>
                                                )
                                            ) : (
                                                <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400">
                                                    Sem texto adicional nesta publicação.
                                                </p>
                                            )}

                                            {showOpenCta ? (
                                                <Link
                                                    href={item.href}
                                                    className={
                                                        item.type === 'polls'
                                                            ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
                                                            : 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-700'
                                                    }
                                                >
                                                    {actionLabel}
                                                    <ChevronDownIcon
                                                        className={`-rotate-90 ${item.type === 'polls' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
                                                        aria-hidden
                                                    />
                                                </Link>
                                            ) : null}

                                            {showInstagram ? (
                                                <InstagramViewLink href={instagramUrl} variant="icon" className="-ml-1.5" />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {showInstagram && !canExpand ? (
                                <InstagramViewLink href={instagramUrl} variant="icon" className="-ml-1.5" />
                            ) : null}
                        </div>
                    )}

                    {commentsEnabled || canExpand ? (
                        <div className="flex items-center justify-between gap-3 pt-0.5">
                            {commentsEnabled ? (
                                <button
                                    type="button"
                                    onClick={() => setCommentsOpen(true)}
                                    className="cursor-pointer text-[13px] text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                                >
                                    {commentsCount > 0 ? 'Ver comentários' : 'Adicionar um comentário…'}
                                </button>
                            ) : (
                                <span />
                            )}
                            {canExpand ? (
                                <button
                                    type="button"
                                    onClick={handleToggleExpand}
                                    aria-expanded={isExpanded}
                                    aria-label={isExpanded ? 'Recolher publicação' : 'Expandir publicação'}
                                    title={isExpanded ? 'Recolher' : 'Expandir'}
                                    className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                >
                                    {isExpanded ? (
                                        <ChevronUpIcon className="h-5 w-5" aria-hidden strokeWidth={2.2} />
                                    ) : (
                                        <ChevronDownIcon className="h-5 w-5" aria-hidden strokeWidth={2.2} />
                                    )}
                                </button>
                            ) : null}
                        </div>
                    ) : null}
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
