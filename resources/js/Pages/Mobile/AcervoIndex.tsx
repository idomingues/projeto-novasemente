import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { PencilIcon, TrashIcon, Bars3Icon, ArrowTopRightOnSquareIcon, PlayCircleIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler } from 'react';

interface AcervoItem {
    id: number;
    url: string;
    title: string;
    thumbnail: string | null;
    videoCount: number | null;
}

interface Props {
    items: AcervoItem[];
    playlistsUrl: string;
    canManage: boolean;
}

const normalizeForSearch = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function MobileAcervoIndex({ items, playlistsUrl, canManage }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteItem, setDeleteItem] = useState<AcervoItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState('');

    const filteredItems = search.trim()
        ? items.filter((item) => normalizeForSearch(item.title).includes(normalizeForSearch(search.trim())))
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
        <MobileLayout>
            <Head title="Acervo" />
            <div className="space-y-6 -mt-8">
                <Link href={route('mobile.more')} className="text-sm text-zinc-500 underline dark:text-zinc-400">
                    ← Mais
                </Link>
                {/* Título e botão Adicionar na mesma linha */}
                <div className="flex items-center justify-between gap-3 flex-nowrap">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white truncate min-w-0">Acervo</h1>
                    {canManage && (
                        <PrimaryButton
                            type="button"
                            onClick={openCreateModal}
                            className="gap-2 flex-shrink-0 !px-3 !py-2 !text-sm !normal-case !tracking-normal"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Adicionar
                        </PrimaryButton>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar no acervo..."
                            className="w-full rounded-2xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 py-3 pl-10 pr-10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:focus:border-primary-400 dark:focus:ring-primary-400/20 transition-all text-base"
                            aria-label="Buscar no acervo"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-700"
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
                                    : `${filteredItems.length} ${filteredItems.length === 1 ? 'resultado' : 'resultados'}`}
                            </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="group relative">
                                <Link
                                    href={route('mobile.acervo.show', item.id)}
                                    title={item.title}
                                    className="block rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden active:scale-[0.98] transition-transform"
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
                                                <PlayCircleIcon className="w-10 h-10 text-zinc-400" />
                                            </div>
                                        )}
                                        {item.videoCount != null && item.videoCount > 0 && (
                                            <div className="absolute bottom-0 right-0 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-[10px] font-medium rounded-tl-lg">
                                                <Bars3Icon className="w-3 h-3" />
                                                {item.videoCount} {item.videoCount === 1 ? 'vídeo' : 'vídeos'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <h2 className="font-semibold text-zinc-900 dark:text-white text-xs line-clamp-2">
                                            {item.title}
                                        </h2>
                                        <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                            Abrir
                                        </span>
                                    </div>
                                </Link>
                                {canManage && (
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                openEditModal(item);
                                            }}
                                            className="p-2 rounded-lg bg-white/90 dark:bg-zinc-800/90 shadow"
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
                                            className="p-2 rounded-lg bg-white/90 dark:bg-zinc-800/90 shadow"
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
                    <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[520px]">
                            <iframe
                                src={playlistsUrl}
                                title="Playlists do canal ADV Nova Semente"
                                className="w-full h-[70vh] min-h-[520px] border-0"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                allowFullScreen
                            />
                        </div>
                        <a
                            href={playlistsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir playlists no YouTube (nova aba)"
                            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Abrir no YouTube
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                        {canManage ? (
                            <div className="pt-2">
                                <PrimaryButton type="button" onClick={openCreateModal} className="gap-2 !normal-case !tracking-normal">
                                    <PlusIcon className="h-5 w-5" />
                                    Adicionar link
                                </PrimaryButton>
                            </div>
                        ) : null}
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
                                    className="inline-flex justify-center rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-white"
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
                        Cole o link da playlist ou vídeo do YouTube.
                    </p>
                    <div>
                        <InputLabel htmlFor="url" value="Link do YouTube" />
                        <TextInput
                            id="url"
                            type="url"
                            value={data.url}
                            onChange={(e) => setData('url', e.target.value)}
                            placeholder="https://www.youtube.com/..."
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
        </MobileLayout>
    );
}
