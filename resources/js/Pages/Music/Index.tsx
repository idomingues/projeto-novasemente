import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, MusicalNoteIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
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

interface MusicaItem {
    id: number;
    title: string;
    youtube_url: string;
    youtube_embed_url: string | null;
    youtube_thumb_url: string | null;
    published_at: string | null;
    created_at: string;
    author?: { name: string } | null;
}

interface Props {
    musicas: MusicaItem[];
    canManage: boolean;
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function MusicIndex({ musicas, canManage }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const { data, setData, errors, reset, clearErrors, setError } = useForm({
        title: '',
        youtube_url: '',
        published_at: '',
    });
    const { saving, save } = useListModalSubmit({ reloadOnly: ['musicas'], setError, clearErrors });
    const { syncListModalEditUrl } = useListModalEditUrl();
    const showSaveMessage = useListModalSaveMessage();

    const applyMusicaToForm = useCallback(
        (m: MusicaItem) => {
            setData({
                title: m.title,
                youtube_url: m.youtube_url,
                published_at: m.published_at ? m.published_at.substring(0, 16) : '',
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
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = useCallback(
        (m: MusicaItem) => {
            setIsEditing(true);
            setEditingId(m.id);
            setSaveMessage(null);
            syncListModalEditUrl(m.id);
            applyMusicaToForm(m);
            clearErrors();
            setIsModalOpen(true);
        },
        [applyMusicaToForm, clearErrors, syncListModalEditUrl],
    );

    const { markSyncAfterReload } = useSyncFormAfterListReload(musicas, editingId, isModalOpen, applyMusicaToForm);
    useListModalFromUrl(musicas, isModalOpen, editingId, openEditModal);

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
                    youtube_url: data.youtube_url,
                    published_at: data.published_at || null,
                },
                route('musica.store'),
                (id) => route('musica.update', id),
            );
            if (!outcome.ok) return;
            if (isEditing) {
                showSaveMessage(setSaveMessage, 'Música atualizada.');
                return;
            }
            showSaveMessage(setSaveMessage, 'Música adicionada.');
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
            title: 'Remover música?',
            text: 'O vídeo será removido da lista.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('musica.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Música" />
            <PageHeader
                title="Música (vídeos)"
                actions={
                    canManage ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Nova música">
                            Nova música
                        </AddButton>
                    ) : undefined
                }
            />

            <div className="w-full space-y-5">
                {musicas.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <MusicalNoteIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum vídeo de música cadastrado</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">Os vídeos do YouTube aparecerão aqui.</p>
                        {canManage && (
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                <AddButton variant="icon" onClick={openCreateModal} title="Nova música">
                                    Nova música
                                </AddButton>
                            </div>
                        )}
                    </div>
                ) : (
                    musicas.map((m) => (
                        <div
                            key={m.id}
                            className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4 p-4"
                        >
                            {m.youtube_thumb_url ? (
                                <div className="w-full sm:w-40 flex-shrink-0 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                    <img
                                        src={m.youtube_thumb_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-full sm:w-40 h-24 sm:h-40 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                    <MusicalNoteIcon className="w-10 h-10 text-zinc-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <h2 className="font-semibold text-zinc-900 dark:text-white text-lg leading-snug line-clamp-2">
                                        {m.title}
                                    </h2>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        <span>
                                            {m.published_at
                                                ? formatDate(m.published_at)
                                                : 'Rascunho'}
                                        </span>
                                        {m.author?.name && <span>• {m.author.name}</span>}
                                    </div>
                                </div>
                                {canManage && (
                                    <ListCardActionRow className="mt-3 gap-1 sm:w-auto">
                                        <ListCardIconActionButton
                                            label="Editar"
                                            icon={<PencilIcon className="h-5 w-5" />}
                                            onClick={() => openEditModal(m)}
                                        />
                                        <ListCardIconActionButton
                                            label="Excluir"
                                            icon={<TrashIcon className="h-5 w-5" />}
                                            tone="danger"
                                            onClick={() => handleDelete(m.id)}
                                        />
                                    </ListCardActionRow>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {canManage && (
            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                        {isEditing ? 'Editar música' : 'Nova música'}
                    </h2>
                    {saveMessage ? (
                        <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
                            {saveMessage}
                        </p>
                    ) : null}
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="musica_title" value="Título" />
                            <TextInput
                                id="musica_title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Deixe vazio para puxar do YouTube"
                            />
                            <InputError message={errors.title} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="youtube_url" value="URL do vídeo (YouTube)" />
                            <TextInput
                                id="youtube_url"
                                value={data.youtube_url}
                                onChange={(e) => setData('youtube_url', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                            />
                            <InputError message={errors.youtube_url} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="musica_published_at" value="Data de publicação (vazio = rascunho)" />
                            <TextInput
                                id="musica_published_at"
                                type="datetime-local"
                                value={data.published_at}
                                onChange={(e) => setData('published_at', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.published_at} className="mt-1" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={saving}>
                            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Publicar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
            )}
        </AdminLayout>
    );
}
