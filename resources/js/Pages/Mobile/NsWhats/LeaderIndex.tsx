import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router } from '@inertiajs/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import TextInput from '@/Components/TextInput';
import { useState } from 'react';

type Row = {
    id: number;
    headerTitle: string;
    headerSubtitle: string;
    statusLabel: string;
    lastPreview: string;
    lastActivityAt?: string | null;
    unreadCount: number;
    directedToMe?: boolean;
    ministryName?: string | null;
};

interface Props {
    filter: string;
    search: string;
    conversations: Row[];
}

const filters = [
    { key: 'all', label: 'Todas' },
    { key: 'new', label: 'Novas' },
    { key: 'unclaimed', label: 'Não assumidas' },
    { key: 'mine', label: 'Minhas' },
    { key: 'awaiting_member', label: 'Aguardando membro' },
    { key: 'awaiting_department', label: 'Aguardando depto' },
    { key: 'closed', label: 'Finalizadas' },
];

export default function LeaderIndex({ filter, search: initialSearch, conversations }: Props) {
    const [search, setSearch] = useState(initialSearch);

    return (
        <MobileLayout>
            <Head title="Fila do departamento" />
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Fila do departamento</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Mensagens enviadas ao departamento sem um líder específico — assuma e responda.
                    </p>
                    <Link
                        href={route('mobile.ns-whats.index')}
                        className="mt-2 inline-flex cursor-pointer text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                        Ir para NS Whats
                    </Link>
                </div>

                <div className="flex flex-wrap gap-1">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => router.get(route('mobile.ns-whats.leader.index'), { filter: f.key }, { preserveState: true })}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ${
                                filter === f.key
                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <label className="relative block">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <TextInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                router.get(route('mobile.ns-whats.leader.index'), { filter, q: search || undefined }, { preserveState: true });
                            }
                        }}
                        placeholder="Pesquisar membro ou assunto"
                        className="w-full rounded-xl py-2.5 pl-9"
                    />
                </label>

                {conversations.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                        Nenhuma conversa neste filtro.
                    </p>
                ) : (
                    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                        {conversations.map((c) => (
                            <li key={c.id}>
                                <Link
                                    href={route('mobile.ns-whats.leader.show', c.id)}
                                    className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="truncate font-semibold text-zinc-900 dark:text-white">{c.headerTitle}</span>
                                            <span className="text-[11px] text-zinc-400">
                                                {c.lastActivityAt
                                                    ? new Date(c.lastActivityAt).toLocaleString('pt-BR', {
                                                          day: '2-digit',
                                                          month: '2-digit',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      })
                                                    : ''}
                                            </span>
                                        </div>
                                        <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">{c.lastPreview}</p>
                                        <p className="mt-0.5 text-[11px] text-zinc-400">
                                            {c.ministryName} · {c.statusLabel}
                                            {c.directedToMe ? ' · Enviada a você' : ''}
                                        </p>
                                    </div>
                                    {c.unreadCount > 0 ? (
                                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                            {c.unreadCount}
                                        </span>
                                    ) : null}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
