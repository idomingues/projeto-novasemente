import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDaysIcon, CameraIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { FormEventHandler, useMemo, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';

interface PhotoAlbumRow {
    id: number;
    title: string;
    photographer_name: string | null;
    drive_folder_url: string;
    drive_folder_id: string | null;
    drive_embed_url: string | null;
    drive_view_url: string | null;
    cover_image_url: string | null;
    auto_cover_url: string | null;
    published_at: string | null;
    created_at: string;
    author?: { name: string } | null;
}

interface Props {
    albums: PhotoAlbumRow[];
    canManage: boolean;
    hasDriveApiKey: boolean;
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function PhotoAlbumsIndex({ albums, canManage, hasDriveApiKey }: Props) {
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
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        setData((prev) => ({ ...prev, title: 'Culto' }));
        clearErrors();
        setCoverCompressing(false);
        setCoverCompressError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (a: PhotoAlbumRow) => {
        setIsEditing(true);
        setEditingId(a.id);
        setData({
            title: a.title,
            photographer_name: a.photographer_name ?? '',
            drive_folder_url: a.drive_folder_url,
            cover_image_url: a.cover_image_url ?? '',
            cover_image_file: null,
            published_at: a.published_at ? a.published_at.substring(0, 16) : '',
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
            put(route('photo-albums.update', editingId), { ...inertiaListModalSave, forceFormData: true });
        } else {
            post(route('photo-albums.store'), { ...inertiaListModalSave, forceFormData: true });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover álbum?',
            text: 'O álbum será removido da lista do app.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('photo-albums.destroy', id));
        }
    };

    const items = useMemo(() => albums, [albums]);

    return (
        <AdminLayout>
            <Head title="Fotos" />

            <PageHeader
                title="Fotos (álbuns)"
                subtitle={
                    hasDriveApiKey
                        ? 'Cadastre aqui link do Google Drive, capa, fotógrafo e data para publicação das fotos para os usuários do App.'
                        : undefined
                }
                actions={
                    canManage ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Novo álbum">
                            Novo álbum
                        </AddButton>
                    ) : undefined
                }
            />

            <div className="w-full space-y-5">
                {items.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <CameraIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum álbum cadastrado</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                            Cadastre aqui link do Google Drive, capa, fotógrafo e data para publicação das fotos para os usuários do App.
                        </p>
                        {canManage && (
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                <AddButton variant="icon" onClick={openCreateModal} title="Novo álbum">
                                    Novo álbum
                                </AddButton>
                            </div>
                        )}
                    </div>
                ) : (
                    items.map((a) => {
                        const cover = a.cover_image_url || a.auto_cover_url;
                        const publishedLabel = a.published_at ? formatDate(a.published_at) : 'Rascunho';
                        return (
                            <div
                                key={a.id}
                                className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4 p-4"
                            >
                                {cover ? (
                                    <div className="w-full sm:w-40 flex-shrink-0 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                        <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                ) : (
                                    <div className="w-full sm:w-40 h-24 sm:h-40 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                        <CameraIcon className="w-10 h-10 text-zinc-400" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                                    {publishedLabel}
                                                </p>
                                                <h2 className="mt-1 font-semibold text-zinc-800 dark:text-zinc-200 text-sm leading-snug line-clamp-2">
                                                    {a.title}
                                                </h2>
                                            </div>
                                            <CalendarDaysIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                            {a.author?.name ? <span>• {a.author.name}</span> : null}
                                            {a.photographer_name ? <span>• {a.photographer_name}</span> : null}
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
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 break-all">
                                            {a.drive_folder_url}
                                        </p>
                                    </div>

                                    {canManage && (
                                        <div className="flex items-center gap-1 mt-3">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(a)}
                                                className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(a.id)}
                                                className="p-2.5 rounded-xl text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Excluir"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {canManage && (
                <Modal show={isModalOpen} onClose={closeModal}>
                    <form onSubmit={submit} className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                            {isEditing ? 'Editar álbum' : 'Novo álbum'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="album_title" value="Título" />
                                <TextInput
                                    id="album_title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: Culto Jovem — 03/01"
                                />
                                <InputError message={errors.title} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="album_photographer_name" value="Nome do fotógrafo (opcional)" />
                                <TextInput
                                    id="album_photographer_name"
                                    value={data.photographer_name}
                                    onChange={(e) => setData('photographer_name', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: João Silva"
                                />
                                <InputError message={(errors as Record<string, string | undefined>).photographer_name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="drive_folder_url" value="Link da pasta (Google Drive)" />
                                <TextInput
                                    id="drive_folder_url"
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
                                <InputLabel htmlFor="cover_image_url" value="Capa (opcional)" />
                                <TextInput
                                    id="cover_image_url"
                                    value={data.cover_image_url}
                                    onChange={(e) => setData('cover_image_url', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="https://... (deixe vazio para tentar capa automática)"
                                />
                                <InputError message={errors.cover_image_url} className="mt-1" />
                                <div className="mt-3">
                                    <InputLabel htmlFor="cover_image_file" value="Ou envie uma imagem (upload)" />
                                    <input
                                        id="cover_image_file"
                                        type="file"
                                        accept="image/*"
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
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Otimizando imagem…
                                        </p>
                                    ) : null}
                                    {coverCompressError ? (
                                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                                            {coverCompressError}
                                        </p>
                                    ) : null}
                                    {data.cover_image_file ? (
                                        <button
                                            type="button"
                                            onClick={() => setData('cover_image_file', null)}
                                            className="mt-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white underline underline-offset-4"
                                        >
                                            Remover upload selecionado
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="album_published_at" value="Data de publicação (vazio = rascunho)" />
                                <TextInput
                                    id="album_published_at"
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

