import Modal from '@/Components/Modal';
import { usePage } from '@inertiajs/react';

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

type Props = {
    show: boolean;
    onClose: () => void;
    /** Rótulo da versão em destaque (ex.: v1.2.3). */
    highlightLabel?: string | null;
};

export default function AppVersionHistoryModal({ show, onClose, highlightLabel = null }: Props) {
    const { appVersion, appVersionHistory = [] } = usePage().props as {
        appVersion?: string | null;
        appVersionHistory?: AppVersionHistoryItem[];
    };

    const displayLabel =
        highlightLabel?.replace(/^v/i, '') ||
        appVersion ||
        appVersionHistory[0]?.version ||
        null;

    const rows =
        appVersionHistory.length > 0
            ? appVersionHistory
            : displayLabel
              ? [{ version: displayLabel, releasedAt: null, notes: null }]
              : [];

    const latest = rows[0] ?? null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="flex max-h-[min(90vh,820px)] flex-col">
                <div className="shrink-0 px-5 pt-6 pb-1 sm:px-7 sm:pt-7">
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">
                        Versões do app
                    </h2>
                    {displayLabel ? (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Atual: v{displayLabel}</p>
                    ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7">
                    {latest?.notes ? (
                        <section className="mb-5 rounded-2xl border border-brand-200 bg-brand-50/80 p-4 dark:border-brand-800 dark:bg-brand-950/30">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                                O que há de novo
                            </p>
                            <p className="mt-1 font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                                v{latest.version}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                                {latest.notes}
                            </p>
                        </section>
                    ) : null}

                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Histórico
                    </h3>

                    {rows.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                            Ainda não há registros de versão.
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
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-full border border-zinc-900 bg-white px-6 text-xs font-semibold uppercase tracking-wide text-zinc-900 transition-colors active:scale-[0.99] dark:border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:min-h-0 sm:w-auto sm:py-3 sm:float-right"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </Modal>
    );
}
