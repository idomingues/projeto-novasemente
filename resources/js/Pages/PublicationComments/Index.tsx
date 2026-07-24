import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type CommentRow = {
    id: number;
    body: string;
    author_name: string;
    subject_type: string;
    subject_type_label: string;
    subject_id: number;
    feed_id: string;
    publication_title: string;
    created_at: string | null;
};

interface Props {
    comments: {
        data: CommentRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        q: string | null;
        type: string | null;
    };
    typeOptions: { value: string; label: string }[];
}

export default function PublicationCommentsIndex({ comments, filters, typeOptions }: Props) {
    const [selected, setSelected] = useState<CommentRow | null>(null);
    const [q, setQ] = useState(filters.q ?? '');
    const [type, setType] = useState(filters.type ?? '');

    const applyFilters = () => {
        router.get(
            route('publication-comments.index'),
            {
                q: q.trim() || undefined,
                type: type || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const destroy = () => {
        if (!selected) return;
        router.delete(route('publication-comments.destroy', selected.id), {
            onSuccess: () => setSelected(null),
        });
    };

    return (
        <AdminLayout>
            <Head title="Comentários das publicações" />
            <FlashMessages />
            <PageHeader title="Comentários" subtitle="Modere comentários do feed de publicações" />

            <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Buscar</label>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applyFilters();
                        }}
                        placeholder="Texto ou autor"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                </div>
                <div className="w-48">
                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Tipo</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <option value="">Todos</option>
                        {typeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <SecondaryButton type="button" onClick={applyFilters} className="cursor-pointer">
                    Filtrar
                </SecondaryButton>
            </div>

            {comments.data.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    Nenhum comentário encontrado.
                </p>
            ) : (
                <ul className="space-y-3">
                    {comments.data.map((row) => (
                        <li key={row.id}>
                            <button
                                type="button"
                                onClick={() => setSelected(row)}
                                className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                            >
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                    {row.subject_type_label} · {row.publication_title}
                                </p>
                                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">{row.body}</p>
                                <p className="mt-2 text-xs text-zinc-500">
                                    {row.author_name}
                                    {row.created_at ? ` · ${row.created_at}` : ''}
                                </p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {comments.last_page > 1 ? (
                <div className="mt-4 flex justify-center gap-2">
                    {comments.current_page > 1 ? (
                        <SecondaryButton
                            type="button"
                            className="cursor-pointer"
                            onClick={() =>
                                router.get(route('publication-comments.index'), {
                                    ...filters,
                                    page: comments.current_page - 1,
                                })
                            }
                        >
                            Anterior
                        </SecondaryButton>
                    ) : null}
                    <span className="self-center text-sm text-zinc-500">
                        Página {comments.current_page} de {comments.last_page}
                    </span>
                    {comments.current_page < comments.last_page ? (
                        <SecondaryButton
                            type="button"
                            className="cursor-pointer"
                            onClick={() =>
                                router.get(route('publication-comments.index'), {
                                    ...filters,
                                    page: comments.current_page + 1,
                                })
                            }
                        >
                            Próxima
                        </SecondaryButton>
                    ) : null}
                </div>
            ) : null}

            <Modal
                show={selected !== null}
                onClose={() => setSelected(null)}
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setSelected(null)} className="cursor-pointer">
                            Fechar
                        </SecondaryButton>
                        <PrimaryButton
                            type="button"
                            onClick={destroy}
                            className="cursor-pointer !bg-rose-600 hover:!bg-rose-500"
                        >
                            Excluir comentário
                        </PrimaryButton>
                    </div>
                }
            >
                {selected ? (
                    <div className="space-y-3 p-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Comentário</h2>
                        <p className="text-sm text-zinc-500">
                            {selected.subject_type_label} · {selected.publication_title}
                        </p>
                        <p className="text-sm text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">{selected.body}</p>
                        <p className="text-xs text-zinc-500">
                            {selected.author_name}
                            {selected.created_at ? ` · ${selected.created_at}` : ''}
                        </p>
                    </div>
                ) : null}
            </Modal>
        </AdminLayout>
    );
}
