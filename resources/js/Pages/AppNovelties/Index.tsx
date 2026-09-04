import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, SparklesIcon, PowerIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import InputError from '@/Components/InputError';
import { useCallback, useState, FormEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { useListModalSubmit } from '@/hooks/useListModalSubmit';
import {
    useListModalEditUrl,
    useListModalFromUrl,
    useListModalSaveMessage,
    useSyncFormAfterListReload,
} from '@/hooks/useListModalEditUrl';

const TITLE_MAX = 80;
const BODY_MAX = 280;

type NoveltyModule = {
    key: string;
    label: string;
    route: string;
};

type NoveltyRow = {
    id: number;
    title: string;
    body: string;
    module_key: string;
    module_label: string;
    route_name: string;
    is_active: boolean;
    published_at: string | null;
    created_at: string | null;
    author_name: string | null;
};

interface Props {
    novelties: NoveltyRow[];
    modules: NoveltyModule[];
    schemaReady?: boolean;
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        return '—';
    }
    return d.toLocaleDateString('pt-BR');
}

export default function AppNoveltiesIndex({ novelties, modules, schemaReady = true }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const { data, setData, errors, reset, clearErrors, setError } = useForm({
        title: '',
        body: '',
        module_key: '',
        is_active: true,
    });
    const { saving, save } = useListModalSubmit({
        reloadOnly: ['novelties', 'modules'],
        setError,
        clearErrors,
    });
    const { syncListModalEditUrl } = useListModalEditUrl();
    const showSaveMessage = useListModalSaveMessage();

    const applyRowToForm = useCallback(
        (row: NoveltyRow) => {
            setData({
                title: row.title,
                body: row.body,
                module_key: row.module_key,
                is_active: row.is_active,
            });
        },
        [setData],
    );

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setSaveMessage(null);
        syncListModalEditUrl(null);
        reset();
        setData('is_active', true);
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = useCallback(
        (row: NoveltyRow) => {
            setIsEditing(true);
            setEditingId(row.id);
            setSaveMessage(null);
            syncListModalEditUrl(row.id);
            applyRowToForm(row);
            clearErrors();
            setIsModalOpen(true);
        },
        [applyRowToForm, clearErrors, syncListModalEditUrl],
    );

    const { markSyncAfterReload } = useSyncFormAfterListReload(
        novelties,
        editingId,
        isModalOpen,
        applyRowToForm,
    );
    useListModalFromUrl(novelties, isModalOpen, editingId, openEditModal);

    const closeModal = () => {
        setIsModalOpen(false);
        setSaveMessage(null);
        syncListModalEditUrl(null);
        reset();
        setEditingId(null);
        setIsEditing(false);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        void (async () => {
            const outcome = await save(
                isEditing,
                editingId,
                {
                    title: data.title,
                    body: data.body,
                    module_key: data.module_key,
                    is_active: data.is_active,
                },
                route('app-novelties.store'),
                (id) => route('app-novelties.update', id),
            );
            if (!outcome.ok) {
                return;
            }
            if (isEditing) {
                showSaveMessage(setSaveMessage, 'Novidade atualizada.');
                return;
            }
            showSaveMessage(setSaveMessage, 'Novidade publicada.');
            if (outcome.createdId) {
                markSyncAfterReload();
                setIsEditing(true);
                setEditingId(outcome.createdId);
                syncListModalEditUrl(outcome.createdId);
            }
        })();
    };

    const handleSetActive = async (row: NoveltyRow, isActive: boolean) => {
        const ok = await confirmAction({
            title: isActive ? 'Ativar novidade?' : 'Desativar novidade?',
            text: isActive
                ? 'Ela voltará a aparecer na Home para quem ainda não viu.'
                : 'Ela deixa de aparecer na app, mas continua visível neste painel.',
            confirmButtonText: isActive ? 'Ativar' : 'Desativar',
            danger: !isActive,
            icon: 'warning',
        });
        if (!ok) {
            return;
        }
        router.patch(route('app-novelties.active', row.id), { is_active: isActive }, { preserveScroll: true });
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir novidade?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('app-novelties.destroy', id));
        }
    };

    const rowActions = (row: NoveltyRow) => (
        <ListCardActionRow className="shrink-0 gap-1 sm:w-auto">
            <ListCardIconActionButton
                label={row.is_active ? 'Desativar' : 'Ativar'}
                icon={<PowerIcon className="h-5 w-5" />}
                onClick={() => void handleSetActive(row, !row.is_active)}
            />
            <ListCardIconActionButton
                label="Editar"
                icon={<PencilIcon className="h-5 w-5" />}
                onClick={() => openEditModal(row)}
            />
            <ListCardIconActionButton
                label="Excluir"
                icon={<TrashIcon className="h-5 w-5" />}
                tone="danger"
                onClick={() => void handleDelete(row.id)}
            />
        </ListCardActionRow>
    );

    return (
        <AdminLayout>
            <Head title="Novidades do APP" />
            <PageHeader
                title="Novidades do APP"
                subtitle="Publique um aviso curto na Home, com destino a um módulo. O membro escolhe ver agora ou agora não."
                actions={
                    schemaReady ? (
                        <AddButton variant="label" onClick={openCreateModal} title="Nova novidade">
                            Nova novidade
                        </AddButton>
                    ) : undefined
                }
            />

            {!schemaReady && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    A tabela ainda não existe. Execute as migrations para ativar esta área.
                </div>
            )}

            {schemaReady && novelties.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                        <SparklesIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma novidade cadastrada</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                        Publique a primeira para avisar os membros na Home.
                    </p>
                    <AddButton variant="label" onClick={openCreateModal} className="mt-4" title="Nova novidade">
                        Nova novidade
                    </AddButton>
                </div>
            ) : schemaReady ? (
                <>
                    <ul className="space-y-3 md:hidden">
                        {novelties.map((row) => (
                            <li key={row.id}>
                                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                                                    {row.title}
                                                </h2>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                        row.is_active
                                                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {row.is_active ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{row.body}</p>
                                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                {row.module_label} · {formatDate(row.published_at)}
                                            </p>
                                        </div>
                                        {rowActions(row)}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <Card className="mt-0 hidden !p-0 overflow-hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 md:px-6">
                                            Título
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 md:px-6">
                                            Módulo
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 md:px-6">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 md:px-6">
                                            Publicada
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 md:px-6">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {novelties.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                            onClick={() => openEditModal(row)}
                                        >
                                            <td className="px-4 py-3 md:px-6">
                                                <div className="font-medium text-zinc-900 dark:text-white">{row.title}</div>
                                                <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {row.body}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 md:px-6">
                                                {row.module_label}
                                            </td>
                                            <td className="px-4 py-3 md:px-6">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        row.is_active
                                                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {row.is_active ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 md:px-6">
                                                {formatDate(row.published_at)}
                                            </td>
                                            <td
                                                className="px-4 py-3 text-right md:px-6"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {rowActions(row)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            ) : null}

            {schemaReady && (
                <Modal show={isModalOpen} onClose={closeModal}>
                    <form onSubmit={submit} className="p-6">
                        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar novidade' : 'Nova novidade'}
                        </h2>
                        {saveMessage ? (
                            <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
                                {saveMessage}
                            </p>
                        ) : null}
                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="novelty-title" value="Título" />
                                <TextInput
                                    id="novelty-title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="mt-1 block w-full"
                                    maxLength={TITLE_MAX}
                                    placeholder="Ex.: Conheça o NS Conecta"
                                />
                                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                    {data.title.length}/{TITLE_MAX}
                                </p>
                                <InputError message={errors.title} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="novelty-body" value="Texto" />
                                <Textarea
                                    id="novelty-body"
                                    value={data.body}
                                    onChange={(e) => setData('body', e.target.value)}
                                    rows={4}
                                    maxLength={BODY_MAX}
                                    placeholder="Uma frase curta sobre o que há de novo."
                                />
                                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                    {data.body.length}/{BODY_MAX}
                                </p>
                                <InputError message={errors.body} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="novelty-module" value="Módulo de destino" />
                                <SelectInput
                                    id="novelty-module"
                                    value={data.module_key}
                                    onChange={(e) => setData('module_key', e.target.value)}
                                    className="mt-1 cursor-pointer"
                                >
                                    <option value="">—</option>
                                    {modules.map((mod) => (
                                        <option key={mod.key} value={mod.key}>
                                            {mod.label}
                                        </option>
                                    ))}
                                </SelectInput>
                                <InputError message={errors.module_key} className="mt-1" />
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="novelty-active"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="cursor-pointer"
                                />
                                <InputLabel htmlFor="novelty-active" value="Ativa" className="!mb-0 cursor-pointer" />
                            </div>
                            <InputError message={errors.is_active} className="mt-1" />
                        </div>

                        <div className="mt-8 flex gap-2">
                            <SecondaryButton type="button" className="flex-1" disabled={saving} onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" className="flex-1" disabled={saving}>
                                {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Publicar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
