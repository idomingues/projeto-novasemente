import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { BookOpenIcon } from '@heroicons/react/24/outline';

type Row = {
    day: number;
    bookId: number;
    bookKey: string;
    bookName: string;
    chapter: number;
    completedAt: string | null;
};

interface Props {
    items: Row[];
}

export default function MobileAnoBiblicoHistory({ items }: Props) {
    return (
        <MobileLayout>
            <Head title="Ano Bíblico — Histórico" />

            <div className="space-y-6">
                <div>
                    <Link href={route('mobile.ano-biblico')} className="cursor-pointer text-sm font-semibold text-zinc-700 hover:underline dark:text-zinc-200">
                        ← Ano Bíblico
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Histórico</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Quando você concluiu cada capítulo</p>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    {items.length === 0 ? (
                        <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">Nenhum capítulo concluído ainda.</div>
                    ) : (
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {items.map((it) => {
                                const when = it.completedAt ? new Date(it.completedAt) : null;
                                return (
                                    <div key={`${it.day}:${it.bookId}:${it.chapter}:${it.completedAt ?? 'x'}`} className="flex items-center justify-between gap-4 p-4">
                                        <div className="min-w-0">
                                            <div className="font-semibold text-zinc-900 dark:text-white truncate">
                                                Dia {it.day} — {it.bookName} {it.chapter}
                                            </div>
                                            <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                                                {when ? when.toLocaleString('pt-BR') : '—'}
                                            </div>
                                        </div>
                                        <Link
                                            href={route('mobile.bible', { book: it.bookKey, chapter: it.chapter, from: 'ano-biblico', day: it.day })}
                                            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-800/40"
                                        >
                                            <BookOpenIcon className="h-5 w-5" aria-hidden />
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}

