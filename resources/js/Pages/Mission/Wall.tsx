import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDaysIcon, CameraIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useMemo, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';

type WallAlbumRow = {
    id: number;
    title: string;
    photographer_name: string | null;
    drive_folder_url: string;
    drive_folder_id: string | null;
    drive_embed_url: string | null;
    drive_view_url: string | null;
    cover_image_url: string | null;
    auto_cover_url: string | null;
    sort_order: number;
    published_at: string | null;
    is_published: boolean;
    author?: { name: string } | null;
};

interface Props {
    items: WallAlbumRow[];
    canManage: boolean;
    hasDriveApiKey: boolean;
}

function formatDate(iso: string | null): string {
    if (!iso) return 'Rascunho';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function MissionWallAdmin({ items, canManage, hasDriveApiKey }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [coverCompressing, setCoverCompressing] = useState(false);
    const [coverCompressError, setCoverCompressError] = useState<string | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        title: '',
        photographer_name: '',
        drive_folder_url: '',
        cover_image_url: '',
        cover_image_file: null as File | null,
        published_at: '',
        sort_order: '0',
    });

    const albums = useMemo(() => items, [items]);

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        setData((prev) => ({
            ...prev,
            title: 'Missão',
            sort_order: String(albums.length),
        }));
        clearErrors();
        setCoverCompressing(false);
        setCoverCompressError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (a: WallAlbumRow) => {
        setIsEditing(true);
        setEditingId(a.id);
        setData({
            title: a.title,
            photographer_name: a.photographer_name ?? '',
            drive_folder_url: a.drive_folder_url,
            cover_image_url: a.cover_image_url ?? '',
            cover_image_file: null,
            published_at: a.published_at ? a.published_at.substring(0, 16) : '',
            sort_order: String(a.sort_order),
        });
        clearErrors();
        setCoverCompressing(false);
        setCoverCompressError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setEditingId(null);
        setCoverCompressing(false);
        setCoverCompressError(null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('mission.content.wall.update', editingId), { ...inertiaListModalSave, forceFormData: true });
        } else {
            post(route('mission.content.wall.store'), { ...inertiaListModalSave, forceFormData: true });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover álbum?',
            text: 'O álbum será removido do mural no app.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('mission.content.wall.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Missão — Mural" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle={
                        hasDriveApiKey
                            ? 'Publique álbuns no mural com link do Google Drive, capa, fotógrafo e data — como em Fotos.'
                            : 'Publique álbuns no mural com link do Google Drive, capa, fotógrafo e data para os usuários do app.'
                    }
                    actions={
                        canManage ? (
                            <AddButton variant="label" onClick={openCreateModal} title="Novo álbum no mural">
                                Novo álbum
                            </AddButton>
                        ) : undefined
                    }
                />
                <MissionAdminTabs active="mural" />

                <div className="w-full space-y-5">
                    {albums.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                                <CameraIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhum álbum no mural</p>
                            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-500">
                                Cadastre o link da pasta no Google Drive, capa, fotógrafo e data para publicar as fotos no app.
                            </p>
                            {canManage ? (
                                <div className="mt-4 flex justify-center">
                                    <AddButton variant="label" onClick={openCreateModal} title="Novo álbum no mural">
                                        Novo álbum
                                    </AddButton>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        albums.map((a) => {
                            const cover = a.cover_image_url || a.auto_cover_url;
                            const publishedLabel = formatDate(a.published_at);
                            return (
                                <div
                                    key={a.id}
                                    className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row"
                                >
                                    {cover ? (
                                        <div className="aspect-video w-full flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800 sm:aspect-square sm:w-40">
                                            <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                                        </div>
                                    ) : (
                                        <div className="flex h-24 w-full flex-shrink-0 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800 sm:h-40 sm:w-40">
                                            <CameraIcon className="h-10 w-10 text-zinc-400" />
                                        </div>
                                    )}

                                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                                        {publishedLabel}
                                                    </p>
                                                    <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-zinc-800 dark:text-zinc-200">
                                                        {a.title}
                                                    </h2>
                                                </div>
                                                <CalendarDaysIcon className="h-6 w-6 flex-shrink-0 text-zinc-400 dark:text-zinc-500" />
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                {a.author?.name ? <span>• {a.author.name}</span> : null}
                                                {a.photographer_name ? <span>• {a.photographer_name}</span> : null}
                                                <span
                                                    className={`rounded-full px-2 py-0.5 font-semibold ${
                                                        a.is_published
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {a.is_published ? 'Publicado' : 'Rascunho'}
                                                </span>
                                                {a.drive_view_url ? (
                                                    <a
                                                        href={a.drive_view_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-200"
                                                    >
                                                        Abrir no Drive
                                                    </a>
                                                ) : null}
                                            </div>
                                            <p className="mt-2 break-all text-xs text-zinc-500 dark:text-zinc-400">{a.drive_folder_url}</p>
                                        </div>

                                        {canManage ? (
                                            <ListCardActionRow className="mt-3 gap-1 sm:w-auto">
                                                <ListCardIconActionButton
                                                    label="Editar"
                                                    icon={<PencilIcon className="h-5 w-5" />}
                                                    onClick={() => openEditModal(a)}
                                                />
                                                <ListCardIconActionButton
                                                    label="Excluir"
                                                    icon={<TrashIcon className="h-5 w-5" />}
                                                    tone="danger"
                                                    onClick={() => handleDelete(a.id)}
                                                />
                                            </ListCardActionRow>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {canManage && (
                <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
                    <form onSubmit={submit} className="p-6">
                        <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar álbum do mural' : 'Novo álbum no mural'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="wall_title" value="Título" />
                                <TextInput
                                    id="wall_title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: Culto Missão — 03/01"
                                />
                                <InputError message={errors.title} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="wall_photographer_name" value="Nome do fotógrafo (opcional)" />
                                <TextInput
                                    id="wall_photographer_name"
                                    value={data.photographer_name}
                                    onChange={(e) => setData('photographer_name', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: João Silva"
                                />
                                <InputError message={(errors as Record<string, string | undefined>).photographer_name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="wall_drive_folder_url" value="Link da pasta (Google Drive)" />
                                <TextInput
                                    id="wall_drive_folder_url"
                                    value={data.drive_folder_url}
                                    onChange={(e) => setData('drive_folder_url', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="https://drive.google.com/drive/folders/..."
                                />
                                <InputError message={errors.drive_folder_url} className="mt-1" />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    A pasta deve estar como “Qualquer pessoa com o link pode ver”.
                                </p>
                            </div>

                            <div>
                                <InputLabel htmlFor="wall_cover_image_url" value="Capa (opcional)" />
                                <TextInput
                                    id="wall_cover_image_url"
                                    value={data.cover_image_url}
                                    onChange={(e) => setData('cover_image_url', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="https://... (deixe vazio para tentar capa automática)"
                                />
                                <InputError message={errors.cover_image_url} className="mt-1" />
                                <div className="mt-3">
                                    <InputLabel htmlFor="wall_cover_image_file" value="Ou envie uma imagem (upload)" />
                                    <input
                                        id="wall_cover_image_file"
                                        type="file"
                                        accept={GALLERY_IMAGE_ACCEPT}
                                        className="mt-1 block w-full text-sm text-zinc-700 dark:text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:file:bg-white dark:file:text-black dark:hover:file:bg-zinc-100"
                                        onChange={async (e) => {
                                            const raw = e.currentTarget.files?.[0] ?? null;
                                            if (!raw) {
                                                setData('cover_image_file', null);
                                                setCoverCompressError(null);
                                                return;
                                            }
                                            setCoverCompressing(true);
                                            setCoverCompressError(null);
                                            try {
                                                const prepared = await compressImageForUpload(raw);
                                                setData('cover_image_file', prepared);
                                            } catch (err) {
                                                setData('cover_image_file', null);
                                                if (err instanceof ImageCompressError) {
                                                    setCoverCompressError(err.message);
                                                } else {
                                                    setCoverCompressError('Não foi possível processar esta imagem. Tente outra foto.');
                                                }
                                            } finally {
                                                setCoverCompressing(false);
                                            }
                                        }}
                                    />
                                    <InputError message={(errors as Record<string, string | undefined>).cover_image_file} className="mt-1" />
                                    {coverCompressing ? (
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Otimizando imagem…</p>
                                    ) : null}
                                    {coverCompressError ? (
                                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{coverCompressError}</p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="wall_published_at" value="Data de publicação (vazio = rascunho)" />
                                    <TextInput
                                        id="wall_published_at"
                                        type="datetime-local"
                                        value={data.published_at}
                                        onChange={(e) => setData('published_at', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.published_at} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="wall_sort_order" value="Ordem no mural" />
                                    <TextInput
                                        id="wall_sort_order"
                                        type="number"
                                        min={0}
                                        value={data.sort_order}
                                        onChange={(e) => setData('sort_order', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={(errors as Record<string, string | undefined>).sort_order} className="mt-1" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <SecondaryButton type="button" onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing || coverCompressing}>
                                {isEditing ? 'Salvar' : 'Publicar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
