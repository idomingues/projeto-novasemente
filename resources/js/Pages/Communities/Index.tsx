import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import { useListModalEditUrl, useListModalFromUrl } from '@/hooks/useListModalEditUrl';

type CommunityRow = {
    id: number;
    name: string;
    description: string;
    whatsappUrl: string;
    coverUrl: string | null;
    sortOrder: number;
    isPublished: boolean;
};

interface FormOldPayload {
    name?: string;
    description?: string;
    whatsapp_url?: string;
    sort_order?: string | number;
    is_published?: boolean | string;
}

interface Props {
    communities: CommunityRow[];
    canManage: boolean;
    schemaReady?: boolean;
    formOld?: FormOldPayload;
}

const COMMUNITIES_EDITING_KEY = 'communities_editing_id';

export default function CommunitiesIndex({
    communities,
    canManage,
    schemaReady = true,
    formOld = {},
}: Props) {
    const pageErrors = (usePage().props as { errors?: Record<string, string> }).errors ?? {};
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [coverCompressing, setCoverCompressing] = useState(false);
    const [coverCompressError, setCoverCompressError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const { syncListModalEditUrl } = useListModalEditUrl();

    const { data, setData, errors, reset, clearErrors, post, put } = useForm({
        name: '',
        description: '',
        whatsapp_url: '',
        sort_order: '0',
        is_published: true,
        cover_image_file: null as File | null,
    });

    const editingCommunity = useMemo(
        () => (editingId != null ? communities.find((c) => c.id === editingId) ?? null : null),
        [communities, editingId],
    );

    const coverPreviewUrl = useMemo(() => {
        if (data.cover_image_file) {
            return URL.createObjectURL(data.cover_image_file);
        }
        return editingCommunity?.coverUrl ?? null;
    }, [data.cover_image_file, editingCommunity?.coverUrl]);

    useEffect(() => {
        return () => {
            if (data.cover_image_file && coverPreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(coverPreviewUrl);
            }
        };
    }, [data.cover_image_file, coverPreviewUrl]);

    const formOldJson = JSON.stringify(formOld ?? {});
    const lastSyncedFormOld = useRef('');
    useEffect(() => {
        if (formOldJson === '{}' || formOldJson === lastSyncedFormOld.current) {
            if (formOldJson === '{}') {
                lastSyncedFormOld.current = '';
            }
            return;
        }
        lastSyncedFormOld.current = formOldJson;
        const o = formOld ?? {};
        setData((prev) => ({
            ...prev,
            name: typeof o.name === 'string' ? o.name : prev.name,
            description: typeof o.description === 'string' ? o.description : prev.description,
            whatsapp_url: typeof o.whatsapp_url === 'string' ? o.whatsapp_url : prev.whatsapp_url,
            sort_order:
                o.sort_order !== undefined && o.sort_order !== null && String(o.sort_order) !== ''
                    ? String(o.sort_order)
                    : prev.sort_order,
            is_published:
                o.is_published === true || o.is_published === '1' || o.is_published === 'true' || o.is_published === 1,
            cover_image_file: null,
        }));
        setIsModalOpen(true);
    }, [formOldJson, formOld, setData]);

    const applyCommunityToForm = useCallback(
        (c: CommunityRow) => {
            setData({
                name: c.name,
                description: c.description,
                whatsapp_url: c.whatsappUrl,
                sort_order: String(c.sortOrder),
                is_published: c.isPublished,
                cover_image_file: null,
            });
        },
        [setData],
    );

    const openCreateModal = () => {
        sessionStorage.removeItem(COMMUNITIES_EDITING_KEY);
        setIsEditing(false);
        setEditingId(null);
        setSaveMessage(null);
        syncListModalEditUrl(null);
        reset();
        setData({
            name: '',
            description: '',
            whatsapp_url: '',
            sort_order: '0',
            is_published: true,
            cover_image_file: null,
        });
        clearErrors();
        setCoverCompressing(false);
        setCoverCompressError(null);
        setIsModalOpen(true);
    };

    const openEditModal = useCallback(
        (c: CommunityRow) => {
            setIsEditing(true);
            setEditingId(c.id);
            setSaveMessage(null);
            syncListModalEditUrl(c.id);
            applyCommunityToForm(c);
            clearErrors();
            setCoverCompressing(false);
            setCoverCompressError(null);
            setIsModalOpen(true);
        },
        [applyCommunityToForm, clearErrors, syncListModalEditUrl],
    );

    useListModalFromUrl(communities, isModalOpen, editingId, openEditModal);

    const dismissModalOnFormError = () => {
        sessionStorage.removeItem(COMMUNITIES_EDITING_KEY);
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingId(null);
        setCoverCompressing(false);
        setCoverCompressError(null);
    };

    const closeModal = () => {
        sessionStorage.removeItem(COMMUNITIES_EDITING_KEY);
        setIsModalOpen(false);
        setSaveMessage(null);
        syncListModalEditUrl(null);
        reset();
        setEditingId(null);
        setIsEditing(false);
        setCoverCompressing(false);
        setCoverCompressError(null);
    };

    const finishSubmit = () => {
        clearErrors();
        setSaveMessage(isEditing ? 'Comunidade atualizada.' : 'Comunidade cadastrada.');
        setData('cover_image_file', null);
        setCoverCompressError(null);
    };

    const submitOptions = {
        ...inertiaListModalSave,
        onSuccess: finishSubmit,
        onError: dismissModalOnFormError,
        forceFormData: true,
        transform: (formData: typeof data) => ({
            ...formData,
            is_published: formData.is_published ? '1' : '0',
        }),
    } as const;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            sessionStorage.setItem(COMMUNITIES_EDITING_KEY, String(editingId));
            put(route('communities.update', editingId), submitOptions);
        } else {
            sessionStorage.removeItem(COMMUNITIES_EDITING_KEY);
            post(route('communities.store'), submitOptions);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover comunidade?',
            text: 'A arte e os dados serão excluídos. Esta ação não pode ser desfeita.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('communities.destroy', id));
        }
    };

    const formErrors = { ...errors, ...pageErrors };

    return (
        <AdminLayout>
            <Head title="Comunidades" />
            <PageHeader
                title="Comunidades"
                subtitle="Cadastre grupos de interesse da igreja com nome, descrição, arte e link do WhatsApp."
                actions={
                    canManage && schemaReady ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Nova comunidade">
                            Nova comunidade
                        </AddButton>
                    ) : undefined
                }
            />

            {!schemaReady && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    A tabela <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">church_communities</code>{' '}
                    ainda não existe. Execute as migrations para ativar esta área.
                </div>
            )}

            <div className="space-y-5 pb-8 md:pb-0">
                {schemaReady && communities.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                            <UserGroupIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma comunidade cadastrada</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                            Cadastre o primeiro grupo para exibir no app.
                        </p>
                        {canManage ? (
                            <AddButton variant="icon" onClick={openCreateModal} className="mt-4" title="Nova comunidade">
                                Nova comunidade
                            </AddButton>
                        ) : null}
                    </div>
                ) : schemaReady ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {communities.map((c) => (
                            <Card key={c.id} className="flex flex-col overflow-hidden p-0">
                                {c.coverUrl ? (
                                    <img
                                        src={c.coverUrl}
                                        alt=""
                                        className="h-40 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-40 w-full items-center justify-center bg-teal-50 dark:bg-teal-950/40">
                                        <UserGroupIcon className="h-12 w-12 text-teal-600 dark:text-teal-400" />
                                    </div>
                                )}
                                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{c.name}</h2>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                                                        c.isPublished
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                                                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                                    }`}
                                                >
                                                    {c.isPublished ? 'Publicado' : 'Rascunho'}
                                                </span>
                                            </div>
                                            <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {c.description}
                                            </p>
                                        </div>
                                        {canManage ? (
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(c)}
                                                    className="cursor-pointer rounded-xl p-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                                    title="Editar"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(c.id)}
                                                    className="cursor-pointer rounded-xl p-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                                                    title="Excluir"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : null}
            </div>

            {canManage && schemaReady && (
                <Modal show={isModalOpen} onClose={closeModal}>
                    <form onSubmit={submit} className="max-h-[85vh] overflow-y-auto p-6">
                        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar comunidade' : 'Nova comunidade'}
                        </h2>
                        {saveMessage ? (
                            <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
                                {saveMessage}
                            </p>
                        ) : null}
                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="community_name" value="Nome" />
                                <TextInput
                                    id="community_name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: Seven Bike Nova Semente"
                                />
                                <InputError message={formErrors.name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="community_description" value="Descrição" />
                                <Textarea
                                    id="community_description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    className="mt-1 block w-full"
                                    placeholder="Breve texto sobre o grupo e o que as pessoas encontram nele."
                                />
                                <InputError message={formErrors.description} className="mt-1" />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Até 500 caracteres.</p>
                            </div>

                            <div>
                                <InputLabel htmlFor="community_whatsapp" value="Link do WhatsApp" />
                                <TextInput
                                    id="community_whatsapp"
                                    type="url"
                                    value={data.whatsapp_url}
                                    onChange={(e) => setData('whatsapp_url', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="https://chat.whatsapp.com/..."
                                />
                                <InputError message={formErrors.whatsapp_url} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="community_cover"
                                    value={isEditing ? 'Arte / capa (substituir — opcional)' : 'Arte / capa (opcional)'}
                                />
                                {coverPreviewUrl ? (
                                    <img
                                        src={coverPreviewUrl}
                                        alt=""
                                        className="mt-2 h-32 w-full rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                                    />
                                ) : null}
                                <input
                                    id="community_cover"
                                    type="file"
                                    accept={GALLERY_IMAGE_ACCEPT}
                                    className="mt-2 block w-full cursor-pointer text-sm text-zinc-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-200 dark:file:bg-white dark:file:text-black dark:hover:file:bg-zinc-100"
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
                                                setCoverCompressError('Não foi possível processar esta imagem.');
                                            }
                                        } finally {
                                            setCoverCompressing(false);
                                        }
                                    }}
                                />
                                <InputError message={formErrors.cover_image_file} className="mt-1" />
                                {coverCompressing ? (
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Otimizando imagem…</p>
                                ) : null}
                                {coverCompressError ? (
                                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{coverCompressError}</p>
                                ) : null}
                            </div>

                            <div>
                                <InputLabel htmlFor="community_sort" value="Ordem na lista" />
                                <TextInput
                                    id="community_sort"
                                    type="number"
                                    min={0}
                                    max={9999}
                                    value={data.sort_order}
                                    onChange={(e) => setData('sort_order', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={formErrors.sort_order} className="mt-1" />
                            </div>

                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={data.is_published}
                                    onChange={(e) => setData('is_published', e.target.checked)}
                                    className="cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
                                />
                                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Publicado no app</span>
                            </label>
                        </div>

                        <div className="mt-8 flex gap-2">
                            <SecondaryButton type="button" className="flex-1 cursor-pointer" onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" className="flex-1 cursor-pointer">
                                {isEditing ? 'Salvar' : 'Cadastrar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
