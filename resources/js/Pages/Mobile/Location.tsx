import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import {
    CHURCH_ADDRESS_LINE,
    CHURCH_MAP_EMBED_URL,
    CHURCH_MAPS_SEARCH_URL,
} from '@/constants/churchLocation';

export default function MobileLocation() {
    return (
        <MobileLayout>
            <Head title="Localização" />
            <div className="space-y-5">
                <div>
                    <Link
                        href={route('mobile.more')}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        ← Mais
                    </Link>
                    <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">Localização</h1>
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
                            <a
                                href={CHURCH_MAPS_SEARCH_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                            >
                                Abrir no Google Maps
                            </a>
                        </div>
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
