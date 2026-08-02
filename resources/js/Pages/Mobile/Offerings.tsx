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
}

const SEVENME_LOGO_SRC = '/images/7me-logo.png';

function donationLinkHost(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return '';
    }
}

export default function MobileOfferings({ donation, localOffer }: Props) {
    const [copied, setCopied] = useState(false);
    const donationUrl = donation?.donation_url ?? null;
    const donationHost = donationUrl ? donationLinkHost(donationUrl) : '';
    const pixKeyForOffer = donation.pix_key?.trim() || localOffer.pixKey;
    const hasUrl = Boolean(donationUrl);
    const hasPix = Boolean(pixKeyForOffer);
    const hasOtherMethods = hasPix || hasUrl;

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
            <div className="mx-auto max-w-lg space-y-5">
                <header>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Dízimos e Pacto
                    </h1>
                </header>

                <p
                    className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400"
                    role="note"
                >
                    Valores com centavos{' '}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">,20</span>{' '}
                    (ex.: R$ 50,20) destinam a oferta ou o pacto à{' '}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">igreja local</span>.
                </p>

                {hasPix && (
                    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            Chave PIX
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
                    </section>
                )}

                {hasUrl && donationUrl && (
                    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            Outra opção
                        </p>
                        <a
                            href={donationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-zinc-50/90 px-3.5 py-3 transition hover:bg-zinc-100 active:scale-[0.99] dark:bg-zinc-950/40 dark:hover:bg-zinc-800/70"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-700">
                                <img
                                    src={SEVENME_LOGO_SRC}
                                    alt=""
                                    className="h-5 w-auto max-w-[28px] object-contain"
                                    width={28}
                                    height={20}
                                />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                    Doar pelo 7me
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                    {donationHost || 'Abrir link oficial'}
                                </span>
                            </span>
                            <ArrowTopRightOnSquareIcon
                                className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                                aria-hidden
                            />
                        </a>
                    </section>
                )}

                {!hasOtherMethods && (
                    <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        As formas de contribuição podem ser configuradas no painel da igreja.
                    </p>
                )}
            </div>
        </MobileLayout>
    );
}
