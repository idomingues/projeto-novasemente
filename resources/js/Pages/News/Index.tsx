import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon, CalendarDaysIcon, PhotoIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler } from 'react';

interface NewsPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    image_url: string | null;
    published_at: string | null;
    created_at: string;
    author?: { name: string } | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    posts: {
        data: NewsPost[];
        links: PaginationLink[];
    };
    filters: {
        search?: string;
    };
    canManage: boolean;
}

export default function Index({ posts, filters, canManage }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        title: '',
        excerpt: '',
        body: '',
        image_url: '',
        published_at: '',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (p: NewsPost) => {
        setIsEditing(true);
        setEditingId(p.id);
        setData({
            title: p.title,
            excerpt: p.excerpt ?? '',
            body: p.body,
            image_url: p.image_url ?? '',
            published_at: p.published_at ? p.published_at.substring(0, 16) : '',
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = {
            ...data,
            published_at: data.published_at || null,
        };
        if (isEditing && editingId) {
            put(route('news.update', editingId), payload, { onSuccess: () => closeModal() });
        } else {
            post(route('news.store'), payload, { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Remover esta notícia?')) {
            router.delete(route('news.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Notícias" />
            <PageHeader title="Notícias">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                    <div className="w-full sm:w-80">
                        <TextInput
                            type="search"
                            name="search"
                            defaultValue={filters.search ?? ''}
                            placeholder="Buscar notícias..."
                            className="w-full"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const target = e.target as HTMLInputElement;
                                    router.get(route('news.index'), { search: target.value }, { preserveState: true, replace: true });
                                }
                            }}
                        />
                    </div>
                    {canManage && (
                        <PrimaryButton type="button" onClick={openCreateModal} className="gap-2">
                            <PlusIcon className="w-5 h-5" />
                            Nova notícia
                        </PrimaryButton>
                    )}
                </div>
            </PageHeader>

            <div className="space-y-4 pb-8 md:pb-0">
                {posts.data.map((p) => (
                    <Card key={p.id} className="flex flex-col sm:flex-row gap-4 md:gap-6 p-4 sm:p-6 md:p-8 touch-manipulation">
                        {p.image_url && (
                            <div className="w-full sm:w-40 md:w-48 h-36 sm:h-40 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                                <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{p.title}</h2>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        <span>
                                            {p.published_at
                                                ? new Date(p.published_at).toLocaleDateString('pt-BR')
                                                : 'Rascunho'}
                                        </span>
                                        {p.author?.name && <span>• {p.author.name}</span>}
                                    </div>
                                </div>
                                {canManage && (
                                    <div className="flex items-center gap-1 min-h-[44px]">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(p)}
                                            className="p-3 min-w-[44px] min-h-[44px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
                                            title="Editar"
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(p.id)}
                                            className="p-3 min-w-[44px] min-h-[44px] text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
                                            title="Excluir"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                {p.excerpt ?? p.body.slice(0, 200) + (p.body.length > 200 ? '…' : '')}
                            </p>
                        </div>
                    </Card>
                ))}

                {posts.data.length === 0 && (
                    <Card>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                            Nenhuma notícia cadastrada.
                        </p>
                    </Card>
                )}

                {posts.links.length > 1 && (
                    <div className="flex justify-center mt-4 gap-2 flex-wrap">
                        {posts.links.map((link, i) => (
                            <button
                                key={i}
                                disabled={!link.url}
                                onClick={() => link.url && router.visit(link.url)}
                                className={`px-3 py-1 rounded-lg text-sm border border-zinc-300 dark:border-zinc-700 ${
                                    link.active
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                        : link.url
                                        ? 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {canManage && (
                <Modal show={isModalOpen} onClose={closeModal}>
                    <form onSubmit={submit} className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                            {isEditing ? 'Editar notícia' : 'Nova notícia'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="title" value="Título" />
                                <TextInput
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.title} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="excerpt" value="Resumo (opcional)" />
                                <Textarea
                                    id="excerpt"
                                    value={data.excerpt}
                                    onChange={(e) => setData('excerpt', e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.excerpt} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="body" value="Conteúdo" />
                                <Textarea
                                    id="body"
                                    value={data.body}
                                    onChange={(e) => setData('body', e.target.value)}
                                    rows={6}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.body} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="image_url" value="URL da imagem (opcional)" />
                                <div className="mt-1 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {data.image_url ? (
                                            <img src={data.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <PhotoIcon className="w-5 h-5 text-zinc-500" />
                                        )}
                                    </div>
                                    <TextInput
                                        id="image_url"
                                        value={data.image_url}
                                        onChange={(e) => setData('image_url', e.target.value)}
                                        className="block w-full"
                                        placeholder="https://..."
                                    />
                                </div>
                                <InputError message={errors.image_url} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="published_at" value="Data de publicação (vazio = rascunho)" />
                                <TextInput
                                    id="published_at"
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
                            <PrimaryButton type="submit" disabled={processing}>
                                {isEditing ? 'Salvar' : 'Publicar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}

