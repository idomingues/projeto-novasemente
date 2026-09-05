import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import {
    CheckIcon,
    ClipboardDocumentIcon,
    MapIcon,
    MapPinIcon,
    ShareIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import {
    CHURCH_ADDRESS_LINE,
    CHURCH_MAP_EMBED_URL,
    CHURCH_MAPS_SEARCH_URL,
    CHURCH_WAZE_URL,
} from '@/constants/churchLocation';
import { shareContent } from '@/utils/shareContent';
import { appToast } from '@/utils/appToast';

const actionBtnClass =
    'inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white';

export default function MobileLocation() {
    const [copied, setCopied] = useState(false);

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(CHURCH_ADDRESS_LINE);
            setCopied(true);
            appToast('Endereço copiado', 'success');
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            appToast('Não foi possível copiar o endereço.', 'error');
        }
    };

    const shareAddress = async () => {
        const result = await shareContent({
            title: 'Nova Semente',
            text: `Endereço da Nova Semente:\n${CHURCH_ADDRESS_LINE}`,
            url: CHURCH_MAPS_SEARCH_URL,
        });

        if (result === 'copied') {
            appToast('Endereço copiado', 'success');
        } else if (result === 'failed') {
            appToast('Não foi possível compartilhar.', 'error');
        }
    };

    return (
        <MobileLayout>
            <Head title="Localização" />
            <div className="space-y-5">
                <div>
                    <Link
                        href={route('mobile.conheca')}
                        className="cursor-pointer text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← Conheça a Nova Semente
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                        Localização
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Venha nos visitar no coração de São Paulo.
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                            <MapPinIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Endereço</p>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                {CHURCH_ADDRESS_LINE}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button type="button" onClick={copyAddress} className={actionBtnClass} aria-label="Copiar endereço">
                            {copied ? (
                                <CheckIcon className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                            ) : (
                                <ClipboardDocumentIcon className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                        <button
                            type="button"
                            onClick={shareAddress}
                            className={actionBtnClass}
                            aria-label="Compartilhar endereço"
                        >
                            <ShareIcon className="h-4 w-4 shrink-0" aria-hidden />
                            Compartilhar
                        </button>
                        <a
                            href={CHURCH_MAPS_SEARCH_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={actionBtnClass}
                            aria-label="Abrir no Google Maps"
                        >
                            <MapIcon className="h-4 w-4 shrink-0" aria-hidden />
                            Google Maps
                        </a>
                        <a
                            href={CHURCH_WAZE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={actionBtnClass}
                            aria-label="Abrir no Waze"
                        >
                            <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden />
                            Waze
                        </a>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-inner dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="aspect-[4/3] w-full sm:aspect-video">
                        <iframe
                            title="Mapa — Nova Semente"
                            src={CHURCH_MAP_EMBED_URL}
                            className="h-full w-full border-0 grayscale-[0.15] contrast-[1.02] dark:opacity-95 dark:grayscale-[0.3]"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
}
