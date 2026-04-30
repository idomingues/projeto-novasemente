import InstalledAppVersion from '@/Components/InstalledAppVersion';
import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

const OFFICIAL_LINKS: { title: string; href: string }[] = [
    { title: 'Site institucional (Brasil)', href: 'https://novasemente.org.br/' },
    { title: 'Aplicação web', href: 'https://app.novasemente.com.br/' },
];

function formatVersionLabel(raw: string | null | undefined): string {
    const t = (raw ?? '').trim();
    if (!t) {
        return '—';
    }
    return t.startsWith('v') || t.startsWith('V') ? t : `v${t}`;
}

export default function SobreOAppPanel({ className = '' }: { className?: string }) {
    const { appVersion, appVersionHistory = [], appRootUrl = '' } = usePage().props as {
        appVersion?: string | null;
        appVersionHistory?: { version: string }[];
        appRootUrl?: string;
    };
    const bundleHint = typeof __APP_FRONT_BUNDLE_VERSION__ === 'string' ? __APP_FRONT_BUNDLE_VERSION__.trim() : '';
    const historyHead = appVersionHistory[0]?.version?.trim() || '';
    const webVersionRaw = (appVersion ?? '').trim() || historyHead || bundleHint;
    const webVersionLabel = useMemo(() => formatVersionLabel(webVersionRaw), [webVersionRaw]);
    const rootUrl = (appRootUrl ?? '').trim();

    return (
        <div className={className}>
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

            <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">URL desta instalação</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Endereço completo do ambiente em que esta sessão está a correr.
                </p>
                {rootUrl ? (
                    <a
                        href={rootUrl}
                        className="mt-3 block break-all text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        {rootUrl}
                    </a>
                ) : (
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">—</p>
                )}
            </section>

            <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Links oficiais</h2>
                <ul className="mt-3 space-y-3">
                    {OFFICIAL_LINKS.map((row) => (
                        <li key={row.href} className="min-w-0">
                            <a
                                href={row.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block break-all text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                            >
                                {row.href}
                            </a>
                        </li>
                    ))}
                </ul>
            </section>

            <p className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
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
    );
}
