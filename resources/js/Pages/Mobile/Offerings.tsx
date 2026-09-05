import CampaignSevenMeContribute from '@/Components/Donations/CampaignSevenMeContribute';
import DizimoPactoStory from '@/Components/Offerings/DizimoPactoStory';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import {
    CheckIcon,
    DocumentDuplicateIcon,
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

const CENTS_DESTINATIONS = [
    { cents: '0,10', label: 'Dízimo', example: 'ex.: R$ 50,10' },
    { cents: '0,20', label: 'Oferta da igreja ou pacto', example: 'ex.: R$ 50,20' },
] as const;

function CentsDestinationHint() {
    return (
        <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Os centavos indicam o destino, em qualquer forma de contribuição.
            </p>
            <ul className="mt-2.5 space-y-2" role="list">
                {CENTS_DESTINATIONS.map((item) => (
                    <li
                        key={item.cents}
                        className="flex items-start gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800"
                    >
                        <span className="w-11 shrink-0 pt-px text-base font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                            {item.cents}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                                {item.example}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
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
            <div className="mx-auto w-full max-w-lg space-y-8 sm:max-w-2xl">
                <section className="space-y-4">
                    <header>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                            Como contribuir
                        </p>
                        <h1 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-xl">
                            Dízimo, oferta e pacto
                        </h1>
                    </header>

                    {hasAnyMethod && <CentsDestinationHint />}

                    {hasSevenMe && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {hasTithe && titheUrl ? (
                                <CampaignSevenMeContribute
                                    href={titheUrl}
                                    title="Dízimo"
                                    subtitle="Doar pelo 7me"
                                    tone="brand"
                                />
                            ) : null}
                            {hasOffering && offeringUrl ? (
                                <CampaignSevenMeContribute
                                    href={offeringUrl}
                                    title="Oferta e Pacto"
                                    subtitle="Doar pelo 7me"
                                    tone="emerald"
                                />
                            ) : null}
                        </div>
                    )}

                    {hasPix && (
                        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                Outra opção · PIX
                            </p>

                            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200/80 dark:bg-zinc-950/40 dark:ring-zinc-800">
                                <p className="min-w-0 flex-1 break-all font-mono text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-200 sm:text-sm">
                                    {pixKeyForOffer}
                                </p>
                                <button
                                    type="button"
                                    onClick={copyPix}
                                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                                        copied
                                            ? 'text-brand-700 dark:text-brand-300'
                                            : 'text-zinc-500 hover:bg-white hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
                                    }`}
                                    aria-label={copied ? 'Chave copiada' : 'Copiar chave PIX'}
                                >
                                    {copied ? (
                                        <>
                                            <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                                            Copiar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {!hasAnyMethod && (
                        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            As formas de contribuição podem ser configuradas no painel da igreja.
                        </p>
                    )}
                </section>

                <DizimoPactoStory />
            </div>
        </MobileLayout>
    );
}
