import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import {
    PencilIcon,
    TrashIcon,
    CalendarDaysIcon,
    PhotoIcon,
    DocumentTextIcon,
    PlayCircleIcon,
    PowerIcon,
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
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import { useState, useEffect, FormEventHandler, useMemo, useCallback, useRef } from 'react';
import ListSearchHint from '@/Components/ListSearchHint';
import { useDebouncedServerSearch } from '@/hooks/useDebouncedServerSearch';
import { confirmAction } from '@/utils/confirmDialog';
import { buildNewsFormData } from '@/utils/buildNewsFormData';
import {
    applyListModalFormErrors,
    editIdFromListModalRedirect,
    reloadListModalProps,
} from '@/utils/listModalFetchSave';
import {
    submitVolunteerModalFormDataPost,
    submitVolunteerModalFormDataPut,
} from '@/utils/volunteerPipelineModalSave';
import {
    useListModalEditUrl,
    useListModalFromUrl,
    useListModalSaveMessage,
    useSyncFormAfterListReload,
} from '@/hooks/useListModalEditUrl';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import { youtubeThumbUrlFromVideoUrl } from '@/utils/youtube';
import FeedCaptionBody from '@/Components/News/FeedCaptionBody';
import FeedPostHeader, { type FeedPostAuthor } from '@/Components/News/FeedPostHeader';
import NewsCoverImagePicker from '@/Components/News/NewsCoverImagePicker';
import NewsPdfFilePicker, { PDF_MAX_MB } from '@/Components/News/NewsPdfFilePicker';
import VideoPlayOverlay from '@/Components/News/VideoPlayOverlay';
import InstagramViewLink from '@/Components/News/InstagramViewLink';
import { InstagramBrandIcon } from '@/Components/SocialBrandIcons';
import { feedCaptionText } from '@/utils/feedCaption';
import {
    NEWS_INSTAGRAM_FEED_IMAGE_SPECS,
    NEWS_INSTAGRAM_FEED_VIDEO_SPECS,
    NEWS_STANDARD_COVER_SPECS,
} from '@/constants/mediaCoverSpecs';

const NEWS_BODY_MAX_LENGTH = 65000;
const NEWS_EXCERPT_MAX_LENGTH = 500;

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('/')) return `${appUrl}${url}`;
    return url;
}

type ContentType = 'article' | 'youtube' | 'pdf' | 'image' | 'instagram_feed' | 'instagram_link';

interface NewsPost {
    id: number;
    title: string;
    slug: string;
    content_type: ContentType;
    excerpt: string | null;
    body: string;
    youtube_url: string | null;
    instagram_url: string | null;
    image_url: string | null;
    cover_url: string | null;
    pdf_url: string | null;
    video_url: string | null;
    has_video?: boolean;
    published_at: string | null;
    is_active?: boolean;
    created_at: string;
    author?: FeedPostAuthor | null;
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
    config?: {
        entityTitle?: string;
        entityLabel?: string;
        routeBase?: 'news' | 'health';
        mobileShowRoute?: 'mobile.news.show' | 'mobile.health.show';
    };
}

function typeShortLabel(t: ContentType): string {
    switch (t) {
        case 'youtube':
            return 'Vídeo';
        case 'pdf':
            return 'PDF';
        case 'image':
            return 'Imagem';
        case 'instagram_feed':
            return 'Feed';
        case 'instagram_link':
            return 'Instagram';
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
    if (p.content_type === 'instagram_feed') {
        return p.video_url ? 'Vídeo no feed' : 'Publicação no feed';
    }
    if (p.content_type === 'instagram_link') {
        return 'Link para o Instagram';
    }
    return '';
}

export default function Index({ posts, filters, canManage, config }: Props) {
    const resolvedConfig = config ?? {};
    const entityTitle = resolvedConfig.entityTitle ?? 'Notícias';
    const entityLabel = resolvedConfig.entityLabel ?? 'notícia';
    const routeBaseName = resolvedConfig.routeBase ?? 'news';
    const mobileShowRoute = resolvedConfig.mobileShowRoute ?? 'mobile.news.show';
    const routeIndex = `${routeBaseName}.index`;
    const routeStore = `${routeBaseName}.store`;
    const routeUpdate = `${routeBaseName}.update`;
    const routeSetActive = `${routeBaseName}.active`;
    const routeDestroy = `${routeBaseName}.destroy`;

    const pageProps = usePage().props as {
        appUrl?: string;
        currentChurch?: { name: string; logo_url?: string | null } | null;
        defaultBrandLogoUrl?: string;
        auth?: { user?: { name: string; photo_url?: string | null } | null };
    };
    const appUrl = pageProps.appUrl ?? '';
    const publisherName = pageProps.currentChurch?.name ?? 'Nova Semente';
    const publisherLogoUrl = pageProps.currentChurch?.logo_url ?? pageProps.defaultBrandLogoUrl ?? '/logo-ns.png';
    const csrf =
        (pageProps as { csrf_token?: string }).csrf_token ??
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
        '';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const modalScrollRef = useRef<HTMLDivElement>(null);
    const { syncListModalEditUrl } = useListModalEditUrl();
    const showSaveMessage = useListModalSaveMessage();
    const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
    const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
    const {
        value: search,
        setValue: setSearch,
        isBelowMinimum: searchBelowMinimum,
    } = useDebouncedServerSearch({
        serverValue: filters.search ?? '',
        onApply: useCallback(
            (term) => {
                router.get(route(routeIndex), { search: term }, { preserveState: true, replace: true });
            },
            [routeIndex],
        ),
    });
    const { data, setData, errors, reset, clearErrors, setError } = useForm({
        content_type: 'article' as ContentType,
        title: '',
        excerpt: '',
        body: '',
        youtube_url: '',
        instagram_url: '',
        image_url: '',
        published_at: '',
        has_video: false,
        image_file: null as File | null,
        video_file: null as File | null,
        pdf_file: null as File | null,
    });

    const fileThumbUrl = useMemo(() => {
        if (!data.image_file) {
            return null;
        }
        return URL.createObjectURL(data.image_file);
    }, [data.image_file]);

    const videoPreviewUrl = useMemo(() => {
        if (!data.video_file) {
            return null;
        }
        return URL.createObjectURL(data.video_file);
    }, [data.video_file]);

    useEffect(() => {
        return () => {
            if (fileThumbUrl) {
                URL.revokeObjectURL(fileThumbUrl);
            }
        };
    }, [fileThumbUrl]);

    useEffect(() => {
        return () => {
            if (videoPreviewUrl) {
                URL.revokeObjectURL(videoPreviewUrl);
            }
        };
    }, [videoPreviewUrl]);

    const previewThumbSrc =
        fileThumbUrl ||
        (data.image_url?.trim() ? imageSrc(data.image_url, appUrl) : '') ||
        (data.content_type === 'youtube' && data.youtube_url?.trim()
            ? youtubeThumbUrlFromVideoUrl(data.youtube_url.trim()) ?? ''
            : '');

    const applyPostToForm = useCallback(
        (p: NewsPost) => {
            setExistingPdfUrl(p.pdf_url ?? null);
            setExistingVideoUrl(p.video_url ?? null);
            const isPdfPost = (p.content_type ?? 'article') === 'pdf';
            setData({
                content_type: p.content_type ?? 'article',
                title: p.title,
                excerpt: isPdfPost ? (p.excerpt ?? p.body ?? '') : (p.excerpt ?? ''),
                body: isPdfPost ? '' : (p.body ?? ''),
                youtube_url: p.youtube_url ?? '',
                instagram_url: p.instagram_url ?? '',
                image_url: p.image_url ?? '',
                published_at: p.published_at ? p.published_at.substring(0, 16) : '',
                has_video: Boolean(p.has_video),
                image_file: null,
                video_file: null,
                pdf_file: null,
            });
        },
        [setData],
    );

    const { markSyncAfterReload } = useSyncFormAfterListReload(posts.data, editingId, isModalOpen, applyPostToForm);

    const openEditModal = useCallback(
        (p: NewsPost) => {
            setIsEditing(true);
            setEditingId(p.id);
            setSaveMessage(null);
            setSaveError(null);
            syncListModalEditUrl(p.id);
            applyPostToForm(p);
            clearErrors();
            setIsModalOpen(true);
        },
        [applyPostToForm, clearErrors, syncListModalEditUrl],
    );

    useListModalFromUrl(posts.data, isModalOpen, editingId, openEditModal);

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setSaveMessage(null);
        setSaveError(null);
        syncListModalEditUrl(null);
        setExistingPdfUrl(null);
        setExistingVideoUrl(null);
        reset();
        clearErrors();
        setData('content_type', 'article');
        setData('image_file', null);
        setData('video_file', null);
        setData('pdf_file', null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSaveMessage(null);
        setSaveError(null);
        syncListModalEditUrl(null);
        setExistingPdfUrl(null);
        setExistingVideoUrl(null);
        reset();
        setEditingId(null);
        setIsEditing(false);
        setData('image_file', null);
        setData('video_file', null);
        setData('pdf_file', null);
    };

    const scrollModalToTop = useCallback(() => {
        const dialog = modalScrollRef.current?.closest('[role="dialog"]');
        const scroller = dialog?.querySelector('.overflow-y-auto');
        if (scroller instanceof HTMLElement) {
            scroller.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        void (async () => {
            if (saving) {
                return;
            }
            clearErrors();
            setSaveError(null);
            setSaveMessage(null);

            if (!data.title.trim()) {
                setError('title', 'Informe o título.');
                setSaveError('Informe o título antes de publicar.');
                scrollModalToTop();
                return;
            }

            if (data.content_type === 'article' && !data.body.trim()) {
                setError('body', 'Escreva o conteúdo da publicação.');
                setSaveError('Escreva o conteúdo antes de publicar.');
                scrollModalToTop();
                return;
            }

            if (data.body.length > NEWS_BODY_MAX_LENGTH) {
                setError('body', `O conteúdo pode ter no máximo ${NEWS_BODY_MAX_LENGTH.toLocaleString('pt-BR')} caracteres.`);
                setSaveError(
                    `O texto está muito longo (${data.body.length.toLocaleString('pt-BR')} caracteres). Reduza o conteúdo ou divida em partes.`,
                );
                scrollModalToTop();
                return;
            }

            if (data.image_url.trim().length > 1024) {
                setError('image_url', 'A URL da capa é muito longa. Envie a imagem como arquivo.');
                setSaveError('A URL da capa é muito longa. Use «Enviar arquivo» em vez de colar um link enorme.');
                scrollModalToTop();
                return;
            }

            if (data.excerpt.length > NEWS_EXCERPT_MAX_LENGTH) {
                setError('excerpt', `O resumo pode ter no máximo ${NEWS_EXCERPT_MAX_LENGTH} caracteres.`);
                setSaveError(
                    `O resumo está muito longo (${data.excerpt.length} caracteres). Use no máximo ${NEWS_EXCERPT_MAX_LENGTH} caracteres.`,
                );
                scrollModalToTop();
                return;
            }

            if (!csrf.trim()) {
                setSaveError('Token de segurança ausente. Atualize a página (F5) e tente novamente.');
                scrollModalToTop();
                return;
            }

            if (data.content_type === 'pdf') {
                if (!isEditing && !data.pdf_file) {
                    setError('pdf_file', 'Envie o arquivo PDF.');
                    setSaveError('Escolha o arquivo PDF para publicar.');
                    scrollModalToTop();
                    return;
                }
                if (data.pdf_file && data.pdf_file.size > PDF_MAX_MB * 1024 * 1024) {
                    setError('pdf_file', `O PDF pode ter no máximo ${PDF_MAX_MB} MB.`);
                    setSaveError(`O PDF selecionado é grande demais (máximo ${PDF_MAX_MB} MB).`);
                    scrollModalToTop();
                    return;
                }
            }

            setSaving(true);
            try {
                const payload =
                    data.content_type === 'pdf'
                        ? { ...data, body: '' }
                        : data;
                const formData = buildNewsFormData(payload);
                const result =
                    isEditing && editingId
                        ? await submitVolunteerModalFormDataPut(route(routeUpdate, editingId), formData, csrf)
                        : await submitVolunteerModalFormDataPost(route(routeStore), formData, csrf);

                if (!result.ok) {
                    applyListModalFormErrors(result.errors, setError);
                    const firstFieldError = Object.values(result.errors)
                        .map((message) => (Array.isArray(message) ? message[0] : message))
                        .find(Boolean);
                    setSaveError(
                        result.message ??
                            firstFieldError ??
                            'Não foi possível salvar. Revise os campos e tente novamente.',
                    );
                    scrollModalToTop();
                    return;
                }

                await reloadListModalProps(['posts']);

                if (isEditing) {
                    showSaveMessage(setSaveMessage, 'Publicação salva com sucesso.');
                    markSyncAfterReload();
                    return;
                }

                showSaveMessage(setSaveMessage, 'Publicação criada com sucesso.');
                const createdId = editIdFromListModalRedirect(result.redirectLocation ?? null);
                if (createdId) {
                    markSyncAfterReload();
                    setIsEditing(true);
                    setEditingId(createdId);
                    syncListModalEditUrl(createdId);
                }
            } catch {
                setSaveError('Erro de rede ao salvar. Verifique a conexão e tente novamente.');
                scrollModalToTop();
            } finally {
                setSaving(false);
            }
        })();
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: `Remover ${entityLabel}?`,
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route(routeDestroy, id));
        }
    };

    const handleSetActive = async (p: NewsPost, isActive: boolean) => {
        const label = resolvedConfig.entityLabel ?? 'publicação';
        const ok = await confirmAction({
            title: `${isActive ? 'Ativar' : 'Desativar'} ${label}?`,
            text: isActive
                ? 'Ela voltará a aparecer na app (quando estiver publicada).'
                : 'Ela vai sumir da app, mas continua visível no painel.',
            confirmButtonText: isActive ? 'Ativar' : 'Desativar',
            danger: !isActive,
            icon: 'warning',
        });
        if (!ok) return;
        router.patch(route(routeSetActive, p.id), { is_active: isActive }, { preserveScroll: true });
    };

    const isInstagramFeed = data.content_type === 'instagram_feed';
    const isInstagramLink = data.content_type === 'instagram_link';
    const isPdf = data.content_type === 'pdf';

    const previewVideoSrc = videoPreviewUrl || (isInstagramFeed && existingVideoUrl ? existingVideoUrl : '');
    const previewHasVideo = Boolean(previewVideoSrc);

    const imageFieldLabel = isInstagramFeed
        ? 'Imagem (opcional — 1080 × 1350 px, 4:5; capa do vídeo)'
        : data.content_type === 'image'
          ? 'Imagem (obrigatória — 16:10)'
          : isPdf
            ? 'Capa na lista (opcional — 16:10)'
          : data.content_type === 'youtube'
            ? 'Imagem de capa (opcional — 16:10; se vazio, usa miniatura do YouTube)'
            : isInstagramLink
              ? 'Imagem de capa (opcional — 16:10)'
              : 'Imagem de capa (opcional — 16:10)';

    const bodyLabel = data.content_type === 'article'
        ? 'Conteúdo'
        : isInstagramFeed || isInstagramLink
          ? 'Legenda'
          : 'Texto complementar (opcional)';

    const bodyRows =
        data.content_type === 'article' ? 10 : isInstagramFeed || isInstagramLink ? 6 : 4;

    const showBodyField =
        data.content_type === 'article' ||
        isInstagramFeed ||
        isInstagramLink ||
        data.content_type === 'image';

    const previewCaptionBody = data.body?.trim()
        ? isInstagramFeed
            ? feedCaptionText(data.body, data.title)
            : data.body.trim().slice(0, 300) + (data.body.trim().length > 300 ? '…' : '')
        : '';

    const instagramPreviewCaption = isInstagramFeed ? previewCaptionBody : '';

    const previewAuthor: FeedPostAuthor | null = (() => {
        if (!isInstagramFeed) return null;
        if (isEditing && editingId) {
            const existing = posts.data.find((p) => p.id === editingId);
            if (existing?.author?.name) return existing.author;
        }
        const user = pageProps.auth?.user;
        if (user?.name) {
            return { name: user.name, photo_url: user.photo_url ?? null };
        }
        return null;
    })();

    const previewSnippet =
        (isInstagramFeed ? '' : data.excerpt?.trim()) ||
        (previewCaptionBody
            ? previewCaptionBody
            : data.content_type === 'youtube'
              ? 'Vídeo no YouTube'
              : isPdf
                ? 'Documento PDF'
                : data.content_type === 'image'
                  ? 'Imagem'
                  : data.content_type === 'instagram_feed'
                    ? 'Legenda do feed'
                    : isInstagramLink
                      ? 'Publicação no Instagram'
                      : 'Resumo aparecerá aqui.');

    return (
        <AdminLayout>
            <Head title={entityTitle} />
            <PageHeader
                title={entityTitle}
                actions={canManage ? <AddButton variant="icon" onClick={openCreateModal} title={`Nova ${entityLabel}`}>Nova {entityLabel}</AddButton> : undefined}
            >
                <div className="w-full max-w-md">
                    <TextInput
                        type="search"
                        name="search"
                        value={search}
                        placeholder={`Buscar ${entityTitle.toLowerCase()}...`}
                        className="w-full"
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <ListSearchHint show={searchBelowMinimum} className="mt-1" />
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 gap-6 pb-8 md:pb-0 lg:grid-cols-2">
                {posts.data.map((p) => {
                    const hero = p.cover_url || p.image_url;
                    const feedVideo = p.content_type === 'instagram_feed' && p.video_url;
                    const feedAspect = feedVideo ? 'aspect-[9/16]' : 'aspect-[4/5]';
                    const isActive = p.is_active ?? true;
                    return (
                        <Card key={p.id} className="flex touch-manipulation flex-col gap-4 p-4 sm:p-6 md:p-8">
                            {feedVideo ? (
                                <div
                                    className={`relative w-full flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-950 ${feedAspect} max-h-80 md:max-h-96`}
                                >
                                    <video
                                        src={imageSrc(p.video_url, appUrl)}
                                        className="h-full w-full object-cover"
                                        muted
                                        playsInline
                                        preload="metadata"
                                        poster={hero ? imageSrc(hero, appUrl) : undefined}
                                    />
                                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                                        <PlayCircleIcon className="h-3.5 w-3.5" />
                                        Vídeo
                                    </span>
                                </div>
                            ) : hero ? (
                                <div
                                    className={`group relative w-full flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 ${
                                        p.content_type === 'instagram_feed'
                                            ? `${feedAspect} max-h-80 md:max-h-96`
                                            : 'h-40 md:h-48'
                                    }`}
                                >
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
                                    {p.has_video ? <VideoPlayOverlay /> : null}
                                    <span className="absolute left-2 top-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
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
                            ) : p.content_type === 'instagram_link' ? (
                                <div className="group relative flex h-40 w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-pink-100 via-purple-50 to-rose-100 dark:from-pink-950/40 dark:via-zinc-800 dark:to-purple-950/30 md:h-48">
                                    <InstagramBrandIcon className="h-14 w-14 text-pink-600/80 dark:text-pink-400/70" />
                                    {p.has_video ? <VideoPlayOverlay /> : null}
                                    <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                                        Instagram
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
                                            {!isActive && (
                                                <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                    Inativo
                                                </span>
                                            )}
                                            {p.author?.name && <span>• {p.author.name}</span>}
                                        </div>
                                    </div>
                                    {canManage && (
                                        <ListCardActionRow className="shrink-0 gap-1 sm:w-auto">
                                            <ListCardIconActionButton
                                                label={isActive ? 'Desativar' : 'Ativar'}
                                                icon={<PowerIcon className="h-5 w-5" />}
                                                onClick={() => handleSetActive(p, !isActive)}
                                            />
                                            <ListCardIconActionButton
                                                label="Editar"
                                                icon={<PencilIcon className="h-5 w-5" />}
                                                onClick={() => openEditModal(p)}
                                            />
                                            <ListCardIconActionButton
                                                label="Excluir"
                                                icon={<TrashIcon className="h-5 w-5" />}
                                                tone="danger"
                                                onClick={() => handleDelete(p.id)}
                                            />
                                        </ListCardActionRow>
                                    )}
                                </div>
                                {cardSummary(p) && (
                                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{cardSummary(p)}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link
                                        href={route(mobileShowRoute, p.slug)}
                                        className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                                    >
                                        Ver na app
                                    </Link>
                                    {p.instagram_url ? <InstagramViewLink href={p.instagram_url} className="text-xs" /> : null}
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {posts.data.length === 0 && (
                    <Card className="lg:col-span-2">
                        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                            Nenhuma {entityLabel} cadastrada.
                            {canManage && (
                                <>
                                    {' '}
                                    Use <span className="font-medium text-zinc-700 dark:text-zinc-300">Nova {entityLabel}</span>{' '}
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
                <Modal
                    show={isModalOpen}
                    onClose={closeModal}
                    maxWidth="2xl"
                    footer={
                        <div className="space-y-3">
                            {saveError ? (
                                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                                    {saveError}
                                </p>
                            ) : null}
                            {saveMessage ? (
                                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                                    {saveMessage}
                                </p>
                            ) : null}
                            <div className="flex justify-end gap-2">
                                <SecondaryButton type="button" onClick={closeModal}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton type="submit" form="news-modal-form" disabled={saving}>
                                    {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Publicar'}
                                </PrimaryButton>
                            </div>
                        </div>
                    }
                >
                    <form id="news-modal-form" onSubmit={submit} className="p-6">
                        <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
                            {isEditing ? `Editar ${entityLabel}` : `Nova ${entityLabel}`}
                        </h2>
                        <div ref={modalScrollRef} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="news_content_type" value="Tipo de publicação" />
                                <SelectInput
                                    id="news_content_type"
                                    value={data.content_type}
                                    className="mt-1"
                                    onChange={(e) => {
                                        const next = e.target.value as ContentType;
                                        setData('content_type', next);
                                        if (next === 'youtube') {
                                            setData('has_video', true);
                                        }
                                    }}
                                >
                                    <option value="article">Artigo (texto)</option>
                                    <option value="youtube">Vídeo (YouTube)</option>
                                    <option value="pdf">Documento PDF</option>
                                    <option value="image">Só imagem</option>
                                    <option value="instagram_feed">Feed Instagram</option>
                                    <option value="instagram_link">Link do Instagram</option>
                                </SelectInput>
                                {isInstagramFeed && (
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Republicação manual: imagem + legenda, exibida em coluna no app (sem ligação à conta
                                        Instagram). Imagem <strong>1080×1350</strong> (4:5) ou vídeo{' '}
                                        <strong>1080×1920</strong> (9:16).
                                    </p>
                                )}
                                {isInstagramLink && (
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Cole o link do post ou reel e use <strong>Legenda</strong> para o texto completo da
                                        publicação (até 2.200 caracteres do Instagram).
                                    </p>
                                )}
                                {isPdf && (
                                    <p className="mt-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
                                        Envie o <strong>PDF</strong>, escolha uma <strong>capa</strong> para a lista (opcional) e,
                                        se quiser, um <strong>texto curto de apresentação</strong>. O conteúdo principal fica no
                                        documento.
                                    </p>
                                )}
                                <InputError message={errors.content_type} className="mt-1" />
                            </div>
                            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                                <Checkbox
                                    id="news_has_video"
                                    checked={data.has_video}
                                    onChange={(e) => setData('has_video', e.target.checked)}
                                />
                                <div className="min-w-0">
                                    <InputLabel htmlFor="news_has_video" value="Tem vídeo" className="cursor-pointer" />
                                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        Marque para mostrar o ícone de play na capa (lista e feed). No detalhe a imagem
                                        abre completa, sem play.
                                    </p>
                                    <InputError message={errors.has_video} className="mt-1" />
                                </div>
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

                            {isPdf ? (
                                <>
                                    <NewsPdfFilePicker
                                        file={data.pdf_file}
                                        existingUrl={existingPdfUrl}
                                        error={errors.pdf_file}
                                        onFileChange={(file) => setData('pdf_file', file)}
                                    />

                                    <NewsCoverImagePicker
                                        label={imageFieldLabel}
                                        specsId="news_pdf_cover_specs"
                                        specsText={
                                            <>
                                                <span className="font-semibold">Capa no app:</span> {NEWS_STANDARD_COVER_SPECS}
                                            </>
                                        }
                                        imageFile={data.image_file}
                                        fileThumbUrl={fileThumbUrl}
                                        imageUrl={data.image_url}
                                        resolvedThumbSrc={
                                            data.image_url?.trim() ? imageSrc(data.image_url, appUrl) : ''
                                        }
                                        imageUrlError={errors.image_url}
                                        imageFileError={errors.image_file}
                                        onImageFileChange={(file) => setData('image_file', file)}
                                        onImageUrlChange={(url) => setData('image_url', url)}
                                    />

                                    <div>
                                        <InputLabel htmlFor="excerpt" value="Apresentação (opcional)" />
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Texto curto que aparece na lista e acima do PDF no app. Deixe vazio se o título
                                            bastar.
                                        </p>
                                        <Textarea
                                            id="excerpt"
                                            value={data.excerpt}
                                            maxLength={NEWS_EXCERPT_MAX_LENGTH}
                                            onChange={(e) => setData('excerpt', e.target.value)}
                                            rows={3}
                                            className="mt-1 block w-full"
                                        />
                                        {data.excerpt.length > 0 && (
                                            <p
                                                className={`mt-1 text-xs ${
                                                    data.excerpt.length > NEWS_EXCERPT_MAX_LENGTH
                                                        ? 'font-medium text-red-600 dark:text-red-400'
                                                        : 'text-zinc-500 dark:text-zinc-400'
                                                }`}
                                            >
                                                {data.excerpt.length.toLocaleString('pt-BR')} /{' '}
                                                {NEWS_EXCERPT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres
                                            </p>
                                        )}
                                        <InputError message={errors.excerpt} className="mt-1" />
                                    </div>
                                </>
                            ) : (
                                <>
                            {isInstagramLink && (
                                <div>
                                    <InputLabel htmlFor="instagram_url" value="Link do Instagram" />
                                    <TextInput
                                        id="instagram_url"
                                        value={data.instagram_url}
                                        onChange={(e) => setData('instagram_url', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="https://www.instagram.com/p/… ou …/reel/…"
                                    />
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Cole o link do post, reel ou IGTV. Na app, aparecerá o botão «Ver no Instagram».
                                    </p>
                                    <InputError message={errors.instagram_url} className="mt-1" />
                                </div>
                            )}

                            {!isInstagramFeed && (
                                <div>
                                    <InputLabel htmlFor="excerpt" value="Resumo (opcional)" />
                                    {isInstagramLink && (
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Texto curto para listas e cards. Para a legenda completa, use o campo Legenda
                                            abaixo.
                                        </p>
                                    )}
                                    <Textarea
                                        id="excerpt"
                                        value={data.excerpt}
                                        maxLength={NEWS_EXCERPT_MAX_LENGTH}
                                        onChange={(e) => setData('excerpt', e.target.value)}
                                        rows={2}
                                        className="mt-1 block w-full"
                                    />
                                    {data.excerpt.length > 0 && (
                                        <p
                                            className={`mt-1 text-xs ${
                                                data.excerpt.length > NEWS_EXCERPT_MAX_LENGTH
                                                    ? 'font-medium text-red-600 dark:text-red-400'
                                                    : 'text-zinc-500 dark:text-zinc-400'
                                            }`}
                                        >
                                            {data.excerpt.length.toLocaleString('pt-BR')} /{' '}
                                            {NEWS_EXCERPT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres
                                        </p>
                                    )}
                                    <InputError message={errors.excerpt} className="mt-1" />
                                </div>
                            )}

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

                            {showBodyField && (
                            <div>
                                <InputLabel htmlFor="body" value={bodyLabel} />
                                <Textarea
                                    id="body"
                                    value={data.body}
                                    onChange={(e) => setData('body', e.target.value)}
                                    rows={bodyRows}
                                    className="mt-1 block w-full"
                                />
                                {(isInstagramFeed || isInstagramLink) && (
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Use <kbd className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Enter</kbd> para
                                        nova linha na legenda (o app respeita as quebras).
                                    </p>
                                )}
                                <InputError message={errors.body} className="mt-1" />
                                {data.content_type === 'article' && data.body.length > 0 && (
                                    <p
                                        className={`mt-1 text-xs ${
                                            data.body.length > NEWS_BODY_MAX_LENGTH
                                                ? 'font-medium text-red-600 dark:text-red-400'
                                                : 'text-zinc-500 dark:text-zinc-400'
                                        }`}
                                    >
                                        {data.body.length.toLocaleString('pt-BR')} /{' '}
                                        {NEWS_BODY_MAX_LENGTH.toLocaleString('pt-BR')} caracteres
                                    </p>
                                )}
                            </div>
                            )}

                            <div>
                                <InputLabel htmlFor="image_url" value={imageFieldLabel} />
                                {isInstagramFeed ? (
                                    <p
                                        id="instagram_feed_image_specs"
                                        className="mt-1.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
                                    >
                                        <span className="font-semibold">Imagem:</span> {NEWS_INSTAGRAM_FEED_IMAGE_SPECS}
                                    </p>
                                ) : (
                                    <p
                                        id="news_cover_specs"
                                        className="mt-1.5 rounded-xl border border-teal-200/80 bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/35 dark:text-teal-100"
                                    >
                                        <span className="font-semibold">Capa no app:</span> {NEWS_STANDARD_COVER_SPECS}
                                    </p>
                                )}
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
                                                accept={isInstagramFeed ? 'image/jpeg,image/png,image/webp' : GALLERY_IMAGE_ACCEPT}
                                                aria-describedby={
                                                    isInstagramFeed ? 'instagram_feed_image_specs' : 'news_cover_specs'
                                                }
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

                            {isInstagramFeed && (
                                <div>
                                    <InputLabel htmlFor="instagram_url_feed" value="Link no Instagram (opcional)" />
                                    <TextInput
                                        id="instagram_url_feed"
                                        value={data.instagram_url}
                                        onChange={(e) => setData('instagram_url', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="https://www.instagram.com/p/… ou …/reel/…"
                                    />
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Se a publicação original estiver no Instagram, cole o link para exibir o botão
                                        «Ver no Instagram» na app (além da imagem ou vídeo enviados acima).
                                    </p>
                                    <InputError message={errors.instagram_url} className="mt-1" />
                                </div>
                            )}

                            {!isInstagramFeed && !isInstagramLink && (
                                <div>
                                    <InputLabel htmlFor="instagram_url_optional" value="Link no Instagram (opcional)" />
                                    <TextInput
                                        id="instagram_url_optional"
                                        value={data.instagram_url}
                                        onChange={(e) => setData('instagram_url', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="https://www.instagram.com/p/… ou …/reel/…"
                                    />
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Se houver publicação no Instagram, a app mostra o botão «Ver no Instagram».
                                    </p>
                                    <InputError message={errors.instagram_url} className="mt-1" />
                                </div>
                            )}

                            {isInstagramFeed && (
                                <div>
                                    <InputLabel htmlFor="video_file" value="Vídeo do post (opcional — 1080 × 1920 px, 9:16)" />
                                    <p
                                        id="instagram_feed_video_specs"
                                        className="mt-1.5 rounded-xl border border-violet-200/80 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/35 dark:text-violet-100"
                                    >
                                        <span className="font-semibold">Tamanho do vídeo:</span> {NEWS_INSTAGRAM_FEED_VIDEO_SPECS}
                                    </p>
                                    <input
                                        id="video_file"
                                        type="file"
                                        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                                        aria-describedby="instagram_feed_video_specs"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            setData('video_file', file);
                                            if (file) {
                                                setData('has_video', true);
                                            }
                                        }}
                                        className="mt-2 block w-full text-sm text-zinc-900 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                    />
                                    {existingVideoUrl && !data.video_file && (
                                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            Vídeo atual mantido. Envie um novo arquivo para substituir.
                                        </p>
                                    )}
                                    <InputError message={errors.video_file} className="mt-1" />
                                </div>
                            )}

                                </>
                            )}

                            <div>
                                <InputLabel
                                    htmlFor="published_at"
                                    value="Data de publicação (vazio = publicar agora)"
                                />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Se escolher uma data no futuro, a publicação só vai aparecer no app a partir dessa data.
                                    Para remover do app sem apagar, use o botão <strong>Ativar/Desativar</strong> na lista.
                                </p>
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
                            <div className={`max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${isInstagramFeed ? 'max-w-xs' : ''}`}>
                                {isInstagramFeed && (
                                    <FeedPostHeader
                                        title={data.title || 'Título da publicação'}
                                        author={previewAuthor}
                                        churchName={publisherName}
                                        churchLogoUrl={publisherLogoUrl}
                                        publishedAt={data.published_at || null}
                                        compact
                                    />
                                )}
                                {previewHasVideo ? (
                                    <div className="relative aspect-[9/16] bg-zinc-950">
                                        <video
                                            src={previewVideoSrc}
                                            className="h-full w-full object-cover"
                                            controls
                                            playsInline
                                            muted
                                            poster={previewThumbSrc || undefined}
                                        />
                                    </div>
                                ) : previewThumbSrc ? (
                                    <div className="group relative">
                                        <img
                                            src={previewThumbSrc}
                                            alt=""
                                            className={`w-full object-cover ${
                                                isInstagramFeed ? 'aspect-[4/5]' : 'h-40'
                                            }`}
                                        />
                                        {data.has_video ? <VideoPlayOverlay /> : null}
                                        {data.content_type === 'youtube' && (
                                            <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
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
                                ) : isInstagramLink ? (
                                    <div className="group relative flex h-40 flex-col items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-rose-100 px-4 dark:from-pink-950/40 dark:via-zinc-900 dark:to-purple-950/30">
                                        <InstagramBrandIcon className="h-12 w-12 text-pink-600 dark:text-pink-400" />
                                        {data.has_video ? <VideoPlayOverlay /> : null}
                                        {data.instagram_url?.trim() ? (
                                            <p className="relative z-10 mt-2 text-center text-xs font-medium text-pink-700 dark:text-pink-300">
                                                Ver no Instagram
                                            </p>
                                        ) : (
                                            <p className="relative z-10 text-center text-xs text-zinc-600 dark:text-zinc-400">
                                                Cole o link do Instagram acima
                                            </p>
                                        )}
                                    </div>
                                ) : null}
                                <div className="p-4">
                                    {isInstagramFeed ? (
                                        instagramPreviewCaption ? (
                                            <FeedCaptionBody
                                                caption={instagramPreviewCaption}
                                                clampLines
                                                className="text-zinc-600 dark:text-zinc-300"
                                            />
                                        ) : null
                                    ) : (
                                        <>
                                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                                {data.title || `Título da ${entityLabel}`}
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
