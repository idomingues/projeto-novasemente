import { Link } from '@inertiajs/react';
import {
    AcademicCapIcon,
    BanknotesIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    FilmIcon,
    GlobeAltIcon,
    HandRaisedIcon,
    HeartIcon,
    LifebuoyIcon,
    MusicalNoteIcon,
    NewspaperIcon,
    PhotoIcon,
    PlayCircleIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export type HomeFeaturedWeekItem = {
    id: string;
    route: string;
    href: string;
    label: string;
    subtitle: string;
    feature_key: string | null;
    icon_key: string;
    source: string;
};

export type HomeFeaturedWeekPayload = {
    items: HomeFeaturedWeekItem[];
};

const ICONS: Record<string, MenuIcon> = {
    lesson: ClipboardDocumentListIcon,
    bible: BookOpenIcon,
    library: BookOpenIcon,
    culto: FilmIcon,
    events: CalendarDaysIcon,
    news: NewspaperIcon,
    health: HeartIcon,
    musica: MusicalNoteIcon,
    photos: PhotoIcon,
    acervo: PlayCircleIcon,
    revista: NewspaperIcon,
    prayer: PrayingHandsIcon,
    ano_biblico: AcademicCapIcon,
    devotional: BookOpenIcon,
    offerings: HandRaisedIcon,
    donations: BanknotesIcon,
    campaigns: BanknotesIcon,
    talents: SparklesIcon,
    mission: GlobeAltIcon,
    beliefs: SparklesIcon,
    pastors: UserGroupIcon,
    services: ClockIcon,
    sparkles: SparklesIcon,
    support: LifebuoyIcon,
};

type Props = {
    items: HomeFeaturedWeekItem[];
};

export default function HomeFeaturedWeek({ items }: Props) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canScrollMore, setCanScrollMore] = useState(false);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) {
            return;
        }

        const update = () => {
            const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft;
            setCanScrollMore(remaining > 8);
        };

        update();
        el.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            el.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [items]);

    if (items.length === 0) {
        return null;
    }

    const showMoreHint = items.length > 1;

    return (
        <section aria-label="Mais visualizados" className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                    Mais visualizados
                </p>
                {showMoreHint ? (
                    <p className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                        Deslize
                        <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.2} />
                    </p>
                ) : null}
            </div>

            <div className="relative">
                <div
                    ref={scrollerRef}
                    className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {items.map((item) => {
                        const Icon = ICONS[item.icon_key] ?? SparklesIcon;

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="group flex w-auto max-w-[11rem] shrink-0 snap-start cursor-pointer items-center gap-2.5 rounded-xl bg-zinc-900 px-3.5 py-2.5 text-left text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/12 dark:bg-zinc-900/8">
                                    <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.05} />
                                </span>
                                <span className="truncate pr-0.5 text-[12px] font-semibold leading-tight tracking-tight">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {canScrollMore ? (
                    <div
                        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-zinc-50 via-zinc-50/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80"
                        aria-hidden
                    />
                ) : null}
            </div>
        </section>
    );
}
