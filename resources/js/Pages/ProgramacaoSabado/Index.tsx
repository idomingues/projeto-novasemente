import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import { FormEventHandler, useEffect, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

interface SaturdayProgramRow {
    id: number;
    saturday_date: string | null;
    title: string | null;
    pdf_url: string | null;
    published_at: string | null;
    is_active: boolean;
    is_visible: boolean;
    is_expired: boolean;
    expires_at: string | null;
    parse_status?: string;
    parse_error?: string | null;
    schedule_item_count?: number;
    has_schedule?: boolean;
}

interface Props {
    items: SaturdayProgramRow[];
    canManage: boolean;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function statusLabel(row: SaturdayProgramRow): string {
    if (!row.is_active || row.is_expired) return 'Expirada';
    if (row.is_visible) return 'Visível no app';
    return 'Agendada';
}

function ParseBadge({ row }: { row: SaturdayProgramRow }) {
    if (row.has_schedule || row.parse_status === 'ok') {
        return (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800">
                Dados capturados
                {row.schedule_item_count ? ` · ${row.schedule_item_count}` : ''}
            </span>
        );
    }
    if (row.parse_status === 'failed') {
        return (
            <span
                className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800"
                title={row.parse_error ?? undefined}
            >
                Falha na captura
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
            Aguardando captura
        </span>
    );
}

export default function ProgramacaoSabadoIndex({ items, canManage }: Props) {
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash ?? {};
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<{
        saturday_date: string;
        title: string;
        published_at: string;
        is_active: boolean;
        pdf_file: File | null;
    }>({
        saturday_date: '',
        title: '',
        published_at: '',
        is_active: true,
        pdf_file: null,
    });

    const syncEditModalUrl = (id: number | null) => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (id != null && id > 0) {
            params.set('modal', 'edit');
            params.set('id', String(id));
        } else {
            params.delete('modal');
            params.delete('id');
        }
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next !== current) {
            window.history.replaceState({}, '', next);
        }
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        syncEditModalUrl(null);
        reset();
        setData({
            saturday_date: '',
            title: '',
            published_at: '',
            is_active: true,
            pdf_file: null,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (row: SaturdayProgramRow) => {
        setIsEditing(true);
        setEditingId(row.id);
        syncEditModalUrl(row.id);
        setData({
            saturday_date: row.saturday_date ?? '',
            title: row.title ?? '',
            published_at: row.published_at ? row.published_at.slice(0, 16) : '',
            is_active: row.is_active,
            pdf_file: null,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        syncEditModalUrl(null);
        reset();
        setEditingId(null);
        setIsEditing(false);
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('modal') !== 'edit') return;
        const id = Number(params.get('id'));
        if (Number.isNaN(id) || id <= 0) return;
        const row = items.find((r) => r.id === id);
        if (!row) return;
        if (!isModalOpen || editingId !== id) {
            openEditModal(row);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('programacao-sabado.update', editingId), {
                ...inertiaListModalSave,
                forceFormData: true,
            });
        } else {
            post(route('programacao-sabado.store'), {
                ...inertiaListModalSave,
                forceFormData: true,
                onSuccess: () => {
                    // Modal permanece aberto via redirect ?modal=edit&id=
                },
            });
        }
    };

    const handleDelete = async (row: SaturdayProgramRow) => {
        const ok = await confirmAction({
            title: 'Excluir programação?',
            text: 'O PDF será removido e deixará de aparecer no app.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('programacao-sabado.destroy', row.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Programação do sábado" />
            <div className="space-y-6">
                <PageHeader
                    title="Programação do sábado"
                    subtitle="Publique o PDF da programação. Fica visível no app até sábado às 15:00."
                    actions={
                        canManage ? (
                            <AddButton variant="label" onClick={openCreateModal}>
                                Publicar PDF
                            </AddButton>
                        ) : undefined
                    }
                />

                {(flash.success || flash.error) && (
                    <div
                        className={`rounded-xl px-4 py-3 text-sm ${
                            flash.error
                                ? 'bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900'
                                : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900'
                        }`}
                    >
                        {flash.error || flash.success}
                    </div>
                )}

                {items.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                        Nenhuma programação publicada ainda.
                    </p>
                ) : (
                    <>
                        <div className="space-y-3 md:hidden">
                            {items.map((row) => (
                                <article
                                    key={row.id}
                                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200/70 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-800/60">
                                            <DocumentTextIcon className="h-5 w-5" aria-hidden />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                                {row.title?.trim() || 'Programação do Sábado'}
                                            </p>
                                            <p className="mt-0.5 text-xs capitalize text-zinc-500 dark:text-zinc-400">
                                                {formatDate(row.saturday_date)}
                                            </p>
                                            <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                                {statusLabel(row)}
                                            </p>
                                            <div className="mt-2">
                                                <ParseBadge row={row} />
                                            </div>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <ListCardActionRow className="mt-3">
                                            <ListCardIconActionButton
                                                label="Editar"
                                                icon={<PencilIcon className="h-4 w-4" aria-hidden />}
                                                onClick={() => openEditModal(row)}
                                            />
                                            <ListCardIconActionButton
                                                label="Excluir"
                                                icon={<TrashIcon className="h-4 w-4" aria-hidden />}
                                                tone="danger"
                                                onClick={() => void handleDelete(row)}
                                            />
                                        </ListCardActionRow>
                                    )}
                                </article>
                            ))}
                        </div>

                        <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-700 md:block">
                            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                            Sábado
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                            Título
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                            Captura
                                        </th>
                                        {canManage && (
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                Ações
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {items.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-3 text-sm capitalize text-zinc-900 dark:text-zinc-100">
                                                {formatDate(row.saturday_date)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                                                {row.title?.trim() || 'Programação do Sábado'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {statusLabel(row)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <ParseBadge row={row} />
                                            </td>
                                            {canManage && (
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <ListCardIconActionButton
                                                            label="Editar"
                                                            icon={<PencilIcon className="h-4 w-4" aria-hidden />}
                                                            onClick={() => openEditModal(row)}
                                                        />
                                                        <ListCardIconActionButton
                                                            label="Excluir"
                                                            icon={<TrashIcon className="h-4 w-4" aria-hidden />}
                                                            tone="danger"
                                                            onClick={() => void handleDelete(row)}
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {isEditing ? 'Editar programação' : 'Publicar programação'}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Visível no app desde a publicação até sábado às 15:00. Os itens da programação
                        são capturados automaticamente do PDF.
                    </p>

                    <div>
                        <InputLabel htmlFor="saturday_date" value="Data do sábado" />
                        <TextInput
                            id="saturday_date"
                            type="date"
                            className="mt-1 block w-full"
                            value={data.saturday_date}
                            onChange={(e) => setData('saturday_date', e.target.value)}
                            required
                        />
                        <InputError message={errors.saturday_date} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="title" value="Título (opcional)" />
                        <TextInput
                            id="title"
                            className="mt-1 block w-full"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="Programação do Sábado"
                        />
                        <InputError message={errors.title} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="pdf_file" value={isEditing ? 'PDF (opcional ao editar)' : 'PDF'} />
                        <input
                            id="pdf_file"
                            type="file"
                            accept="application/pdf,.pdf"
                            className="mt-1 block w-full cursor-pointer text-sm text-zinc-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-800 dark:text-zinc-300 dark:file:bg-teal-950/50 dark:file:text-teal-200"
                            onChange={(e) => setData('pdf_file', e.target.files?.[0] ?? null)}
                        />
                        <InputError message={errors.pdf_file} className="mt-1" />
                    </div>

                    {isEditing && (
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <input
                                type="checkbox"
                                className="cursor-pointer rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                            />
                            Ativa
                        </label>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Fechar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing} className="cursor-pointer">
                            {processing ? 'Salvando…' : isEditing ? 'Salvar' : 'Publicar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
