import GuestLayout from '@/Layouts/GuestLayout';
import { Head, usePage } from '@inertiajs/react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'react-qr-code';

interface Props {
    churchName: string;
    churchLogoUrl: string | null;
    iosAppStoreUrl: string;
    androidPlayStoreUrl: string;
}

type StoreHint = 'apple' | 'android' | null;

function AppleLogo({ className = 'h-6 w-6' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.8.86-2.1 1.52-3.22 1.43-.14-1.1.4-2.25 1.16-3.06.82-.88 2.22-1.53 3.24-1.39zM20.5 17.18c-.58 1.3-.86 1.88-1.61 3.03-1.05 1.6-2.53 3.59-4.36 3.61-1.62.02-2.04-1.06-4.25-1.05-2.2.01-2.66 1.07-4.28 1.05-1.83-.02-3.23-1.82-4.28-3.41C-.1 17.3-.9 12.9.96 9.9c1.17-1.9 3.03-3.1 4.78-3.1 1.78 0 2.9 1.1 4.37 1.1 1.43 0 2.3-1.11 4.37-1.11 1.56 0 3.21.85 4.38 2.31-3.85 2.11-3.23 7.6.64 8.08z" />
        </svg>
    );
}

function PlayStoreLogo({ className = 'h-6 w-6' }: { className?: string }) {
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

function StoreCard({
    href,
    title,
    subtitle,
    cta,
    icon,
    qrLabel,
    recommended,
}: {
    href: string;
    title: string;
    subtitle: string;
    cta: string;
    icon: ReactNode;
    qrLabel: string;
    recommended: boolean;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex cursor-pointer flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm ring-1 transition active:scale-[0.99] sm:flex-row sm:items-center sm:gap-6 sm:p-6 dark:bg-zinc-900 ${
                recommended
                    ? 'ring-brand-300 hover:ring-brand-400 dark:ring-brand-700 dark:hover:ring-brand-500'
                    : 'ring-zinc-200/90 hover:bg-zinc-50 hover:ring-zinc-300 dark:ring-zinc-800 dark:hover:bg-zinc-800/80 dark:hover:ring-zinc-700'
            }`}
        >
            <span className="mx-auto flex w-[128px] shrink-0 items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-zinc-200/90 sm:mx-0 md:w-[148px] lg:w-[168px] dark:ring-zinc-700">
                <QRCode
                    value={href}
                    size={168}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    aria-label={qrLabel}
                    style={{ height: 'auto', width: '100%', maxWidth: '100%' }}
                />
            </span>

            <span className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
                <span className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-950 dark:ring-zinc-700">
                        {icon}
                    </span>
                    <span className="min-w-0">
                        <span className="block text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                            {title}
                        </span>
                        <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</span>
                    </span>
                </span>

                {recommended ? (
                    <span className="mt-3 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-200/80 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-800/70">
                        Recomendado para este aparelho
                    </span>
                ) : null}

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
                    {cta}
                    <ArrowRightIcon
                        className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5"
                        aria-hidden
                    />
                </span>
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

    return (
        <GuestLayout>
            <Head title="Baixe o app">
                <meta
                    head-key="description"
                    name="description"
                    content={`Baixe o app ${churchName} na App Store (iPhone) ou na Google Play (Android).`}
                />
            </Head>

            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6 md:max-w-3xl lg:max-w-4xl lg:py-14">
                <header className="text-center">
                    <img
                        src={logoSrc}
                        alt=""
                        className="mx-auto h-20 w-20 rounded-full object-cover object-center shadow-sm ring-2 ring-zinc-200/90 sm:h-24 sm:w-24 dark:ring-zinc-700 dark:invert lg:h-28 lg:w-28"
                    />
                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                        {churchName}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl lg:text-5xl">
                        Baixe o app
                    </h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
                        Acompanhe cultos, oração, eventos e a comunidade no celular. Aponte a câmera para o QR ou toque
                        na loja do seu aparelho.
                    </p>
                </header>

                <div className="mt-8 grid gap-3 md:mt-10 md:grid-cols-2 md:gap-4">
                    {appleUrl ? (
                        <StoreCard
                            href={appleUrl}
                            title="App Store"
                            subtitle="iPhone e iPad"
                            cta="Abrir na App Store"
                            qrLabel="QR code da App Store"
                            icon={<AppleLogo className="h-6 w-6 text-zinc-900 dark:text-white" />}
                            recommended={storeHint === 'apple'}
                        />
                    ) : null}
                    {playUrl ? (
                        <StoreCard
                            href={playUrl}
                            title="Google Play"
                            subtitle="Android"
                            cta="Abrir na Google Play"
                            qrLabel="QR code da Google Play"
                            icon={<PlayStoreLogo className="h-6 w-6" />}
                            recommended={storeHint === 'android'}
                        />
                    ) : null}
                </div>

                <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Grátis na App Store e na Google Play
                </p>
            </div>
        </GuestLayout>
    );
}
