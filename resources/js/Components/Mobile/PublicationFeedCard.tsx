import { Link } from '@inertiajs/react';
import {
    BanknotesIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    FilmIcon,
    HeartIcon,
    MusicalNoteIcon,
    NewspaperIcon,
    PhotoIcon,
    PlayCircleIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import CoverWithVideoLink from '@/Components/News/CoverWithVideoLink';
import InstagramViewLink from '@/Components/News/InstagramViewLink';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';
import type { ComponentType, SVGProps } from 'react';
import { useState } from 'react';

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
    href: string;
    meta: string[];
};

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const TYPE_ICONS: Record<string, MenuIcon> = {
    news: NewspaperIcon,
    culto: FilmIcon,
    health: HeartIcon,
    charity_donation: BanknotesIcon,
    library: BookOpenIcon,
    photos: PhotoIcon,
    events: CalendarDaysIcon,
    revista: NewspaperIcon,
    acervo: PlayCircleIcon,
    musica: MusicalNoteIcon,
    donation_campaign: BanknotesIcon,
};

const TYPE_TAG_STYLES: Record<string, string> = {
    news: 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
    culto: 'bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
    health: 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200',
    charity_donation: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    library: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    photos: 'bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200',
    events: 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200',
    revista: 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
    acervo: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200',
    musica: 'bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200',
    donation_campaign: 'bg-lime-50 text-lime-900 dark:bg-lime-950/50 dark:text-lime-200',
};

const DEFAULT_TAG_STYLE = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
const DEFAULT_ICON = SparklesIcon;

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

function formatWhen(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `Hoje · ${timeStr}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Ontem · ${timeStr}`;
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function PublicationFeedTypeTag({ type, label }: { type: string; label: string }) {
    const Icon = TYPE_ICONS[type] ?? DEFAULT_ICON;
    const tone = TYPE_TAG_STYLES[type] ?? DEFAULT_TAG_STYLE;

    return (
        <span
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${tone}`}
            aria-label={`Tipo: ${label}`}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2} />
            <span className="truncate">{label}</span>
        </span>
    );
}

function stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Tipos com leitura inline no feed; os demais só navegam (sem ícone de expandir). */
const EXPANDABLE_TYPES = new Set(['news', 'health', 'revista']);

type Props = {
    item: PublicationFeedItem;
    appUrl: string;
    expanded: boolean;
    onToggle: () => void;
};

export default function PublicationFeedCard({ item, appUrl, expanded, onToggle }: Props) {
    const Icon = TYPE_ICONS[item.type] ?? DEFAULT_ICON;
    const src = imageSrc(item.image_url, appUrl);
    const meta = item.meta ?? [];
    const [coverBroken, setCoverBroken] = useState(false);
    const showCover = Boolean(src) && !coverBroken;
    const isNews = item.type === 'news' || item.type === 'health';
    const fullText = (item.body ?? item.excerpt ?? '').trim();
    const previewText = (item.excerpt || fullText).trim();
    const fullPlain = stripHtml(fullText);
    const previewPlain = stripHtml(previewText);
    const instagramUrl = item.instagram_url?.trim() || '';
    const showInstagram = Boolean(instagramUrl);
    const showOpenCta = Boolean(item.requires_open && item.href) && !showInstagram;
    const actionLabel = item.action_label || 'Abrir';
    const canExpand =
        EXPANDABLE_TYPES.has(item.type) &&
        (showInstagram || showOpenCta || fullPlain.length > 0);
    const isExpanded = canExpand && expanded;
    const navigateHref = !canExpand && item.href ? item.href : null;
    const openInstagramOnPlay = Boolean(item.cover_play_overlay) && Boolean(instagramUrl);

    const coverFrame = showCover ? (
        <div
            className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${
                isNews ? '' : 'aspect-[16/9]'
            }`}
        >
            <img
                src={src}
                alt=""
                className={
                    isNews
                        ? 'block h-auto w-full object-contain'
                        : 'h-full w-full object-cover object-top'
                }
                loading="lazy"
                decoding="async"
                onError={() => setCoverBroken(true)}
            />
            {!openInstagramOnPlay && item.cover_play_overlay ? <VideoPlayOverlay /> : null}
        </div>
    ) : null;

    const body = (
            <article
                className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white transition dark:border-zinc-800 dark:bg-zinc-900 ${
                    navigateHref
                        ? 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700'
                        : ''
                }`}
            >
                {showCover && coverFrame ? (
                    openInstagramOnPlay ? (
                        <CoverWithVideoLink
                            videoHref={instagramUrl}
                            ariaLabel="Ver vídeo no Instagram"
                            className="block w-full cursor-pointer"
                        >
                            {coverFrame}
                        </CoverWithVideoLink>
                    ) : (
                        coverFrame
                    )
                ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                        <Icon className="h-10 w-10 text-zinc-400 dark:text-zinc-500" aria-hidden strokeWidth={1.5} />
                    </div>
                )}

                <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2">
                        <PublicationFeedTypeTag type={item.type} label={item.type_label} />
                    </div>

                    <h2 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                        {item.title}
                    </h2>

                    {!isExpanded && previewText ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {previewPlain}
                        </p>
                    ) : null}

                    {!isExpanded && meta.length > 0 ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">{meta.join(' · ')}</p>
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
                                                className="max-w-full break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 [&_*]:max-w-full [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline [&_p]:mb-3 [&_p:last-child]:mb-0"
                                                dangerouslySetInnerHTML={{ __html: fullText }}
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                                {fullText}
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            Sem texto adicional nesta publicação.
                                        </p>
                                    )}

                                    {meta.length > 0 ? (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-500">{meta.join(' · ')}</p>
                                    ) : null}

                                    {showInstagram ? <InstagramViewLink href={instagramUrl} /> : null}

                                    {showOpenCta ? (
                                        <Link
                                            href={item.href}
                                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                                        >
                                            {actionLabel}
                                            <ChevronDownIcon className="h-4 w-4 -rotate-90" aria-hidden />
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {canExpand ? (
                        <div className="flex items-center justify-end pt-1">
                            <button
                                type="button"
                                onClick={onToggle}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? 'Recolher publicação' : 'Expandir publicação'}
                                title={isExpanded ? 'Recolher' : 'Expandir'}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                {isExpanded ? (
                                    <ChevronUpIcon className="h-5 w-5" aria-hidden strokeWidth={2.2} />
                                ) : (
                                    <ChevronDownIcon className="h-5 w-5" aria-hidden strokeWidth={2.2} />
                                )}
                            </button>
                        </div>
                    ) : null}
                </div>
            </article>
    );

    return (
        <li>
            {navigateHref ? (
                <Link href={navigateHref} className="block cursor-pointer">
                    {body}
                </Link>
            ) : (
                body
            )}
        </li>
    );
}

export { formatWhen, imageSrc };
