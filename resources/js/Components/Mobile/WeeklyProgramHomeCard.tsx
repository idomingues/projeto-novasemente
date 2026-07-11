import { CalendarDaysIcon, SparklesIcon } from '@heroicons/react/24/outline';

export type WeeklyProgramHomeCardData = {
    id: number;
    variant: 'sunset' | 'fixed';
    title: string;
    subtitle: string;
    time_display: string;
    day_label: string;
    message: string;
    image_url?: string | null;
    body?: string | null;
    lines?: string[] | null;
    is_next?: boolean;
};

type Props = {
    card: WeeklyProgramHomeCardData;
    appUrl?: string;
    isNext?: boolean;
};

const CREAM = '#f5f1e9';

const sunsetMask =
    'linear-gradient(to right, transparent 0%, transparent 28%, rgba(0,0,0,0.12) 38%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.85) 58%, black 68%, black 100%)';

function imageSrc(url: string, appUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

function formatTimeHero(raw: string): string {
    const clock = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (clock) {
        const hour = String(Number(clock[1]));
        return clock[2] === '00' ? `${hour}h` : `${hour}h${clock[2]}`;
    }
    return raw.trim();
}

export default function WeeklyProgramHomeCard({ card, appUrl = '', isNext = false }: Props) {
    const hasImage = Boolean(card.image_url);
    const bgImage = hasImage && card.image_url ? imageSrc(card.image_url, appUrl) : null;
    const timeHero = formatTimeHero(card.time_display);
    const body = card.body?.trim() || null;
    const lines = card.lines && card.lines.length > 0 ? card.lines : null;
    const showNextBadge = isNext || Boolean(card.is_next);

    return (
        <section
            aria-label={`${showNextBadge ? 'Próximo: ' : ''}${card.title} — ${card.day_label}`}
            className="relative flex h-full min-h-[13.5rem] w-full flex-col overflow-hidden rounded-[1.35rem] shadow-sm ring-1 ring-amber-900/10 dark:ring-amber-900/40 sm:min-h-[14.5rem]"
            style={{ backgroundColor: CREAM }}
        >
            {bgImage ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover"
                        style={{
                            backgroundImage: `url("${bgImage}")`,
                            backgroundPosition: '58% center',
                            WebkitMaskImage: sunsetMask,
                            maskImage: sunsetMask,
                        }}
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute inset-y-0 left-0 w-[72%] bg-gradient-to-r from-[#f5f1e9] from-35% via-[#f5f1e9]/94 via-58% to-transparent dark:from-amber-950/35 dark:via-amber-950/28"
                        aria-hidden
                    />
                </>
            ) : (
                <>
                    <div
                        className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-800/25"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -bottom-14 right-8 h-32 w-32 rounded-full bg-amber-100/50 blur-3xl dark:bg-amber-900/20"
                        aria-hidden
                    />
                </>
            )}

            <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${bgImage ? 'pr-[28%] sm:pr-[32%]' : ''}`}>
                <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
                    <div className="flex shrink-0 items-center justify-between gap-3">
                        {showNextBadge ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-50 dark:bg-emerald-700">
                                <SparklesIcon className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
                                Próximo
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200/80">
                                Na sequência
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800/70 dark:text-emerald-200/75">
                            <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {card.day_label}
                        </span>
                    </div>

                    <div
                        className={`grid min-h-0 flex-1 gap-4 ${
                            bgImage
                                ? 'grid-cols-1 content-start'
                                : 'grid-cols-1 content-start sm:grid-cols-[minmax(0,1.15fr)_minmax(7.5rem,0.85fr)] sm:items-start sm:gap-5'
                        }`}
                    >
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold leading-tight tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-xl">
                                {card.title}
                            </h2>

                            {body ? (
                                <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-emerald-900/75 dark:text-emerald-100/75 sm:text-sm sm:leading-relaxed">
                                    {body}
                                </p>
                            ) : null}

                            {lines ? (
                                <ul className="mt-3 space-y-1.5">
                                    {lines.slice(0, 3).map((line) => (
                                        <li
                                            key={line}
                                            className="flex items-start gap-2 text-[11px] font-semibold uppercase leading-snug tracking-wide text-emerald-900/85 dark:text-emerald-100/85"
                                        >
                                            <span
                                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400"
                                                aria-hidden
                                            />
                                            <span className="line-clamp-1">{line}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>

                        {!bgImage ? (
                            <div className="flex shrink-0 flex-col items-start justify-center self-start rounded-2xl bg-emerald-900/[0.04] px-4 py-3.5 ring-1 ring-inset ring-emerald-900/5 dark:bg-emerald-950/35 dark:ring-emerald-100/10 sm:items-end sm:px-4 sm:py-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/65 dark:text-emerald-300/70">
                                    Horário
                                </p>
                                <p
                                    className={`mt-1.5 text-right font-extrabold leading-[1.05] tracking-tight text-emerald-950 dark:text-emerald-50 ${
                                        timeHero.length > 7
                                            ? 'text-[1.55rem] sm:text-[1.75rem]'
                                            : 'text-[2rem] sm:text-[2.35rem]'
                                    }`}
                                >
                                    {timeHero}
                                </p>
                            </div>
                        ) : (
                            <div className="min-w-0 self-start">
                                <p
                                    className={`font-extrabold tabular-nums leading-none tracking-tight text-emerald-950 dark:text-emerald-50 ${
                                        timeHero.length > 5
                                            ? 'text-[1.75rem] sm:text-[2.1rem]'
                                            : 'text-[2.15rem] sm:text-[2.5rem]'
                                    }`}
                                >
                                    {timeHero}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
