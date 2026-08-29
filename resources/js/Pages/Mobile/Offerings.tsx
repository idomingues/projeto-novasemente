import DizimoPactoStory from '@/Components/Offerings/DizimoPactoStory';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import {
    CheckIcon,
    DocumentDuplicateIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface DonationInfo {
    churchName: string | null;
    pix_key: string | null;
    donation_url: string | null;
}

interface LocalOfferInfo {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
}

interface Props {
    donation: DonationInfo;
    localOffer: LocalOfferInfo;
    offeringUrl: string;
}

const SEVENME_LOGO_SRC = '/images/7me-logo.png';

function SevenMeCard({ href, title }: { href: string; title: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
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
            <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-zinc-900 dark:text-white">{title}</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Doar pelo 7me</span>
            </span>
            <ArrowTopRightOnSquareIcon
                className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                aria-hidden
            />
        </a>
    );
}

export default function MobileOfferings({ donation, localOffer, offeringUrl }: Props) {
    const [copied, setCopied] = useState(false);
    const titheUrl = donation?.donation_url ?? null;
    const pixKeyForOffer = donation.pix_key?.trim() || localOffer.pixKey;
    const hasTithe = Boolean(titheUrl);
    const hasOffering = Boolean(offeringUrl);
    const hasPix = Boolean(pixKeyForOffer);
    const hasSevenMe = hasTithe || hasOffering;
    const hasAnyMethod = hasSevenMe || hasPix;

    const copyPix = () => {
        if (!pixKeyForOffer) return;
        navigator.clipboard.writeText(pixKeyForOffer).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <MobileLayout>
            <Head title="Dízimos e Pacto" />
            <div className="mx-auto w-full max-w-lg space-y-6 sm:max-w-2xl">
                <DizimoPactoStory />

                <section className="space-y-4">
                    <header>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                            Como contribuir
                        </p>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                            Dízimo, oferta e pacto
                        </h2>
                    </header>

                    {hasSevenMe && (
                        <div className="grid gap-3 md:grid-cols-2">
                            {hasTithe && titheUrl && <SevenMeCard href={titheUrl} title="Dízimo" />}
                            {hasOffering && offeringUrl && <SevenMeCard href={offeringUrl} title="Oferta e Pacto" />}
                        </div>
                    )}

                    {hasPix && (
                        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                Outra opção · Chave PIX
                            </p>
                            <p className="mt-3 break-all font-mono text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100 sm:text-base">
                                {pixKeyForOffer}
                            </p>
                            <button
                                type="button"
                                onClick={copyPix}
                                className={`mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
                                    copied
                                        ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                                        : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100'
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckIcon className="h-4 w-4" strokeWidth={2.25} />
                                        Copiado
                                    </>
                                ) : (
                                    <>
                                        <DocumentDuplicateIcon className="h-4 w-4" />
                                        Copiar chave
                                    </>
                                )}
                            </button>
                            <p
                                className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400"
                                role="note"
                            >
                                Valores com centavos{' '}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">,20</span>{' '}
                                (ex.: R$ 50,20) destinam a oferta ou o pacto à{' '}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">igreja local</span>.
                            </p>
                        </div>
                    )}

                    {!hasAnyMethod && (
                        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            As formas de contribuição podem ser configuradas no painel da igreja.
                        </p>
                    )}
                </section>
            </div>
        </MobileLayout>
    );
}
