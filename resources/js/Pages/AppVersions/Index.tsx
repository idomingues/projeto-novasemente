import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, DevicePhoneMobileIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
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

type VersionRow = {
    id: number;
    version: string;
    releasedAt: string | null;
    notes: string | null;
    createdAt: string | null;
};

interface Props {
    versions: VersionRow[];
    latestVersion?: string | null;
    schemaReady?: boolean;
}

export default function AppVersionsIndex({ versions, latestVersion, schemaReady = true }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAllNotes, setShowAllNotes] = useState<Record<number, boolean>>({});

    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const { data, setData, errors, reset, clearErrors, setError } = useForm({
        version: '',
        released_at: '',
        notes: '',
    });
    const { saving, save } = useListModalSubmit({
        reloadOnly: ['versions', 'latestVersion'],
        setError,
        clearErrors,
    });
    const { syncListModalEditUrl } = useListModalEditUrl();
    const showSaveMessage = useListModalSaveMessage();

    const applyVersionToForm = useCallback(
        (v: VersionRow) => {
            // Backend envia "Y-m-d H:i:s" (espaço) ou ISO com "T"; input[type=date] exige Y-m-d.
            const releasedDate = v.releasedAt ? v.releasedAt.slice(0, 10) : '';
            setData({
                version: v.version,
                released_at: /^\d{4}-\d{2}-\d{2}$/.test(releasedDate) ? releasedDate : '',
                notes: v.notes ?? '',
            });
        },
        [setData],
    );

    const latest = latestVersion ?? versions[0]?.version ?? null;

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setSaveMessage(null);
        syncListModalEditUrl(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = useCallback(
        (v: VersionRow) => {
            setIsEditing(true);
            setEditingId(v.id);
            setSaveMessage(null);
            syncListModalEditUrl(v.id);
            applyVersionToForm(v);
            clearErrors();
            setIsModalOpen(true);
        },
        [applyVersionToForm, clearErrors, syncListModalEditUrl],
    );

    const { markSyncAfterReload } = useSyncFormAfterListReload(versions, editingId, isModalOpen, applyVersionToForm);
    useListModalFromUrl(versions, isModalOpen, editingId, openEditModal);

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
                    version: data.version,
                    released_at: data.released_at || null,
                    notes: data.notes || null,
                },
                route('app-versions.store'),
                (id) => route('app-versions.update', id),
            );
            if (!outcome.ok) return;
            if (isEditing) {
                showSaveMessage(setSaveMessage, 'Versão atualizada.');
                return;
            }
            showSaveMessage(setSaveMessage, 'Versão adicionada.');
            if (outcome.createdId) {
                markSyncAfterReload();
                setIsEditing(true);
                setEditingId(outcome.createdId);
                syncListModalEditUrl(outcome.createdId);
            }
        })();
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover versão?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('app-versions.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Versão do App" />
            <PageHeader
                title="Versão do App"
                subtitle="Cadastre novas versões e consulte o histórico (a mais recente aparece primeiro)."
                actions={
                    schemaReady ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Nova versão">
                            Nova versão
                        </AddButton>
                    ) : undefined
                }
            />

            {!schemaReady && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    A tabela <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">app_versions</code> ainda não
                    existe. Execute as migrations para ativar esta área.
                </div>
            )}

            <div className="space-y-5 pb-8 md:pb-0">
                {schemaReady && versions.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <DevicePhoneMobileIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma versão cadastrada</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">Registe a primeira versão da app.</p>
                        <AddButton variant="icon" onClick={openCreateModal} className="mt-4" title="Nova versão">
                            Nova versão
                        </AddButton>
                    </div>
                ) : schemaReady ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {versions.map((v) => {
                            const isItemLatest = latest && v.version === latest;
                            const notes = v.notes ?? '';
                            const expanded = !!showAllNotes[v.id];

                            return (
                                <Card
                                    key={v.id}
                                    className={`flex flex-col gap-4 p-4 sm:p-6 ${
                                        isItemLatest
                                            ? 'border-zinc-900 dark:border-white/50 ring-1 ring-zinc-900/10 dark:ring-white/10'
                                            : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                                    Versão {v.version}
                                                </h2>
                                                {isItemLatest && (
                                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-900 dark:bg-white/10 dark:text-white">
                                                        Última
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                <CalendarDaysIcon className="h-4 w-4 shrink-0" />
                                                <span>
                                                    Lançamento:{' '}
                                                    {v.releasedAt
                                                        ? new Date(v.releasedAt).toLocaleDateString('pt-BR')
                                                        : '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <ListCardActionRow className="shrink-0 gap-1 sm:w-auto">
                                            <ListCardIconActionButton
                                                label="Editar"
                                                icon={<PencilIcon className="h-5 w-5" />}
                                                onClick={() => openEditModal(v)}
                                            />
                                            <ListCardIconActionButton
                                                label="Excluir"
                                                icon={<TrashIcon className="h-5 w-5" />}
                                                tone="danger"
                                                onClick={() => handleDelete(v.id)}
                                            />
                                        </ListCardActionRow>
                                    </div>

                                    {notes.trim() ? (
                                        <div>
                                            <div className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                                                {expanded ? notes : notes.slice(0, 240) + (notes.length > 240 ? '…' : '')}
                                            </div>
                                            {notes.length > 240 && (
                                                <button
                                                    type="button"
                                                    className="mt-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                                    onClick={() =>
                                                        setShowAllNotes((prev) => ({ ...prev, [v.id]: !expanded }))
                                                    }
                                                >
                                                    {expanded ? 'Mostrar menos' : 'Mostrar mais'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sem notas.</p>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {schemaReady && (
                <Modal show={isModalOpen} onClose={closeModal}>
                    <form onSubmit={submit} className="p-6">
                        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar versão' : 'Nova versão'}
                        </h2>
                        {saveMessage ? (
                            <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
                                {saveMessage}
                            </p>
                        ) : null}
                        <div className="space-y-4">
                            <div>
                                <InputLabel value="Número da versão" />
                                <TextInput
                                    value={data.version}
                                    onChange={(e) => setData('version', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: 1.2.3"
                                />
                                <InputError message={errors.version} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel value="Data de lançamento (opcional)" />
                                <TextInput
                                    type="date"
                                    value={data.released_at}
                                    onChange={(e) => setData('released_at', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.released_at} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel value="Histórico / notas (opcional)" />
                                <Textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={5}
                                />
                                <InputError message={errors.notes} className="mt-1" />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-2">
                            <SecondaryButton type="button" className="flex-1" disabled={saving} onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" className="flex-1" disabled={saving}>
                                {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Cadastrar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
