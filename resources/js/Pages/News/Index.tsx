import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import {
    PencilIcon,
    TrashIcon,
    CalendarDaysIcon,
    PhotoIcon,
    DocumentTextIcon,
    PlayCircleIcon,
} from '@heroicons/react/24/outline';
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
import SelectInput from '@/Components/SelectInput';
import { useState, useEffect, FormEventHandler, useMemo } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import { youtubeThumbUrlFromVideoUrl } from '@/utils/youtube';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('/')) return `${appUrl}${url}`;
    return url;
}

type ContentType = 'article' | 'youtube' | 'pdf' | 'image';

interface NewsPost {
    id: number;
    title: string;
    slug: string;
    content_type: ContentType;
    excerpt: string | null;
    body: string;
    youtube_url: string | null;
    image_url: string | null;
    cover_url: string | null;
    pdf_url: string | null;
    published_at: string | null;
    created_at: string;
    author?: { name: string } | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPosts {
    data: NewsPost[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
}

interface Props {
    posts: PaginatedPosts;
    filters: {
        search?: string;
    };
    canManage: boolean;
}

function typeShortLabel(t: ContentType): string {
    switch (t) {
        case 'youtube':
            return 'Vídeo';
        case 'pdf':
            return 'PDF';
        case 'image':
            return 'Imagem';
        default:
            return 'Artigo';
    }
}

function cardSummary(p: NewsPost): string {
    if (p.excerpt?.trim()) return p.excerpt.trim();
    const b = (p.body || '').trim();
    if (b) {
        const plain = b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return plain.length > 200 ? `${plain.slice(0, 200)}…` : plain;
    }
    if (p.content_type === 'youtube') return 'Vídeo no YouTube';
    if (p.content_type === 'pdf') return 'Documento PDF';
    if (p.content_type === 'image') return 'Publicação com imagem';
    return '';
}

export default function Index({ posts, filters, canManage }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        content_type: 'article' as ContentType,
        title: '',
        excerpt: '',
        body: '',
        youtube_url: '',
        image_url: '',
        published_at: '',
        image_file: null as File | null,
        pdf_file: null as File | null,
    });

    const fileThumbUrl = useMemo(() => {
        if (!data.image_file) {
            return null;
        }
        return URL.createObjectURL(data.image_file);
    }, [data.image_file]);

    useEffect(() => {
        return () => {
            if (fileThumbUrl) {
                URL.revokeObjectURL(fileThumbUrl);
            }
        };
    }, [fileThumbUrl]);

    const previewThumbSrc =
        fileThumbUrl ||
        (data.image_url?.trim() ? imageSrc(data.image_url, appUrl) : '') ||
        (data.content_type === 'youtube' && data.youtube_url?.trim()
            ? youtubeThumbUrlFromVideoUrl(data.youtube_url.trim()) ?? ''
            : '');

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
        setExistingPdfUrl(null);
        reset();
        clearErrors();
        setData('content_type', 'article');
        setData('image_file', null);
        setData('pdf_file', null);
        setIsModalOpen(true);
    };

    const openEditModal = (p: NewsPost) => {
        setIsEditing(true);
        setEditingId(p.id);
        setExistingPdfUrl(p.pdf_url ?? null);
        setData({
            content_type: p.content_type ?? 'article',
            title: p.title,
            excerpt: p.excerpt ?? '',
            body: p.body ?? '',
            youtube_url: p.youtube_url ?? '',
            image_url: p.image_url ?? '',
            published_at: p.published_at ? p.published_at.substring(0, 16) : '',
        });
        clearErrors();
        setData('image_file', null);
        setData('pdf_file', null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setExistingPdfUrl(null);
        reset();
        setData('image_file', null);
        setData('pdf_file', null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('news.update', editingId), { onSuccess: () => closeModal(), forceFormData: true });
        } else {
            post(route('news.store'), { onSuccess: () => closeModal(), forceFormData: true });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover notícia?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('news.destroy', id));
        }
    };

    const imageFieldLabel =
        data.content_type === 'image'
            ? 'Imagem (obrigatória)'
            : data.content_type === 'youtube'
              ? 'Imagem de capa (opcional — se vazio, usa a miniatura do YouTube)'
              : 'Imagem de capa (opcional)';

    const bodyLabel =
        data.content_type === 'article' ? 'Conteúdo' : 'Texto / legenda (opcional)';

    const bodyRows = data.content_type === 'article' ? 10 : 5;

    const previewSnippet =
        data.excerpt?.trim() ||
        (data.body?.trim()
            ? data.body.trim().slice(0, 300) + (data.body.trim().length > 300 ? '…' : '')
            : data.content_type === 'youtube'
              ? 'Vídeo no YouTube'
              : data.content_type === 'pdf'
                ? 'Documento PDF'
                : data.content_type === 'image'
                  ? 'Imagem'
                  : 'Resumo aparecerá aqui.');

    return (
        <AdminLayout>
            <Head title="News" />
            <PageHeader title="News">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full sm:w-80">
                        <TextInput
                            type="search"
                            name="search"
                            value={search}
                            placeholder="Buscar news…"
                            className="w-full"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {canManage && <AddButton onClick={openCreateModal}>Nova notícia</AddButton>}
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 gap-6 pb-8 md:pb-0 lg:grid-cols-2">
                {posts.data.map((p) => {
                    const hero = p.cover_url || p.image_url;
                    return (
                        <Card key={p.id} className="flex touch-manipulation flex-col gap-4 p-4 sm:p-6 md:p-8">
                            {hero ? (
                                <div className="relative h-40 w-full flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 md:h-48">
                                    <img
                                        src={imageSrc(hero, appUrl)}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement | null;
                                            if (placeholder) placeholder.style.display = 'flex';
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0 hidden items-center justify-center bg-zinc-200 dark:bg-zinc-700"
                                        style={{ display: 'none' }}
                                        aria-hidden
                                    >
                                        <PhotoIcon className="h-12 w-12 text-zinc-400" />
                                    </div>
                                    <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                                        {typeShortLabel(p.content_type ?? 'article')}
                                    </span>
                                    {p.image_url && (
                                        <ImageDownloadButton
                                            src={imageSrc(p.image_url, appUrl)}
                                            appUrl={appUrl}
                                            filenameBase={`noticia-${p.slug}`}
                                            className="absolute right-2 top-2 z-10"
                                        />
                                    )}
                                </div>
                            ) : p.content_type === 'pdf' ? (
                                <div className="relative flex h-40 w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-100 via-zinc-100 to-amber-50 dark:from-rose-950/35 dark:via-zinc-800 dark:to-amber-950/25 md:h-48">
                                    <DocumentTextIcon className="h-14 w-14 text-rose-500/70 dark:text-rose-400/50" />
                                    <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                                        PDF
                                    </span>
                                </div>
                            ) : null}
                            <div className="flex flex-1 flex-col gap-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        {!hero && p.content_type !== 'pdf' && (
                                            <span className="mb-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                {typeShortLabel(p.content_type ?? 'article')}
                                            </span>
                                        )}
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{p.title}</h2>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            <CalendarDaysIcon className="h-4 w-4 shrink-0" />
                                            <span>
                                                {p.published_at
                                                    ? new Date(p.published_at).toLocaleDateString('pt-BR')
                                                    : 'Rascunho'}
                                            </span>
                                            {p.author?.name && <span>• {p.author.name}</span>}
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(p)}
                                                className="min-h-[44px] min-w-[44px] touch-manipulation rounded-xl p-3 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                                title="Editar"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(p.id)}
                                                className="min-h-[44px] min-w-[44px] touch-manipulation rounded-xl p-3 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                                                title="Excluir"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {cardSummary(p) && (
                                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{cardSummary(p)}</p>
                                )}
                                <Link
                                    href={route('mobile.news.show', p.slug)}
                                    className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                                >
                                    Ver na app
                                </Link>
                            </div>
                        </Card>
                    );
                })}

                {posts.data.length === 0 && (
                    <Card className="lg:col-span-2">
                        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                            Nenhuma notícia cadastrada.
                            {canManage && (
                                <>
                                    {' '}
                                    Use <span className="font-medium text-zinc-700 dark:text-zinc-300">Nova notícia</span>{' '}
                                    para criar a primeira.
                                </>
                            )}
                        </p>
                    </Card>
                )}
            </div>

            {posts.last_page > 1 && (
                <div className="mt-6 flex justify-end">
                    <nav className="inline-flex overflow-hidden rounded-full border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                        {posts.links.map((link, index) => (
                            <button
                                key={index}
                                type="button"
                                disabled={!link.url}
                                onClick={() => link.url && router.visit(link.url)}
                                className={`border-l border-zinc-300 px-4 py-2 text-xs first:border-l-0 first:rounded-l-full last:rounded-r-full dark:border-zinc-700 md:text-sm ${
                                    link.active
                                        ? 'bg-zinc-900 font-semibold text-white dark:bg-white dark:text-black'
                                        : !link.url
                                          ? 'cursor-default bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                                          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                </div>
            )}

            {canManage && (
                <Modal show={isModalOpen} onClose={closeModal} maxWidth="2xl">
                    <form onSubmit={submit} className="p-6">
                        <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar notícia' : 'Nova notícia'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="news_content_type" value="Tipo de publicação" />
                                <SelectInput
                                    id="news_content_type"
                                    value={data.content_type}
                                    className="mt-1"
                                    onChange={(e) =>
                                        setData('content_type', e.target.value as ContentType)
                                    }
                                >
                                    <option value="article">Artigo (texto)</option>
                                    <option value="youtube">Vídeo (YouTube)</option>
                                    <option value="pdf">Documento PDF</option>
                                    <option value="image">Só imagem</option>
                                </SelectInput>
                                <InputError message={errors.content_type} className="mt-1" />
                            </div>
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

                            {data.content_type === 'youtube' && (
                                <div>
                                    <InputLabel htmlFor="youtube_url" value="Link do YouTube" />
                                    <TextInput
                                        id="youtube_url"
                                        value={data.youtube_url}
                                        onChange={(e) => setData('youtube_url', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="https://www.youtube.com/watch?v=… ou https://youtu.be/…"
                                    />
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Se não enviar imagem de capa, usamos automaticamente a miniatura do vídeo.
                                    </p>
                                    <InputError message={errors.youtube_url} className="mt-1" />
                                </div>
                            )}

                            {data.content_type === 'pdf' && (
                                <div>
                                    <InputLabel htmlFor="pdf_file" value="Ficheiro PDF" />
                                    <input
                                        id="pdf_file"
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            setData('pdf_file', file);
                                        }}
                                        className="mt-1 block w-full text-sm text-zinc-900 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                    />
                                    {existingPdfUrl && !data.pdf_file && (
                                        <a
                                            href={existingPdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                                        >
                                            <DocumentTextIcon className="h-4 w-4" />
                                            Ver PDF atual
                                        </a>
                                    )}
                                    <InputError message={errors.pdf_file} className="mt-1" />
                                </div>
                            )}

                            <div>
                                <InputLabel htmlFor="body" value={bodyLabel} />
                                <Textarea
                                    id="body"
                                    value={data.body}
                                    onChange={(e) => setData('body', e.target.value)}
                                    rows={bodyRows}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.body} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="image_url" value={imageFieldLabel} />
                                <div className="mt-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                                            {data.image_file && fileThumbUrl ? (
                                                <img
                                                    src={fileThumbUrl}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : data.image_url ? (
                                                <img
                                                    src={imageSrc(data.image_url, appUrl)}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : data.content_type === 'youtube' && data.youtube_url?.trim() ? (
                                                <img
                                                    src={youtubeThumbUrlFromVideoUrl(data.youtube_url.trim()) ?? ''}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <PhotoIcon className="h-5 w-5 text-zinc-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <input
                                                id="image_file"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] ?? null;
                                                    setData('image_file', file);
                                                }}
                                                className="block w-full text-sm text-zinc-900 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                            />
                                            <TextInput
                                                id="image_url"
                                                value={data.image_url}
                                                onChange={(e) => setData('image_url', e.target.value)}
                                                className="block w-full"
                                                placeholder="Ou cole uma URL https://…"
                                            />
                                        </div>
                                    </div>
                                    <InputError message={errors.image_url} className="mt-1" />
                                    <InputError message={errors.image_file} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <InputLabel
                                    htmlFor="published_at"
                                    value="Data de publicação (vazio = publicar agora)"
                                />
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
                        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                Pré-visualização (app)
                            </p>
                            <div className="max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                {previewThumbSrc ? (
                                    <div className="relative">
                                        <img src={previewThumbSrc} alt="" className="h-40 w-full object-cover" />
                                        {data.content_type === 'youtube' && (
                                            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                                <PlayCircleIcon className="h-3.5 w-3.5" />
                                                Vídeo
                                            </span>
                                        )}
                                        {!data.image_file && data.image_url?.trim() && (
                                            <ImageDownloadButton
                                                src={imageSrc(data.image_url, appUrl)}
                                                appUrl={appUrl}
                                                filenameBase={`noticia-${editingId ?? 'preview'}`}
                                                className="absolute right-2 top-2 z-10"
                                            />
                                        )}
                                    </div>
                                ) : data.content_type === 'pdf' && (data.pdf_file || existingPdfUrl) ? (
                                    <div className="flex h-40 items-center justify-center bg-gradient-to-br from-rose-100 via-zinc-100 to-amber-50 dark:from-rose-950/35 dark:via-zinc-900 dark:to-amber-950/25">
                                        <DocumentTextIcon className="h-14 w-14 text-rose-500/70 dark:text-rose-400/50" />
                                    </div>
                                ) : null}
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                        {data.title || 'Título da notícia'}
                                    </h3>
                                    {data.published_at && (
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            {new Date(data.published_at).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    )}
                                    <p className="mt-3 line-clamp-4 text-sm text-zinc-600 dark:text-zinc-300">
                                        {previewSnippet}
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
