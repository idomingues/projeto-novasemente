import GuestLayout from '@/Layouts/GuestLayout';
import { Head, usePage } from '@inertiajs/react';
import { ChevronRightIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon, CheckIcon, StarIcon } from '@heroicons/react/24/solid';
import { useEffect, useState, type ReactNode } from 'react';

interface Props {
    churchName: string;
    churchLogoUrl: string | null;
    iosAppStoreUrl: string;
    androidPlayStoreUrl: string;
}

type StoreHint = 'apple' | 'android' | null;

type StoreOption = {
    key: 'apple' | 'android';
    href: string;
    title: string;
    subtitle: string;
    cta: string;
    deviceLabel: string;
    icon: ReactNode;
};

const ICON_WRAP =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-950 dark:ring-zinc-700';

function AppleLogo({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.8.86-2.1 1.52-3.22 1.43-.14-1.1.4-2.25 1.16-3.06.82-.88 2.22-1.53 3.24-1.39zM20.5 17.18c-.58 1.3-.86 1.88-1.61 3.03-1.05 1.6-2.53 3.59-4.36 3.61-1.62.02-2.04-1.06-4.25-1.05-2.2.01-2.66 1.07-4.28 1.05-1.83-.02-3.23-1.82-4.28-3.41C-.1 17.3-.9 12.9.96 9.9c1.17-1.9 3.03-3.1 4.78-3.1 1.78 0 2.9 1.1 4.37 1.1 1.43 0 2.3-1.11 4.37-1.11 1.56 0 3.21.85 4.38 2.31-3.85 2.11-3.23 7.6.64 8.08z" />
        </svg>
    );
}

function PlayStoreLogo({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden>
            <path fill="#EA4335" d="M3.6 2.3c-.3.2-.5.6-.5 1.1v17.2c0 .5.2.9.5 1.1l9.4-9.7L3.6 2.3z" />
            <path fill="#FBBC04" d="M16.3 15.1 13.1 11.9 3.6 21.7c.2.1.4.2.7.2.3 0 .7-.1 1-.4l11-6.4z" />
            <path fill="#4285F4" d="M20.7 10.7 16.3 8.1 13.1 11.9l3.2 3.2 4.4-2.5c.9-.5.9-1.4 0-1.9z" />
            <path fill="#34A853" d="M13.1 11.9 16.3 8.1 5.3 1.7c-.3-.2-.7-.3-1-.3-.3 0-.5.1-.7.2l9.5 10.3z" />
        </svg>
    );
}

function useStoreHint(): StoreHint {
    const [hint, setHint] = useState<StoreHint>(null);

    useEffect(() => {
        const ua = navigator.userAgent;
        const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        if (/iPhone|iPad|iPod/i.test(ua) || iPadOs) {
            setHint('apple');
            return;
        }
        if (/Android/i.test(ua)) {
            setHint('android');
        }
    }, []);

    return hint;
}

function StoreRow({
    href,
    title,
    subtitle,
    cta,
    icon,
}: {
    href: string;
    title: string;
    subtitle: string;
    cta: string;
    icon: ReactNode;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={cta}
            className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-200/90 transition hover:bg-zinc-50 hover:ring-zinc-300 active:scale-[0.99] dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/80 dark:hover:ring-zinc-700"
        >
            <span className={ICON_WRAP}>{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>
            </span>
            <ChevronRightIcon
                className="h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-300"
                aria-hidden
            />
        </a>
    );
}

function FeaturedStoreCard({
    href,
    title,
    subtitle,
    cta,
    icon,
}: {
    href: string;
    title: string;
    subtitle: string;
    cta: string;
    icon: ReactNode;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex cursor-pointer flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-300 transition hover:ring-brand-400 active:scale-[0.99] sm:p-4 dark:bg-zinc-900 dark:ring-brand-700 dark:hover:ring-brand-500"
        >
            <span className="mb-2.5 inline-flex w-fit items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-200/80 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-800/70">
                <StarIcon className="h-3 w-3" aria-hidden />
                Recomendado
            </span>
            <span className="flex items-center gap-3">
                <span className={ICON_WRAP}>{icon}</span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>
                </span>
                <ChevronRightIcon
                    className="h-5 w-5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-zinc-600 dark:group-hover:text-brand-400"
                    aria-hidden
                />
            </span>
            <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition group-hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500">
                {cta}
                <ArrowRightIcon className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
        </a>
    );
}

export default function AppDownloadLanding({
    churchName,
    churchLogoUrl,
    iosAppStoreUrl,
    androidPlayStoreUrl,
}: Props) {
    const { defaultBrandLogoUrl } = usePage().props as { defaultBrandLogoUrl?: string };
    const logoSrc = churchLogoUrl || defaultBrandLogoUrl || '/logo-ns.png';
    const appleUrl = iosAppStoreUrl.trim();
    const playUrl = androidPlayStoreUrl.trim();
    const storeHint = useStoreHint();

    const stores: StoreOption[] = [];
    if (appleUrl) {
        stores.push({
            key: 'apple',
            href: appleUrl,
            title: 'App Store',
            subtitle: 'Para iPhone e iPad',
            cta: 'Abrir na App Store',
            deviceLabel: 'um iPhone',
            icon: <AppleLogo className="h-5 w-5 text-zinc-900 dark:text-white" />,
        });
    }
    if (playUrl) {
        stores.push({
            key: 'android',
            href: playUrl,
            title: 'Google Play',
            subtitle: 'Para Android',
            cta: 'Abrir na Google Play',
            deviceLabel: 'um Android',
            icon: <PlayStoreLogo className="h-5 w-5" />,
        });
    }

    const recommended = stores.find((store) => store.key === storeHint) ?? null;
    const ordered = recommended
        ? [recommended, ...stores.filter((store) => store.key !== recommended.key)]
        : stores;

    return (
        <GuestLayout fitViewport>
            <Head title="Baixe o app">
                <meta
                    head-key="description"
                    name="description"
                    content={`Baixe o app ${churchName} na App Store (iPhone) ou na Google Play (Android).`}
                />
            </Head>

            <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col justify-center overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:px-6 sm:py-10">
                <header className="shrink-0 text-center">
                    <img
                        src={logoSrc}
                        alt=""
                        className="mx-auto h-14 w-14 rounded-full object-cover object-center shadow-sm ring-2 ring-zinc-200/90 sm:h-20 sm:w-20 dark:ring-zinc-700 dark:invert"
                    />
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:mt-4 dark:text-zinc-400">
                        {churchName}
                    </p>
                    <h1 className="mt-1.5 text-[1.65rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:mt-2 sm:text-4xl dark:text-white">
                        Leve a {churchName} com você
                    </h1>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-zinc-500 sm:mt-3 sm:text-base dark:text-zinc-400">
                        Escolha sua loja para baixar o app gratuitamente.
                    </p>
                </header>

                {recommended ? (
                    <p className="mt-4 flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-zinc-100/90 px-3 py-2.5 text-xs font-medium text-zinc-600 sm:mt-5 sm:text-sm dark:bg-zinc-800/80 dark:text-zinc-300">
                        <DevicePhoneMobileIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                        Identificamos que você está usando {recommended.deviceLabel}
                    </p>
                ) : null}

                <div className="mt-3 grid min-h-0 gap-2.5 sm:mt-5 sm:gap-3">
                    {ordered.map((store) =>
                        store.key === recommended?.key ? (
                            <FeaturedStoreCard
                                key={store.key}
                                href={store.href}
                                title={store.title}
                                subtitle={store.subtitle}
                                cta={store.cta}
                                icon={store.icon}
                            />
                        ) : (
                            <StoreRow
                                key={store.key}
                                href={store.href}
                                title={store.title}
                                subtitle={store.subtitle}
                                cta={store.cta}
                                icon={store.icon}
                            />
                        ),
                    )}
                </div>

                <p className="mt-4 flex shrink-0 items-center justify-center gap-1.5 text-xs text-zinc-500 sm:mt-6 dark:text-zinc-400">
                    <CheckIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
                    Download gratuito
                </p>

                <p className="mt-3 shrink-0 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Ou{' '}
                    <a
                        href="https://app.novasemente.com.br/"
                        className="cursor-pointer font-medium text-brand-700 underline decoration-brand-200 underline-offset-4 transition hover:text-brand-800 dark:text-brand-300 dark:decoration-brand-800 dark:hover:text-brand-200"
                    >
                        continue no navegador
                    </a>
                </p>
            </div>
        </GuestLayout>
    );
}
