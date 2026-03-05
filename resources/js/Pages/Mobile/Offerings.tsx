import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { BanknotesIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface DonationInfo {
    churchName: string;
    pix_key: string | null;
    donation_url: string | null;
}

interface Props {
    donation: DonationInfo | null;
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

    return (
        <MobileLayout>
            <Head title="Ofertas e doação" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Ofertas e doação</h1>
                {!donation || (!donation.pix_key && !donation.donation_url) ? (
                    <p className="text-zinc-500 dark:text-zinc-400 py-6 text-center">
                        Informações de ofertas e PIX ainda não foram configuradas pela igreja.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {donation.churchName && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {donation.churchName}
                            </p>
                        )}
                        {donation.pix_key && (
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
                                <h2 className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                    <BanknotesIcon className="w-5 h-5" />
                                    Chave PIX
                                </h2>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 break-all">
                                    {donation.pix_key}
                                </p>
                                <button
                                    type="button"
                                    onClick={copyPix}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium"
                                >
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                    {copied ? 'Copiado!' : 'Copiar chave'}
                                </button>
                            </div>
                        )}
                        {donation.donation_url && (
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
                                <h2 className="font-semibold text-zinc-900 dark:text-white mb-2">
                                    Link para ofertas
                                </h2>
                                <a
                                    href={donation.donation_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium"
                                >
                                    Acessar página de ofertas
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
