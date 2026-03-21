import Modal from '@/Components/Modal';
import { usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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

    const displayLabel = useMemo(() => {
        if (appVersion) {
            return appVersion;
        }
        const first = appVersionHistory[0];
        return first?.version ?? null;
    }, [appVersion, appVersionHistory]);

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
                className={`text-[10px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 underline-offset-2 hover:underline ${className}`}
            >
                v{displayLabel}
            </button>

            <Modal show={open} onClose={() => setOpen(false)} maxWidth="lg">
                <div className="p-6 text-left">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Versão do sistema
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Histórico de versões e notas de atualização.
                    </p>

                    <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                        {rows.map((row, idx) => (
                            <div
                                key={`${row.version}-${row.releasedAt ?? 'na'}-${idx}`}
                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        v{row.version}
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {formatReleasedAt(row.releasedAt)}
                                    </span>
                                </div>
                                {row.notes ? (
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                                        {row.notes}
                                    </p>
                                ) : (
                                    <p className="mt-2 text-sm italic text-zinc-400 dark:text-zinc-500">
                                        Sem notas nesta versão.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
