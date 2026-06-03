import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { BookOpenIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';

function libraryCategoryUsesExternalUrl(category: string): boolean {
    return category === 'meditation' || category === 'lesson';
}

interface CategoryOption {
    value: string;
    label: string;
}

interface LibraryBookRow {
    id: number;
    title: string;
    subtitle: string | null;
    description?: string | null;
    category: string;
    cover_url: string | null;
    pdf_url: string | null;
    external_url?: string | null;
    published_at: string | null;
    created_at: string;
    author?: { name: string } | null;
}

interface FormOldPayload {
    title?: string;
    subtitle?: string;
    description?: string;
    category?: string;
    external_url?: string;
    published_at?: string;
}

interface Props {
    books: LibraryBookRow[];
    canManage: boolean;
    categories: CategoryOption[];
    formOld?: FormOldPayload;
    /** Biblioteca indisponível (ex.: base de dados ainda não preparada). */
    librarySetupMessage?: string | null;
}

const LIBRARY_FORM_KEYS = [
    'title',
    'subtitle',
    'description',
    'category',
    'external_url',
    'cover_image_file',
    'pdf_file',
    'published_at',
] as const;

const LIBRARY_EDITING_KEY = 'library_editing_id';

function formatPublicationMonthYear(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' });
}

/** Valor `YYYY-MM` para o campo mês (a partir de old input ou ISO da BD). */
function publishedMonthFromStored(raw: string | undefined | null): string {
    if (typeof raw !== 'string' || raw.trim() === '') return '';
    const s = raw.trim();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    if (s.length >= 7 && /^\d{4}-\d{2}/.test(s)) return s.substring(0, 7);
    return '';
}

function categoryLabel(categories: CategoryOption[], value: string): string {
    return categories.find((c) => c.value === value)?.label ?? value;
}

export default function LibraryBooksIndex({
    books,
    canManage,
    categories,
    formOld = {},
    librarySetupMessage = null,
}: Props) {
    const page = usePage();
    const canManageSettings =
        (page.props as { auth?: { canManageSettings?: boolean } }).auth?.canManageSettings === true;
    const pageErrors = (page.props as { errors?: Record<string, string> }).errors ?? {};
    const hasLibraryValidationErrors = LIBRARY_FORM_KEYS.some((k) => Boolean(pageErrors[k]));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [coverCompressing, setCoverCompressing] = useState(false);
    const [coverCompressError, setCoverCompressError] = useState<string | null>(null);

    const defaultCategory = categories[0]?.value ?? 'books';
    const initialCategory =
        typeof formOld.category === 'string' && categories.some((c) => c.value === formOld.category)
            ? formOld.category
            : defaultCategory;
    const initialPublished = publishedMonthFromStored(formOld.published_at);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        title: typeof formOld.title === 'string' ? formOld.title : '',
        subtitle: typeof formOld.subtitle === 'string' ? formOld.subtitle : '',
        description: typeof formOld.description === 'string' ? formOld.description : '',
        category: initialCategory,
        external_url: typeof formOld.external_url === 'string' ? formOld.external_url : '',
        cover_image_file: null as File | null,
        pdf_file: null as File | null,
        published_at: initialPublished,
    });

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
            title: typeof o.title === 'string' ? o.title : prev.title,
            subtitle: typeof o.subtitle === 'string' ? o.subtitle : prev.subtitle,
            description: typeof o.description === 'string' ? o.description : prev.description,
            category:
                typeof o.category === 'string' && categories.some((c) => c.value === o.category)
                    ? o.category
                    : prev.category,
            external_url: typeof o.external_url === 'string' ? o.external_url : prev.external_url,
            published_at:
                typeof o.published_at === 'string' && o.published_at !== ''
                    ? publishedMonthFromStored(o.published_at)
                    : prev.published_at,
            cover_image_file: null,
            pdf_file: null,
        }));
    }, [formOldJson, formOld, categories, setData]);

    useEffect(() => {
        if (!libraryCategoryUsesExternalUrl(data.category) && data.external_url.trim() !== '') {
            setData('external_url', '');
        }
    }, [data.category, data.external_url, setData]);

    /** Fecha o modal quando o envio falha (validação, rede, etc.) para o alerta na página ficar visível. */
    const dismissModalOnFormError = () => {
        sessionStorage.removeItem(LIBRARY_EDITING_KEY);
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingId(null);
        setCoverCompressing(false);
        setCoverCompressError(null);
    };

    const openCreateModal = () => {
        sessionStorage.removeItem(LIBRARY_EDITING_KEY);
        setIsEditing(false);
        setEditingId(null);
        reset();
        setData((prev) => ({
            ...prev,
            title: '',
            subtitle: '',
            description: '',
            category: categories[0]?.value ?? 'books',
            external_url: '',
            cover_image_file: null,
            pdf_file: null,
            published_at: '',
        }));
        clearErrors();
        setCoverCompressing(false);
        setCoverCompressError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (b: LibraryBookRow) => {
        setIsEditing(true);
        setEditingId(b.id);
        setData({
            title: b.title,
            subtitle: b.subtitle ?? '',
            description: b.description ?? '',
            category: b.category,
            external_url: b.external_url ?? '',
            cover_image_file: null,
            pdf_file: null,
            published_at: publishedMonthFromStored(b.published_at),
        });
        clearErrors();
        setCoverCompressing(false);
        setCoverCompressError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        sessionStorage.removeItem(LIBRARY_EDITING_KEY);
        setIsModalOpen(false);
        setIsEditing(false);
        reset();
        setEditingId(null);
        setCoverCompressing(false);
        setCoverCompressError(null);
    };

    const finishSubmit = () => {
        clearErrors();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            sessionStorage.setItem(LIBRARY_EDITING_KEY, String(editingId));
            put(route('library-books.update', editingId), {
                ...inertiaListModalSave,
                onSuccess: finishSubmit,
                onError: dismissModalOnFormError,
                forceFormData: true,
            });
        } else {
            sessionStorage.removeItem(LIBRARY_EDITING_KEY);
            post(route('library-books.store'), {
                ...inertiaListModalSave,
                onSuccess: finishSubmit,
                onError: dismissModalOnFormError,
                forceFormData: true,
            });
        }
    };

    const libraryErrorMessages = useMemo(() => {
        const out: string[] = [];
        for (const k of LIBRARY_FORM_KEYS) {
            const m = pageErrors[k];
            if (m && !out.includes(m)) {
                out.push(m);
            }
        }
        return out;
    }, [pageErrors]);

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover publicação?',
            text: 'O PDF e a capa serão removidos do armazenamento.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('library-books.destroy', id));
        }
    };

    const items = useMemo(() => books, [books]);

    return (
        <AdminLayout>
            <Head title="Biblioteca" />

            <PageHeader
                title="Biblioteca"
                subtitle={
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                        <span
                            className="inline-flex w-fit shrink-0 items-center rounded-md bg-brand-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
                            title="Sem custo para quem usa a app"
                        >
                            Grátis
                        </span>
                        <p className="min-w-0 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Publique aqui livros, revistas e materiais em PDF que ficarão disponíveis para toda a comunidade
                            no app.
                        </p>
                    </div>
                }
                actions={
                    canManage && !librarySetupMessage ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {canManageSettings ? (
                                <Link
                                    href={route('settings.index')}
                                    className="inline-flex items-center rounded-xl border border-teal-600/40 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-950/50 dark:text-teal-100 dark:hover:bg-teal-900/60"
                                >
                                    Lição e meditação
                                </Link>
                            ) : null}
                            <AddButton variant="icon" onClick={openCreateModal} title="Nova publicação">
                                Nova publicação
                            </AddButton>
                        </div>
                    ) : undefined
                }
            />

            {librarySetupMessage ? (
                <div
                    role="alert"
                    className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
                >
                    <p className="font-semibold">Biblioteca ainda não disponível</p>
                    <p className="mt-2 leading-relaxed">{librarySetupMessage}</p>
                </div>
            ) : null}

            {hasLibraryValidationErrors && libraryErrorMessages.length > 0 ? (
                <div
                    role="alert"
                    className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
                >
                    <p className="font-semibold">Não foi possível salvar. Corrija os campos abaixo e tente de novo.</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {libraryErrorMessages.map((msg, idx) => (
                            <li key={`${idx}-${msg}`}>{msg}</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-red-800/90 dark:text-red-200/80">
                        Volte a escolher capa e PDF (se aplicável) se precisar de alterar os arquivos (o browser não os mantém após o envio).
                    </p>
                </div>
            ) : null}

            <div className="w-full space-y-5">
                {items.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <BookOpenIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                            {librarySetupMessage ? 'Configuração pendente' : 'Nenhuma publicação na biblioteca'}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1 max-w-md mx-auto">
                            {librarySetupMessage
                                ? librarySetupMessage
                                : 'Adicione o nome, a capa e o conteúdo (PDF ou, em Meditação, um link externo). Os membros acedem em Mais → Biblioteca.'}
                        </p>
                        {canManage && !librarySetupMessage && (
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                <AddButton variant="icon" onClick={openCreateModal} title="Nova publicação">
                                    Nova publicação
                                </AddButton>
                            </div>
                        )}
                    </div>
                ) : (
                    items.map((b) => {
                        const publishedLabel = b.published_at ? formatPublicationMonthYear(b.published_at) : 'Rascunho';
                        const openHref = b.pdf_url ?? b.external_url ?? null;
                        const openTitle = b.pdf_url ? 'Abrir PDF' : b.external_url ? 'Abrir link' : null;
                        return (
                            <div
                                key={b.id}
                                className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row"
                            >
                                {b.cover_url ? (
                                    <div className="w-full sm:w-36 flex-shrink-0 aspect-[3/4] sm:aspect-[3/4] max-h-48 sm:max-h-none rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                        {openHref ? (
                                            <a
                                                href={openHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block h-full w-full cursor-pointer"
                                                title={openTitle ?? undefined}
                                            >
                                                <img src={b.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                            </a>
                                        ) : (
                                            <img src={b.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full sm:w-36 h-40 sm:h-auto rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                        <BookOpenIcon className="w-10 h-10 text-zinc-400" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            <span className="rounded-full bg-primary-100 px-2 py-0.5 font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                                                {categoryLabel(categories, b.category)}
                                            </span>
                                            <span>{publishedLabel}</span>
                                            {b.author?.name ? <span>• {b.author.name}</span> : null}
                                        </div>
                                        <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-white leading-snug">{b.title}</h2>
                                        {b.subtitle ? (
                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{b.subtitle}</p>
                                        ) : null}
                                        {openHref ? (
                                            <a
                                                href={openHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                            >
                                                {b.pdf_url ? 'Abrir PDF' : 'Abrir link'}
                                            </a>
                                        ) : null}
                                    </div>

                                    {canManage && (
                                        <div className="flex items-center gap-1 mt-3">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(b)}
                                                className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(b.id)}
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

            {canManage && !librarySetupMessage && (
                <Modal show={isModalOpen} onClose={closeModal}>
                    <form onSubmit={submit} className="p-6 max-h-[85vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                            {isEditing ? 'Editar publicação' : 'Nova publicação'}
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <InputLabel htmlFor="lib_title" value="Nome do livro / título" />
                                <TextInput
                                    id="lib_title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: Fundamentos do estudo bíblico"
                                />
                                <InputError message={errors.title} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="lib_subtitle" value="Subtítulo ou detalhe (opcional)" />
                                <TextInput
                                    id="lib_subtitle"
                                    value={data.subtitle}
                                    onChange={(e) => setData('subtitle', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex.: Volume 1 • série adultos"
                                />
                                <InputError message={errors.subtitle} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="lib_description" value="Texto explicativo (opcional)" />
                                <Textarea
                                    id="lib_description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    className="mt-1 block w-full"
                                    placeholder="Escreva um texto curto sobre o livro. Se for longo, a app mostra '… e mais'."
                                />
                                <InputError message={(errors as Record<string, string | undefined>).description} className="mt-1" />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Até 5.000 caracteres.</p>
                            </div>

                            <div>
                                <InputLabel htmlFor="lib_category" value="Categoria" />
                                <select
                                    id="lib_category"
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                    className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-white dark:focus:ring-white/20 sm:text-sm"
                                >
                                    {categories.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.category} className="mt-1" />
                            </div>

                            {libraryCategoryUsesExternalUrl(data.category) ? (
                                <div>
                                    <InputLabel htmlFor="lib_external_url" value="Link externo (opcional se enviar PDF)" />
                                    <TextInput
                                        id="lib_external_url"
                                        type="url"
                                        value={data.external_url}
                                        onChange={(e) => setData('external_url', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="https://…"
                                    />
                                    <InputError message={(errors as Record<string, string | undefined>).external_url} className="mt-1" />
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        Para conteúdo noutro site (ex.: lição ou meditação na CPB), cole o URL completo. Deixe em branco
                                        se preferir enviar um PDF.
                                    </p>
                                </div>
                            ) : null}

                            <div>
                                <InputLabel htmlFor="lib_cover" value={isEditing ? 'Capa (substituir — opcional)' : 'Capa (imagem)'} />
                                <input
                                    id="lib_cover"
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
                                                setCoverCompressError('Não foi possível processar esta imagem.');
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

                            <div>
                                <InputLabel
                                    htmlFor="lib_pdf"
                                    value={
                                        libraryCategoryUsesExternalUrl(data.category)
                                            ? isEditing
                                                ? 'PDF (substituir — opcional)'
                                                : 'Arquivo PDF (opcional se usar link)'
                                            : isEditing
                                              ? 'PDF (substituir — opcional)'
                                              : 'Arquivo PDF'
                                    }
                                />
                                <input
                                    id="lib_pdf"
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    className="mt-1 block w-full text-sm text-zinc-700 dark:text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:file:bg-white dark:file:text-black dark:hover:file:bg-zinc-100"
                                    onChange={(e) => {
                                        const f = e.currentTarget.files?.[0] ?? null;
                                        setData('pdf_file', f);
                                    }}
                                />
                                <InputError message={(errors as Record<string, string | undefined>).pdf_file} className="mt-1" />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Capa até 4 MB; PDF até 20 MB
                                    {libraryCategoryUsesExternalUrl(data.category) ? ' (ou use apenas o link acima).' : '.'}
                                </p>
                            </div>

                            <div>
                                <InputLabel htmlFor="lib_published_at" value="Mês e ano de publicação (vazio = rascunho)" />
                                <TextInput
                                    id="lib_published_at"
                                    type="month"
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
