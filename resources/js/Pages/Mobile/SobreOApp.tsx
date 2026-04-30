import MobileLayout from '@/Layouts/MobileLayout';
import InstalledAppVersion from '@/Components/InstalledAppVersion';
import { Capacitor } from '@capacitor/core';
import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

const OFFICIAL_LINKS: { title: string; href: string }[] = [
    { title: 'Aplicação (produção)', href: 'https://app.novasemente.org/' },
    { title: 'Site institucional', href: 'https://novasemente.org.br/' },
    { title: 'Site / links', href: 'https://novasemente.org/' },
];

function formatVersionLabel(raw: string | null | undefined): string {
    const t = (raw ?? '').trim();
    if (!t) {
        return '—';
    }
    return t.startsWith('v') || t.startsWith('V') ? t : `v${t}`;
}

interface Props {
    backRoute: string;
    backLabel: string;
}

export default function MobileSobreOApp({ backRoute, backLabel }: Props) {
    const { appVersion, appVersionHistory = [] } = usePage().props as {
        appVersion?: string | null;
        appVersionHistory?: { version: string }[];
    };
    const bundleHint = typeof __APP_FRONT_BUNDLE_VERSION__ === 'string' ? __APP_FRONT_BUNDLE_VERSION__.trim() : '';
    const historyHead = appVersionHistory[0]?.version?.trim() || '';
    const webVersionRaw = (appVersion ?? '').trim() || historyHead || bundleHint;
    const webVersionLabel = useMemo(() => formatVersionLabel(webVersionRaw), [webVersionRaw]);

    return (
        <MobileLayout>
            <Head title="Sobre o APP" />
            <div className="space-y-5">
                <div>
                    <Link
                        href={route(backRoute)}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        ← {backLabel}
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Sobre o APP
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Informações técnicas do app e links oficiais.
                    </p>
                </div>

                <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Versões</h2>
                    <div className="mt-3 space-y-2">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Web</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{webVersionLabel}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">App instalada</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                <InstalledAppVersion fallbackLabel={webVersionRaw || null} />
                            </span>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Plataforma</h2>
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                        {Capacitor.isNativePlatform() ? 'App (nativa)' : 'Web no navegador'}
                    </p>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Links oficiais</h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Endereços completos (toque para abrir no navegador).
                    </p>
                    <ul className="mt-3 space-y-4">
                        {OFFICIAL_LINKS.map((row) => (
                            <li key={row.href} className="min-w-0">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{row.title}</p>
                                <a
                                    href={row.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 block break-all text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                                >
                                    {row.href}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>

                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Criado por{' '}
                    <a
                        href="https://iresult.com.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-700 hover:underline dark:text-zinc-200"
                    >
                        iResult.com.br
                    </a>
                </p>
            </div>
        </MobileLayout>
    );
}
