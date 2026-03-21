import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import {
    BanknotesIcon,
    DocumentDuplicateIcon,
    InformationCircleIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface DonationInfo {
    churchName: string;
    pix_key: string | null;
    donation_url: string | null;
}

interface Props {
    donation: DonationInfo | null;
}

const SEVENME_LOGO_SRC = '/images/7me-logo.png';

function donationLinkHost(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return '';
    }
}

export default function MobileOfferings({ donation }: Props) {
    const [copied, setCopied] = useState(false);

    const copyPix = () => {
        if (!donation?.pix_key) return;
        navigator.clipboard.writeText(donation.pix_key).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const donationUrl = donation?.donation_url ?? null;
    const donationHost = donationUrl ? donationLinkHost(donationUrl) : '';
    const hasUrl = Boolean(donationUrl);
    const hasPix = Boolean(donation?.pix_key);
    const hasContent = donation && (hasPix || hasUrl);

    return (
        <MobileLayout>
            <Head title="Dízimos e Ofertas" />
            <div className="space-y-6 max-w-3xl mx-auto">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Dízimos e Ofertas</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Contribua com a obra da igreja por PIX ou pela plataforma 7me.
                    </p>
                </div>

                {!hasContent ? (
                    <p className="text-zinc-500 dark:text-zinc-400 py-6 text-center">
                        Informações de ofertas e PIX ainda não foram configuradas pela igreja.
                    </p>
                ) : (
                    <div className="space-y-6">
                        {hasUrl && (
                            <div
                                className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/40 dark:to-zinc-900 dark:border-sky-900/60 p-4 sm:p-5 shadow-sm"
                                role="note"
                            >
                                <div className="flex gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/50">
                                        <InformationCircleIcon className="w-5 h-5 text-sky-700 dark:text-sky-300" />
                                    </div>
                                    <div className="min-w-0 space-y-2">
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                            Ofertas para a igreja local
                                        </p>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                            Valores com centavos &quot;,20&quot; (ex.: R$ 50,20) indicam que sua oferta será
                                            destinada à igreja local.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {donation.churchName && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{donation.churchName}</p>
                        )}

                        {hasPix && (
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm">
                                <h2 className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                    <BanknotesIcon className="w-5 h-5 text-zinc-500" />
                                    Chave PIX
                                </h2>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 break-all">
                                    {donation.pix_key}
                                </p>
                                <button
                                    type="button"
                                    onClick={copyPix}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors"
                                >
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                    {copied ? 'Copiado!' : 'Copiar chave'}
                                </button>
                            </div>
                        )}

                        {hasUrl && donationUrl && (
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                                <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex shrink-0 items-center justify-center sm:justify-start">
                                            <img
                                                src={SEVENME_LOGO_SRC}
                                                alt="7me"
                                                className="h-9 w-auto max-w-[160px] object-contain object-left"
                                                width={160}
                                                height={36}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1 text-center sm:text-left">
                                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                                Doar pelo 7me
                                            </h2>
                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                                O link abaixo abre o site oficial do{' '}
                                                <span className="font-medium text-zinc-800 dark:text-zinc-200">7me</span> em
                                                uma nova aba, onde você pode fazer dízimos e ofertas com segurança.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-5">
                                    <a
                                        href={donationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                    >
                                        <span>Abrir 7me para doar</span>
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                                    </a>
                                    {donationHost && (
                                        <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-500">
                                            Destino: {donationHost} (nova aba)
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
