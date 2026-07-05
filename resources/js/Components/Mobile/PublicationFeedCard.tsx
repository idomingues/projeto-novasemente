import { Link } from '@inertiajs/react';
import {
    BanknotesIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ChevronRightIcon,
    FilmIcon,
    HeartIcon,
    MusicalNoteIcon,
    NewspaperIcon,
    PhotoIcon,
    PlayCircleIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
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
    prayer: PrayingHandsIcon,
    health: HeartIcon,
    charity_donation: BanknotesIcon,
    library: BookOpenIcon,
    photos: PhotoIcon,
    events: CalendarDaysIcon,
    revista: NewspaperIcon,
    talents: SparklesIcon,
    acervo: PlayCircleIcon,
    musica: MusicalNoteIcon,
    donation_campaign: BanknotesIcon,
};

const TYPE_TAG_STYLES: Record<string, string> = {
    news: 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
    culto: 'bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
    prayer: 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
    health: 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200',
    charity_donation: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    library: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    photos: 'bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200',
    events: 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200',
    revista: 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
    talents: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200',
    acervo: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200',
    musica: 'bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200',
    donation_campaign: 'bg-lime-50 text-lime-900 dark:bg-lime-950/50 dark:text-lime-200',
};

const DEFAULT_TAG_STYLE = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
const DEFAULT_ICON = SparklesIcon;
const PRAYER_COVER_TAGLINE = 'Alguém precisa da sua oração';

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

function PrayerCover({
    src,
    onError,
    showLogo,
}: {
    src: string;
    onError: () => void;
    showLogo: boolean;
}) {
    return (
        <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 bg-black px-6">
            {showLogo ? (
                <img
                    src={src}
                    alt=""
                    className="max-h-20 max-w-[55%] object-contain"
                    loading="lazy"
                    decoding="async"
                    onError={onError}
                />
            ) : (
                <PrayingHandsIcon className="h-12 w-12 text-white/70" aria-hidden />
            )}
            <p className="text-center text-sm font-medium text-white/85">{PRAYER_COVER_TAGLINE}</p>
        </div>
    );
}

type Props = {
    item: PublicationFeedItem;
    appUrl: string;
};

export default function PublicationFeedCard({ item, appUrl }: Props) {
    const Icon = TYPE_ICONS[item.type] ?? DEFAULT_ICON;
    const src = imageSrc(item.image_url, appUrl);
    const meta = item.meta ?? [];
    const [coverBroken, setCoverBroken] = useState(false);
    const showCover = Boolean(src) && !coverBroken;
    const when = formatWhen(item.published_at);
    const isPrayer = item.type === 'prayer';

    return (
        <li>
            <Link
                href={item.href}
                className="group block cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
                {isPrayer ? (
                    <PrayerCover src={src} showLogo={showCover} onError={() => setCoverBroken(true)} />
                ) : showCover ? (
                    <div className="relative aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover object-top"
                            loading="lazy"
                            decoding="async"
                            onError={() => setCoverBroken(true)}
                        />
                        {item.cover_play_overlay ? <VideoPlayOverlay /> : null}
                    </div>
                ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                        <Icon className="h-10 w-10 text-zinc-400 dark:text-zinc-500" aria-hidden strokeWidth={1.5} />
                    </div>
                )}

                <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                        <PublicationFeedTypeTag type={item.type} label={item.type_label} />
                        {when ? (
                            <p className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">{when}</p>
                        ) : null}
                    </div>

                    <h2 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                        {item.title}
                    </h2>

                    {item.excerpt ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {item.excerpt}
                        </p>
                    ) : null}

                    {meta.length > 0 ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">{meta.join(' · ')}</p>
                    ) : null}

                    <div className="flex items-center justify-end pt-1">
                        <span className="inline-flex items-center gap-0.5 text-sm text-zinc-500 transition group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                            {item.action_label || 'Abrir'}
                            <ChevronRightIcon className="h-4 w-4" aria-hidden />
                        </span>
                    </div>
                </div>
            </Link>
        </li>
    );
}

export { formatWhen, imageSrc };
