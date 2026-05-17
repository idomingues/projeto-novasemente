import Modal from '@/Components/Modal';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export type AppVersionHistoryItem = {
    version: string;
    releasedAt: string | null;
    notes: string | null;
};

function formatReleasedAt(iso: string | null): string {
    if (!iso) {
        return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return '—';
    }
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AppVersionTrigger({ className = '' }: { className?: string }) {
    const { appVersion, appVersionHistory = [] } = usePage().props as {
        appVersion?: string | null;
        appVersionHistory?: AppVersionHistoryItem[];
    };
    const [open, setOpen] = useState(false);
    /** Em app nativa (Capacitor), prioridade ao versionName do pacote instalado. */
    const [nativeVersion, setNativeVersion] = useState<string | null>(null);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }
        let cancelled = false;
        App.getInfo()
            .then((i) => {
                if (!cancelled && i.version) {
                    setNativeVersion(i.version);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const displayLabel = useMemo(() => {
        if (nativeVersion) {
            return nativeVersion;
        }
        if (appVersion) {
            return appVersion;
        }
        const first = appVersionHistory[0];
        return first?.version ?? null;
    }, [appVersion, appVersionHistory, nativeVersion]);

    if (!displayLabel && appVersionHistory.length === 0) {
        return null;
    }

    const rows =
        appVersionHistory.length > 0
            ? appVersionHistory
            : displayLabel
              ? [{ version: displayLabel, releasedAt: null, notes: null }]
              : [];

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`inline-flex items-center rounded-full border border-zinc-200/90 bg-white/80 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 ${className}`}
            >
                v{displayLabel}
            </button>

            <Modal show={open} onClose={() => setOpen(false)} maxWidth="md">
                <div className="flex max-h-[min(90vh,820px)] flex-col">
                    <div className="shrink-0 px-5 pt-6 pb-1 sm:px-7 sm:pt-7">
                        <h2 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">
                            Versão do app
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">v{displayLabel}</p>
                        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                            Histórico de lançamentos e notas do que mudou em cada versão.
                        </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7">
                        {rows.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                                Ainda não há registros de versão na base de dados.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {rows.map((row, idx) => (
                                    <li
                                        key={`${row.version}-${row.releasedAt ?? 'na'}-${idx}`}
                                        className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-800/50"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
                                            <span className="font-mono text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                                                v{row.version}
                                            </span>
                                            <time
                                                dateTime={row.releasedAt ?? undefined}
                                                className="text-xs font-medium text-zinc-400 dark:text-zinc-500"
                                            >
                                                {formatReleasedAt(row.releasedAt)}
                                            </time>
                                        </div>
                                        {row.notes ? (
                                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                                                {row.notes}
                                            </p>
                                        ) : (
                                            <p className="mt-3 text-sm italic text-zinc-400 dark:text-zinc-500">
                                                Sem notas nesta versão.
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/90 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-7 sm:py-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-zinc-900 bg-white px-6 text-xs font-semibold uppercase tracking-wide text-zinc-900 transition-colors active:scale-[0.99] dark:border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:min-h-0 sm:w-auto sm:py-3"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
