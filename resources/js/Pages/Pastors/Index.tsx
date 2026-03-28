import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler, ChangeEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

interface PastorRow {
    id: number;
    name: string;
    bio: string | null;
    photo_path: string | null;
    sort_order: number;
}

interface Props {
    pastors: PastorRow[];
    canManage: boolean;
}

export default function PastorsIndex({ pastors, canManage }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        bio: '',
        sort_order: 0,
        photo: null as File | null,
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (p: PastorRow) => {
        setIsEditing(true);
        setEditingId(p.id);
        setData({
            name: p.name,
            bio: p.bio ?? '',
            sort_order: p.sort_order,
            photo: null,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setEditingId(null);
    };

    const onPhotoChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files?.[0] ?? null;
        setData('photo', file);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            if (data.photo) {
                router.post(
                    route('pastors.update', editingId),
                    {
                        _method: 'PUT',
                        name: data.name,
                        bio: data.bio,
                        sort_order: data.sort_order,
                        photo: data.photo,
                    },
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => closeModal(),
                    },
                );
            } else {
                put(route('pastors.update', editingId), {
                    preserveScroll: true,
                    onSuccess: () => closeModal(),
                });
            }
        } else {
            post(route('pastors.store'), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover pastor?',
            text: 'A foto e o texto serão eliminados.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('pastors.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Pastores" />
            <PageHeader title="Pastores">
                {canManage && <AddButton onClick={openCreateModal}>Novo pastor</AddButton>}
            </PageHeader>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-2xl">
                Equipa pastoral da igreja em contexto (foto e texto). A página pública fica em Mais → Nossos pastores.
            </p>

            {pastors.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                    Nenhum pastor cadastrado.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pastors.map((p) => (
                        <div
                            key={p.id}
                            className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col"
                        >
                            <div className="flex gap-4">
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                                    {p.photo_path ? (
                                        <img src={p.photo_path} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="w-12 h-12 text-zinc-400" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white truncate">{p.name}</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Ordem: {p.sort_order}</p>
                                    {p.bio && (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-4 whitespace-pre-wrap">
                                            {p.bio}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {canManage && (
                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(p)}
                                        className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg"
                                        title="Editar"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(p.id)}
                                        className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                        title="Remover"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canManage && (
                <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
                    <form onSubmit={submit} className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar pastor' : 'Novo pastor'}
                        </h2>
                        <div>
                            <InputLabel htmlFor="pastor_name" value="Nome" />
                            <TextInput
                                id="pastor_name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pastor_bio" value="Texto / biografia" />
                            <Textarea
                                id="pastor_bio"
                                value={data.bio}
                                onChange={(e) => setData('bio', e.target.value)}
                                rows={6}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.bio} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pastor_order" value="Ordem de exibição" />
                            <TextInput
                                id="pastor_order"
                                type="number"
                                min={0}
                                max={9999}
                                value={String(data.sort_order)}
                                onChange={(e) => setData('sort_order', parseInt(e.target.value, 10) || 0)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.sort_order} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel
                                htmlFor="pastor_photo"
                                value={isEditing ? 'Nova foto (opcional)' : 'Foto'}
                            />
                            <input
                                id="pastor_photo"
                                type="file"
                                accept="image/*"
                                onChange={onPhotoChange}
                                className="mt-1 block w-full text-sm text-zinc-600 dark:text-zinc-400"
                            />
                            <InputError message={errors.photo} className="mt-1" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <SecondaryButton type="button" onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing}>
                                {isEditing ? 'Guardar' : 'Criar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
