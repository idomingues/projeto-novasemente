import { CalendarDaysIcon, HeartIcon } from '@heroicons/react/24/outline';

export type SabbathHomeBannerData = {
    variant: 'friday' | 'saturday';
    title: string;
    subtitle: string;
    sunset_at: string;
    sunset_time: string;
    day_label: string;
    message: string;
    image_url: string;
};

type Props = {
    banner: SabbathHomeBannerData;
    appUrl?: string;
};

const CREAM = '#f5f1e9';

const sunsetMask =
    'linear-gradient(to right, transparent 0%, transparent 34%, rgba(0,0,0,0.18) 44%, rgba(0,0,0,0.55) 52%, black 64%, black 100%)';

function imageSrc(url: string, appUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

export default function SabbathHomeBanner({ banner, appUrl = '' }: Props) {
    const sunsetImage = imageSrc(banner.image_url, appUrl);

    return (
        <section
            aria-label={banner.variant === 'friday' ? 'Início do sábado' : 'Sábado sagrado'}
            className="relative w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-amber-900/10 dark:ring-amber-900/40"
            style={{ backgroundColor: CREAM }}
        >
            <div
                className="absolute inset-0 bg-cover bg-right"
                style={{
                    backgroundImage: `url("${sunsetImage}")`,
                    WebkitMaskImage: sunsetMask,
                    maskImage: sunsetMask,
                }}
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-[#f5f1e9] from-35% via-[#f5f1e9]/88 via-55% to-transparent dark:from-amber-950/30 dark:via-amber-950/25"
                aria-hidden
            />

            <div className="relative z-10 grid min-h-[9.5rem] grid-cols-2 sm:min-h-[10.5rem] lg:min-h-[11rem]">
                <div className="flex min-w-0 flex-col justify-between px-4 py-3.5 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
                    <div className="min-w-0">
                        <div className="flex items-start gap-2">
                            <CalendarDaysIcon
                                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                                aria-hidden
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold leading-tight text-emerald-900 dark:text-emerald-100 lg:text-base">
                                    {banner.title}
                                </p>
                                <p className="mt-0.5 text-[11px] font-medium text-emerald-800/75 dark:text-emerald-200/80 lg:text-xs">
                                    {banner.subtitle}
                                </p>
                            </div>
                        </div>

                        <p className="mt-2 text-[2rem] font-extrabold tabular-nums leading-none tracking-tight text-emerald-900 dark:text-emerald-50 sm:text-[2.35rem] lg:text-[2.5rem]">
                            {banner.sunset_time}
                        </p>

                        <p className="mt-2 text-[11px] font-medium text-emerald-900/70 dark:text-emerald-100/75 lg:text-xs">
                            {banner.day_label}
                        </p>
                    </div>

                    <div className="mt-3 inline-flex w-fit max-w-full items-center gap-1.5 self-start rounded-full bg-emerald-100/90 px-2.5 py-1.5 text-[10px] font-semibold leading-snug text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-50 lg:text-[11px]">
                        <HeartIcon className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                        <span>{banner.message}</span>
                    </div>
                </div>

                <div aria-hidden className="min-h-[9.5rem] sm:min-h-[10.5rem] lg:min-h-[11rem]" />
            </div>
        </section>
    );
}
