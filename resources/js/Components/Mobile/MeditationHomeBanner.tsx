import { Link } from '@inertiajs/react';
import { BookOpenIcon, CalendarDaysIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { DevotionalAudience } from '@/data/devotionalAudience';

export type MeditationHomeBannerData = {
    title: string;
    subtitle: string;
    verse: string;
    citation: string;
    day_label: string;
    message: string;
    cta: string;
    image_url: string;
};

type Props = {
    banner: MeditationHomeBannerData;
    appUrl?: string;
    audience?: DevotionalAudience;
};

const sunsetMask =
    'linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.85) 58%, black 68%, black 100%)';

function imageSrc(url: string, appUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

/** Quebra a mensagem em duas linhas, preferindo "com" / "para". */
function scriptMessageLines(message: string): [string, string] {
    const trimmed = message.trim();
    for (const marker of [' com ', ' para '] as const) {
        const idx = trimmed.toLowerCase().indexOf(marker);
        if (idx > 0) {
            return [trimmed.slice(0, idx), trimmed.slice(idx + 1)];
        }
    }

    const mid = Math.floor(trimmed.length / 2);
    let breakAt = trimmed.lastIndexOf(' ', mid);
    if (breakAt <= 0) {
        breakAt = trimmed.indexOf(' ', mid);
    }
    if (breakAt <= 0) {
        return [trimmed, ''];
    }

    return [trimmed.slice(0, breakAt), trimmed.slice(breakAt + 1)];
}

export default function MeditationHomeBanner({ banner, appUrl = '', audience }: Props) {
    const sunriseImage = imageSrc(banner.image_url, appUrl);
    const href = route('mobile.meditacao-diaria', audience ? { audience } : {});
    const [messageLine1, messageLine2] = scriptMessageLines(banner.message);

    return (
        <section aria-label="Meditação de hoje">
            <Link
                href={href}
                className="group relative flex w-full cursor-pointer overflow-hidden rounded-2xl bg-[#f5f1e9] text-left shadow-sm ring-1 ring-amber-900/10 transition hover:shadow-md dark:bg-emerald-950 dark:ring-emerald-800/60"
            >
                <div
                    className="absolute inset-0 bg-cover"
                    style={{
                        backgroundImage: `url("${sunriseImage}")`,
                        backgroundPosition: '58% center',
                        WebkitMaskImage: sunsetMask,
                        maskImage: sunsetMask,
                    }}
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-[66%] bg-gradient-to-r from-[#f5f1e9] from-30% via-[#f5f1e9]/92 via-52% to-transparent dark:from-emerald-950 dark:via-emerald-950/92"
                    aria-hidden
                />

                <div className="relative z-10 flex min-h-[9.5rem] w-full flex-col sm:min-h-[10.5rem] lg:min-h-[11rem]">
                    <div className="flex items-center justify-between gap-3 pl-4 pr-5 pt-3.5 sm:pl-5 sm:pr-6 sm:pt-4 lg:pl-6 lg:pr-8 lg:pt-5">
                        <p className="min-w-0 truncate text-[11px] font-medium text-emerald-800/75 dark:text-emerald-200/80 lg:text-xs">
                            {banner.subtitle}
                        </p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-medium text-[#f5f1e9] shadow-sm backdrop-blur-[2px]">
                            <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {banner.day_label}
                        </span>
                    </div>

                    <p
                        className="pointer-events-none absolute top-[48%] right-5 z-10 max-w-[48%] -translate-y-1/2 text-right font-script text-[1.2rem] leading-[1.15] tracking-wide text-[#f5f1e9] sm:right-6 sm:max-w-[44%] sm:text-[1.4rem] md:right-[16%] lg:right-8 lg:max-w-[32%] lg:text-[1.6rem] xl:right-[26%]"
                        style={{
                            textShadow:
                                '0 1px 1px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.2)',
                        }}
                    >
                        <span className="block">{messageLine1}</span>
                        {messageLine2 ? <span className="block">{messageLine2}</span> : null}
                    </p>

                    <div className="grid min-h-0 flex-1 grid-cols-2">
                        <div className="flex min-w-0 flex-col justify-between px-4 pb-3.5 pt-2 sm:px-5 sm:pb-4 lg:px-6 lg:pb-5">
                            <div className="flex min-w-0 items-start gap-2">
                                <BookOpenIcon
                                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                                    aria-hidden
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold leading-tight text-emerald-900 dark:text-emerald-100 lg:text-base">
                                        {banner.title}
                                    </p>
                                    {banner.citation ? (
                                        <p className="mt-0.5 text-[11px] font-medium text-emerald-800/70 dark:text-emerald-200/75 lg:text-xs">
                                            {banner.citation}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <span className="mt-3 inline-flex w-fit max-w-full cursor-pointer items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-amber-50/95 via-[#f8f4ec] to-emerald-50/80 px-2 py-1 text-[9px] font-semibold leading-none text-emerald-950 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_4px_12px_rgba(16,68,48,0.08)] ring-1 ring-amber-700/15 transition group-hover:-translate-y-px group-hover:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_16px_rgba(16,68,48,0.12)] group-hover:ring-amber-600/25 dark:from-emerald-900/70 dark:via-emerald-950/80 dark:to-amber-950/40 dark:text-emerald-50 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_6px_14px_rgba(0,0,0,0.25)] dark:ring-amber-400/20 dark:group-hover:ring-amber-300/30 sm:text-[10px]">
                                <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-amber-400/25 text-amber-800 ring-1 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-300/25">
                                    <BookOpenIcon className="h-2.5 w-2.5" aria-hidden strokeWidth={2.4} />
                                </span>
                                <span className="min-w-0 truncate tracking-tight">{banner.cta}</span>
                                <ChevronRightIcon
                                    className="h-3 w-3 shrink-0 text-amber-700/70 transition group-hover:translate-x-0.5 dark:text-amber-200/80"
                                    aria-hidden
                                    strokeWidth={2.25}
                                />
                            </span>
                        </div>

                        <div aria-hidden />
                    </div>
                </div>
            </Link>
        </section>
    );
}
