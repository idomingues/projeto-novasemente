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
import { useState, useEffect, FormEventHandler } from 'react';

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
    const [search, setSearch] = useState(filters.search ?? '');
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        title: '',
        excerpt: '',
        body: '',
        image_url: '',
        published_at: '',
        image_file: null as File | null,
    });

    useEffect(() => {
        if (search === (filters.search ?? '')) {
            return;
        }
        const timeout = setTimeout(() => {
            router.get(
                route('news.index'),
                { search },
                {
                    preserveState: true,
                    replace: true,
                },
            );
        }, 400);
        return () => clearTimeout(timeout);
    }, [search, filters.search]);

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setData('image_file', null);
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
        setData('image_file', null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setData('image_file', null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('news.update', editingId), { onSuccess: () => closeModal(), forceFormData: true });
        } else {
            post(route('news.store'), { onSuccess: () => closeModal(), forceFormData: true });
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
                            value={search}
                            placeholder="Buscar notícias..."
                            className="w-full"
                            onChange={(e) => setSearch(e.target.value)}
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
                                <InputLabel htmlFor="image_url" value="Imagem da notícia" />
                                <div className="mt-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {data.image_file ? (
                                                <img src={URL.createObjectURL(data.image_file)} alt="" className="w-full h-full object-cover" />
                                            ) : data.image_url ? (
                                                <img src={data.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <PhotoIcon className="w-5 h-5 text-zinc-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                id="image_file"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] ?? null;
                                                    setData('image_file', file);
                                                }}
                                                className="block w-full text-sm text-zinc-900 dark:text-zinc-100 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                            />
                                            <TextInput
                                                id="image_url"
                                                value={data.image_url}
                                                onChange={(e) => setData('image_url', e.target.value)}
                                                className="block w-full"
                                                placeholder="Ou cole uma URL https://..."
                                            />
                                        </div>
                                    </div>
                                    <InputError message={errors.image_url} className="mt-1" />
                                </div>
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
                        {/** Pré-visualização em formato próximo ao mobile */}
                        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                            <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
                                Pré-visualização (mobile)
                            </p>
                            <div className="max-w-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                {(data.image_file || data.image_url) && (
                                    <img
                                        src={data.image_file ? URL.createObjectURL(data.image_file) : data.image_url}
                                        alt=""
                                        className="w-full h-40 object-cover"
                                    />
                                )}
                                <div className="p-4">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white text-lg">
                                        {data.title || 'Título da notícia'}
                                    </h3>
                                    {data.published_at && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            {new Date(data.published_at).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    )}
                                    <p className="mt-3 text-zinc-600 dark:text-zinc-300 text-sm line-clamp-4">
                                        {data.excerpt || data.body.slice(0, 300) || 'Resumo da notícia aparecerá aqui.'}
                                    </p>
                                </div>
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

