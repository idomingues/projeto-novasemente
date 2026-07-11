import AppVersionHistoryModal from '@/Components/AppVersionHistoryModal';
import { useAppVersionLabels } from '@/hooks/useAppVersionLabels';
import { usePage } from '@inertiajs/react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const OFFICIAL_LINKS: { title: string; href: string }[] = [
    { title: 'Site institucional (Brasil)', href: 'https://novasemente.org.br/' },
    { title: 'Aplicação web', href: 'https://app.novasemente.com.br/' },
];

export default function SobreOAppPanel({ className = '' }: { className?: string }) {
    const { webLabel: webVersionLabel, installedLabel } = useAppVersionLabels();
    const { appRootUrl = '' } = usePage().props as {
        appRootUrl?: string;
    };
    const rootUrl = (appRootUrl ?? '').trim();
    const [versionsOpen, setVersionsOpen] = useState(false);

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => setVersionsOpen(true)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60"
            >
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Versões</h2>
                    <div className="mt-3 space-y-2">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Web</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{webVersionLabel}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">App instalada</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{installedLabel}</span>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                        Toque para ver o que há de novo e o histórico completo.
                    </p>
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
            </button>

            <AppVersionHistoryModal
                show={versionsOpen}
                onClose={() => setVersionsOpen(false)}
                highlightLabel={webVersionLabel}
            />

            <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">URL desta instalação</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Endereço completo do ambiente em que esta sessão está rodando.
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
