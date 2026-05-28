import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, Bars3Icon, ArrowTopRightOnSquareIcon, PlayCircleIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler } from 'react';
import { textIncludesSearch } from '@/utils/searchText';

interface AcervoItem {
    id: number;
    url: string;
    title: string;
    thumbnail: string | null;
    videoCount: number | null;
}

interface Props {
    items: AcervoItem[];
    canManage: boolean;
}

export default function AcervoIndex({ items, canManage }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteItem, setDeleteItem] = useState<AcervoItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState('');

    const filteredItems = search.trim()
        ? items.filter((item) => textIncludesSearch(item.title, search))
        : items;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        url: '',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setData('url', '');
        setIsModalOpen(true);
    };

    const openEditModal = (item: AcervoItem) => {
        setIsEditing(true);
        setEditingId(item.id);
        setData('url', item.url);
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('acervo.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('acervo.store'), { onSuccess: () => closeModal() });
        }
    };

    const openDeleteModal = (item: AcervoItem) => {
        setDeleteItem(item);
    };

    const closeDeleteModal = () => {
        if (!isDeleting) setDeleteItem(null);
    };

    const confirmDelete = () => {
        if (!deleteItem) return;
        setIsDeleting(true);
        router.delete(route('acervo.destroy', deleteItem.id), {
            onFinish: () => {
                setIsDeleting(false);
                setDeleteItem(null);
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Séries" />
            <div className="space-y-6">
                <PageHeader
                    title="Séries"
                    subtitle="Veja todas as séries já passadas na Nova Semente."
                    actions={
                        canManage ? (
                            <AddButton variant="icon" onClick={openCreateModal} title="Adicionar link">
                                Adicionar link
                            </AddButton>
                        ) : undefined
                    }
                />

                {items.length > 0 && (
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar no acervo..."
                            className="w-full max-w-md rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 transition-colors"
                            aria-label="Buscar no acervo"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                aria-label="Limpar busca"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                )}

                {items.length > 0 ? (
                    <>
                        {search.trim() && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {filteredItems.length === 0
                                    ? `Nenhum resultado para "${search.trim()}".`
                                    : `${filteredItems.length} ${filteredItems.length === 1 ? 'resultado' : 'resultados'}.`}
                            </p>
                        )}
                        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="group relative">
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`${item.title} (abre em nova aba)`}
                                    className="block rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                                >
                                    <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
                                        {item.thumbnail ? (
                                            <img
                                                src={item.thumbnail}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <PlayCircleIcon className="w-12 h-12 text-zinc-400" />
                                            </div>
                                        )}
                                        {item.videoCount != null && item.videoCount > 0 && (
                                            <div className="absolute bottom-0 right-0 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-tl-lg">
                                                <Bars3Icon className="w-3.5 h-3.5" />
                                                {item.videoCount} {item.videoCount === 1 ? 'vídeo' : 'vídeos'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h2 className="font-semibold text-zinc-900 dark:text-white text-sm line-clamp-2 group-hover:underline">
                                            {item.title}
                                        </h2>
                                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Ver playlist completa
                                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </a>
                                {canManage && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                openEditModal(item);
                                            }}
                                            className="p-2 rounded-lg bg-white/90 dark:bg-zinc-800/90 shadow hover:bg-white dark:hover:bg-zinc-700"
                                            title="Editar"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                openDeleteModal(item);
                                            }}
                                            className="p-2 rounded-lg bg-white/90 dark:bg-zinc-800/90 shadow hover:bg-red-100 dark:hover:bg-red-900/30"
                                            title="Remover"
                                        >
                                            <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>
                    </>
                ) : (
                    <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-12 text-center">
                        <PlayCircleIcon className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                            Nenhum item no acervo. Adicione links de playlists do YouTube.
                        </p>
                        {canManage && (
                            <PrimaryButton
                                type="button"
                                onClick={openCreateModal}
                                className="gap-2 !normal-case !tracking-normal"
                            >
                                <PlusIcon className="h-5 w-5" />
                                Adicionar primeiro item
                            </PrimaryButton>
                        )}
                    </div>
                )}
            </div>

            <Modal show={!!deleteItem} onClose={closeDeleteModal} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Remover do acervo?
                            </h3>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {deleteItem && (
                                    <>
                                        &quot;{deleteItem.title}&quot; será removido permanentemente.
                                    </>
                                )}
                            </p>
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="inline-flex justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                                >
                                    {isDeleting ? 'Removendo...' : 'Remover'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    disabled={isDeleting}
                                    className="inline-flex justify-center rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-white shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                        {isEditing ? 'Editar item' : 'Adicionar item'}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        Cole o link da playlist ou vídeo do YouTube. O título e a thumbnail serão obtidos automaticamente.
                    </p>
                    <div>
                        <InputLabel htmlFor="url" value="Link do YouTube" />
                        <TextInput
                            id="url"
                            type="url"
                            value={data.url}
                            onChange={(e) => setData('url', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=xxx&list=PLxxx"
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.url} className="mt-1" />
                    </div>
                    <div className="flex gap-2 mt-6">
                        <PrimaryButton type="submit" disabled={processing}>
                            {isEditing ? 'Salvar' : 'Adicionar'}
                        </PrimaryButton>
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
