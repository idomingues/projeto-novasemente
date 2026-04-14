import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { solicitationsBackLinkClass } from '@/Pages/Mobile/Solicitations/solicitationNavClasses';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

type Row = {
    id: number;
    typeLabel: string;
    statusLabel: string;
    messageExcerpt: string;
    updatedAt: string;
    showUrl: string;
};

interface Props {
    solicitations: Row[];
    hubUrl: string;
}

export default function Mine({ solicitations, hubUrl }: Props) {
    return (
        <MobileLayout>
            <Head title="Os meus pedidos" />
            <div className="space-y-4">
                <Link href={hubUrl} className={solicitationsBackLinkClass}>
                    ← Solicitações
                </Link>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Os meus pedidos</h1>

                {solicitations.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 py-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                        Ainda não enviou nenhum pedido.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {solicitations.map((s) => (
                            <Link
                                key={s.id}
                                href={s.showUrl}
                                className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-zinc-900 dark:text-white">{s.typeLabel}</div>
                                    <div className="text-xs text-zinc-500 mt-0.5">{s.statusLabel}</div>
                                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{s.messageExcerpt}</div>
                                </div>
                                <ChevronRightIcon className="w-5 h-5 text-zinc-400 shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
