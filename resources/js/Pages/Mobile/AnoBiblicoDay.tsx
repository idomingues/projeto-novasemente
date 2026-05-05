import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpenIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

type ChapterRow = { bookKey: string; bookName: string; bookId: number; chapter: number };

interface Props {
    day: number;
    display: string;
    chapters: ChapterRow[];
    checked: string[]; // `${bookId}:${chapter}`
    checkedDetails: { bookId: number; chapter: number; completedAt: string | null }[];
    completedAt: string | null;
    nextDay: number | null;
    progress: { done: number; total: number; percent: number };
}

export default function MobileAnoBiblicoDay({ day, display, chapters, checked, checkedDetails, completedAt, nextDay, progress }: Props) {
    const checkedSet = new Set(checked);
    const completedAtByKey = new Map<string, string>();
    for (const d of checkedDetails) {
        if (!d.completedAt) continue;
        completedAtByKey.set(`${d.bookId}:${d.chapter}`, d.completedAt);
    }
    const allDone = progress.total > 0 && progress.done >= progress.total;
    const canFinalize = progress.total > 0 && !allDone;

    const formatCompletedAt = (iso: string) => {
        const d = new Date(iso);
        const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
        const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        // exemplo: "25 jan 2026 17:48"
        return `${date} ${time}`.replace('.', '');
    };

    const toggle = (c: ChapterRow, value: boolean) => {
        router.post(
            route('mobile.ano-biblico.toggle-chapter'),
            { day, bookId: c.bookId, chapter: c.chapter, checked: value },
            { preserveScroll: true, preserveState: false },
        );
    };

    return (
        <MobileLayout>
            <Head title={`Ano Bíblico — Dia ${day}`} />

            <div className="space-y-6">
                <div>
                    <Link href={route('mobile.ano-biblico')} className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:underline">
                        ← Ano Bíblico
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Dia {day}</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{display}</p>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Progresso do dia</div>
                            <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                                {progress.done}/{progress.total} capítulos
                            </div>
                            {completedAt ? (
                                <div className="mt-2">
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                        Concluído às {new Date(completedAt).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            disabled={!canFinalize}
                            onClick={() => {
                                if (!canFinalize) return;
                                router.post(route('mobile.ano-biblico.complete'), { day }, { preserveScroll: true, preserveState: false });
                            }}
                            className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
                                canFinalize
                                    ? 'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900'
                                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed'
                            }`}
                        >
                            <CheckCircleIcon className="h-5 w-5" aria-hidden />
                            {allDone ? 'Dia concluído' : 'Finalizar dia'}
                        </button>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            <span>Você está quase lá</span>
                            <span>{progress.percent}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress.percent}%` }} />
                        </div>
                        {!allDone ? (
                            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Marque cada capítulo conforme finalizar. Se você já leu tudo e só quer concluir rápido, use “Finalizar dia” para marcar o restante de uma vez.
                            </div>
                        ) : (
                            <div className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                Tudo marcado. Dia concluído.
                            </div>
                        )}
                    </div>
                </div>

                {nextDay ? (
                    <Link
                        href={route('mobile.ano-biblico.day', { day: nextDay })}
                        className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
                    >
                        Próximo dia
                    </Link>
                ) : null}

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    {chapters.length === 0 ? (
                        <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">Nenhum capítulo encontrado para este dia.</div>
                    ) : (
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {chapters.map((c) => {
                                const key = `${c.bookId}:${c.chapter}`;
                                const isChecked = checkedSet.has(key);
                                const capCompletedAt = completedAtByKey.get(key) ?? null;
                                return (
                                    <Link
                                        key={`${c.bookKey}:${c.chapter}`}
                                        href={route('mobile.bible', { book: c.bookKey, chapter: c.chapter, from: 'ano-biblico', day })}
                                        className="flex items-center gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggle(c, !isChecked);
                                            }}
                                            className={`h-7 w-7 flex-shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                                                isChecked
                                                    ? 'bg-emerald-700 border-emerald-700 text-white'
                                                    : 'border-zinc-300 dark:border-zinc-700 text-transparent hover:border-emerald-600'
                                            }`}
                                            aria-label={isChecked ? 'Desmarcar capítulo' : 'Marcar capítulo como lido'}
                                        >
                                            <CheckCircleIcon className="h-6 w-6" aria-hidden />
                                        </button>

                                        <div className="min-w-0 flex-1">
                                            <div className={`font-semibold truncate ${isChecked ? 'text-zinc-500 dark:text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}>
                                                {c.bookName} {c.chapter}
                                            </div>
                                            {capCompletedAt ? (
                                                <div className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                                    Concluído em {formatCompletedAt(capCompletedAt)}
                                                </div>
                                            ) : (
                                                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Abrir capítulo</div>
                                            )}
                                        </div>

                                        <BookOpenIcon className="h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}

