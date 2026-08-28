import GuestLayout from '@/Layouts/GuestLayout';
import { Head, usePage } from '@inertiajs/react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface Props {
    churchName: string;
    churchLogoUrl: string | null;
    titheUrl: string;
    offeringUrl: string;
}

const SEVENME_LOGO_SRC = '/images/7me-logo.png';

function ContributionCard({ href, title }: { href: string; title: string }) {
    return (
        <a
            href={href}
            className="group flex cursor-pointer items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 transition hover:bg-zinc-50 hover:ring-zinc-300 active:scale-[0.99] dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/80 dark:hover:ring-zinc-700"
        >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-950 dark:ring-zinc-700">
                <img
                    src={SEVENME_LOGO_SRC}
                    alt=""
                    className="h-6 w-auto max-w-[32px] object-contain"
                    width={32}
                    height={24}
                />
            </span>
            <span className="min-w-0 flex-1 text-xl font-semibold text-zinc-900 dark:text-white">
                {title}
            </span>
            <ArrowRightIcon
                className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                aria-hidden
            />
        </a>
    );
}

export default function OfferingLanding({ churchName, churchLogoUrl, titheUrl, offeringUrl }: Props) {
    const { defaultBrandLogoUrl } = usePage().props as { defaultBrandLogoUrl?: string };
    const logoSrc = churchLogoUrl || defaultBrandLogoUrl || '/logo-ns.png';

    return (
        <GuestLayout>
            <Head title="Oferta" />
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 md:max-w-2xl">
                <header className="text-center">
                    <img
                        src={logoSrc}
                        alt=""
                        className="mx-auto h-14 w-14 rounded-full object-cover object-center dark:invert"
                    />
                    <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">{churchName}</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Como deseja contribuir?
                    </h1>
                </header>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                    <ContributionCard href={titheUrl} title="Dízimo" />
                    <ContributionCard href={offeringUrl} title="Oferta e Pacto" />
                </div>
            </div>
        </GuestLayout>
    );
}
