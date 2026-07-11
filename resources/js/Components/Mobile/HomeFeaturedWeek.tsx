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

            <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.map((item) => {
                    const Icon = ICONS[item.icon_key] ?? SparklesIcon;

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="group flex w-auto max-w-[11rem] shrink-0 snap-start cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-left text-zinc-900 ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:text-white dark:ring-zinc-700 dark:hover:bg-zinc-800"
                        >
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                                <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.05} />
                            </span>
                            <span className="truncate pr-0.5 text-[12px] font-semibold leading-tight tracking-tight">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
