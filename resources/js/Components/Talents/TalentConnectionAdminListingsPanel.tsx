import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import {
    applyListModalFormErrors,
    editIdFromListModalRedirect,
    reloadListModalProps,
} from '@/utils/listModalFetchSave';
import {
    submitVolunteerModalFormDataPost,
    submitVolunteerModalFormDataPut,
} from '@/utils/volunteerPipelineModalSave';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import SelectInput from '@/Components/SelectInput';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import TalentListingContactFields from '@/Components/Talents/TalentListingContactFields';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface TalentConnectionAdminListing {
    id: number;
    user_id: number;
    title: string;
    type: string;
    type_label: string;
    category_id: number;
    category_name: string | null;
    description: string;
    locality: string | null;
    availability: string | null;
    contact_phone: string | null;
    contact_whatsapp: string | null;
    contact_email: string | null;
    contact_instagram: string | null;
    notes: string | null;
    allows_exchange: boolean;
    allows_negotiation: boolean;
    photo_url?: string | null;
    author_name: string | null;
    status: string;
    status_label: string;
    created_at: string | null;
    rejection_reason: string | null;
}

interface Props {
    listings: TalentConnectionAdminListing[];
    statusFilter: string;
    statusOptions: { value: string; label: string }[];
    categories: { id: number; name: string }[];
    typeOptions: { value: string; label: string }[];
    publisherOptions: { value: number; label: string }[];
    statusFilterRoute: string;
    reloadOnly: string[];
    showSectionHeader?: boolean;
}

const adminStatusOptions = [
    { value: 'pending', label: 'Em análise' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'paused', label: 'Pausado' },
    { value: 'closed', label: 'Encerrado' },
    { value: 'rejected', label: 'Rejeitado' },
];

function buildListingFormData(data: Record<string, unknown>, editing: boolean): FormData {
    const formData = new FormData();
    const append = (key: string, value: string | File | boolean) => {
        if (value instanceof File) {
            formData.append(key, value);
            return;
        }
        if (typeof value === 'boolean') {
            formData.append(key, value ? '1' : '0');
            return;
        }
        formData.append(key, value);
    };

    append('user_id', String(data.user_id ?? ''));
    append('title', String(data.title ?? ''));
    append('category_id', String(data.category_id ?? ''));
    append('type', String(data.type ?? 'offer'));
    append('description', String(data.description ?? ''));
    append('locality', String(data.locality ?? ''));
    append('availability', String(data.availability ?? ''));
    append('contact_phone', String(data.contact_phone ?? ''));
    append('contact_whatsapp', String(data.contact_whatsapp ?? ''));
    append('contact_email', String(data.contact_email ?? ''));
    append('contact_instagram', String(data.contact_instagram ?? ''));
    append('notes', String(data.notes ?? ''));
    append('allows_exchange', Boolean(data.allows_exchange));
    append('allows_negotiation', Boolean(data.allows_negotiation));

    if (data.photo instanceof File) {
        append('photo', data.photo);
    }

    if (editing) {
        append('status', String(data.status ?? 'approved'));
    } else {
        append('auto_approve', Boolean(data.auto_approve));
    }

    return formData;
}

export default function TalentConnectionAdminListingsPanel({
    listings,
    statusFilter,
    statusOptions,
    categories,
    typeOptions,
    publisherOptions,
    statusFilterRoute,
    reloadOnly,
    showSectionHeader = true,
}: Props) {
    const csrf = (usePage().props as { csrf_token?: string }).csrf_token ?? '';

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<TalentConnectionAdminListing | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const syncFormAfterReloadRef = useRef(false);

    const { data, setData, errors, reset, clearErrors, setError } = useForm({
        user_id: '',
        title: '',
        category_id: '',
        type: 'offer',
        description: '',
        locality: '',
        availability: '',
        contact_phone: '',
        contact_whatsapp: '',
        contact_email: '',
        contact_instagram: '',
        allows_exchange: false,
        allows_negotiation: true,
        notes: '',
        photo: null as File | null,
        auto_approve: true,
        status: 'approved',
    });

    const newPhotoObjectUrl = useMemo(() => {
        if (!data.photo) {
            return null;
        }
        return URL.createObjectURL(data.photo);
    }, [data.photo]);

    useEffect(() => {
        return () => {
            if (newPhotoObjectUrl) {
                URL.revokeObjectURL(newPhotoObjectUrl);
            }
        };
    }, [newPhotoObjectUrl]);

    const photoPreviewSrc = newPhotoObjectUrl || editing?.photo_url || null;
    const ART_SPECS = 'Recomendado: 1080×1080 px (quadrada), até 4 MB. A imagem pode ser recortada no app.';

    const syncEditModalUrl = useCallback((id: number | null) => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (id != null && id > 0) {
            params.set('modal', 'edit');
            params.set('id', String(id));
        } else {
            params.delete('modal');
            params.delete('id');
        }
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next !== current) {
            window.history.replaceState({}, '', next);
        }
    }, []);

    const applyListingToForm = useCallback(
        (listing: TalentConnectionAdminListing) => {
            setData({
                user_id: String(listing.user_id),
                title: listing.title,
                category_id: String(listing.category_id),
                type: listing.type,
                description: listing.description,
                locality: listing.locality ?? '',
                availability: listing.availability ?? '',
                contact_phone: listing.contact_phone ?? '',
                contact_whatsapp: listing.contact_whatsapp ?? '',
                contact_email: listing.contact_email ?? '',
                contact_instagram: listing.contact_instagram ?? '',
                allows_exchange: listing.allows_exchange,
                allows_negotiation: listing.allows_negotiation,
                notes: listing.notes ?? '',
                photo: null,
                auto_approve: listing.status === 'approved',
                status: listing.status,
            });
        },
        [setData],
    );

    const showSaveMessage = useCallback((message: string) => {
        setSaveMessage(message);
        window.setTimeout(() => setSaveMessage(null), 5000);
    }, []);

    const moderate = (id: number, action: string, rejection_reason?: string) => {
        router.post(route('talents.admin.listings.moderate', id), { action, rejection_reason }, inertiaListModalSave);
    };

    const openCreate = () => {
        setEditing(null);
        clearErrors();
        reset();
        setSaveMessage(null);
        syncEditModalUrl(null);
        setData({
            user_id: publisherOptions[0] ? String(publisherOptions[0].value) : '',
            title: '',
            category_id: '',
            type: 'offer',
            description: '',
            locality: '',
            availability: '',
            contact_phone: '',
            contact_whatsapp: '',
            contact_email: '',
            contact_instagram: '',
            allows_exchange: false,
            allows_negotiation: true,
            notes: '',
            photo: null,
            auto_approve: true,
            status: 'approved',
        });
        setModalOpen(true);
    };

    const openEdit = (listing: TalentConnectionAdminListing) => {
        setEditing(listing);
        clearErrors();
        setSaveMessage(null);
        syncEditModalUrl(listing.id);
        applyListingToForm(listing);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        setSaveMessage(null);
        syncEditModalUrl(null);
        reset();
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const modal = params.get('modal');
        if (modal === 'create') {
            if (!modalOpen) {
                openCreate();
            }
            return;
        }
        if (modal !== 'edit') {
            return;
        }
        const id = Number(params.get('id'));
        if (Number.isNaN(id) || id <= 0) {
            return;
        }
        const listing = listings.find((l) => l.id === id);
        if (!listing) {
            return;
        }
        if (!modalOpen || editing?.id !== id) {
            openEdit(listing);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listings]);

    useEffect(() => {
        if (!syncFormAfterReloadRef.current || editing?.id == null || !modalOpen) {
            return;
        }
        const listing = listings.find((l) => l.id === editing.id);
        if (!listing) {
            return;
        }
        applyListingToForm(listing);
        setEditing(listing);
        syncFormAfterReloadRef.current = false;
    }, [listings, editing?.id, modalOpen, applyListingToForm]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (saving) {
            return;
        }
        void (async () => {
            setSaving(true);
            clearErrors();
            try {
                const formData = buildListingFormData(data, Boolean(editing));
                const result =
                    editing != null
                        ? await submitVolunteerModalFormDataPut(
                              route('talents.admin.listings.update', editing.id),
                              formData,
                              csrf,
                          )
                        : await submitVolunteerModalFormDataPost(route('talents.admin.listings.store'), formData, csrf);

                if (!result.ok) {
                    applyListModalFormErrors(result.errors, setError);
                    return;
                }

                await reloadListModalProps(reloadOnly);

                if (editing != null) {
                    syncFormAfterReloadRef.current = true;
                    showSaveMessage('Publicação atualizada.');
                    setData('photo', null);
                    return;
                }

                showSaveMessage('Publicação cadastrada.');
                const newId = editIdFromListModalRedirect(result.redirectLocation ?? null);
                if (newId) {
                    syncFormAfterReloadRef.current = true;
                    syncEditModalUrl(newId);
                } else {
                    reset();
                    setData({
                        user_id: publisherOptions[0] ? String(publisherOptions[0].value) : '',
                        title: '',
                        category_id: '',
                        type: 'offer',
                        description: '',
                        locality: '',
                        availability: '',
                        contact_phone: '',
                        contact_whatsapp: '',
                        contact_email: '',
                        contact_instagram: '',
                        allows_exchange: false,
                        allows_negotiation: true,
                        notes: '',
                        photo: null,
                        auto_approve: true,
                        status: 'approved',
                    });
                }
            } finally {
                setSaving(false);
            }
        })();
    };

    return (
        <>
            {showSectionHeader && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Publicações</h2>
                    <AddButton variant="icon" onClick={openCreate} title="Cadastrar publicação">
                        Cadastrar publicação
                    </AddButton>
                </div>
            )}

            {saveMessage && (
                <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {saveMessage}
                </p>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                    <Link
                        key={opt.value}
                        href={route(statusFilterRoute, { status: opt.value })}
                        preserveScroll
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm ${
                            statusFilter === opt.value
                                ? 'bg-brand-600 text-white'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                    >
                        {opt.label}
                    </Link>
                ))}
            </div>

            {listings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhuma publicação neste filtro.</p>
                    <SecondaryButton type="button" className="mt-4" onClick={openCreate}>
                        Cadastrar publicação
                    </SecondaryButton>
                </div>
            ) : (
                <div className="space-y-4">
                    {listings.map((listing) => (
                        <div
                            key={listing.id}
                            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 gap-3">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                                        {listing.photo_url ? (
                                            <img
                                                src={listing.photo_url}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-zinc-400">Arte</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white">{listing.title}</h3>
                                        <p className="text-sm text-zinc-500">
                                            {listing.type_label} · {listing.category_name} · {listing.author_name}
                                        </p>
                                        <p className="text-xs text-zinc-400">{listing.created_at}</p>
                                        <span className="mt-1 inline-block text-xs font-medium">{listing.status_label}</span>
                                        {listing.rejection_reason && (
                                            <p className="mt-1 text-sm text-red-600">{listing.rejection_reason}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <SecondaryButton type="button" onClick={() => openEdit(listing)}>
                                        Editar
                                    </SecondaryButton>
                                    {listing.status === 'pending' && (
                                        <>
                                            <PrimaryButton type="button" onClick={() => moderate(listing.id, 'approve')}>
                                                Aprovar
                                            </PrimaryButton>
                                            <SecondaryButton
                                                type="button"
                                                onClick={() => {
                                                    const reason = window.prompt('Motivo da rejeição (opcional)') ?? '';
                                                    moderate(listing.id, 'reject', reason);
                                                }}
                                            >
                                                Rejeitar
                                            </SecondaryButton>
                                        </>
                                    )}
                                    {listing.status === 'approved' && (
                                        <SecondaryButton type="button" onClick={() => moderate(listing.id, 'suspend')}>
                                            Suspender
                                        </SecondaryButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={modalOpen} onClose={closeModal} maxWidth="2xl">
                <form onSubmit={submit} className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {editing ? 'Editar publicação' : 'Cadastrar publicação'}
                    </h2>
                    {!editing && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Cadastre em nome de um membro da igreja. Por padrão a publicação já entra como aprovada.
                        </p>
                    )}

                    <div>
                        <InputLabel value="Membro (publicador)" />
                        <SelectInput
                            className="mt-1 w-full"
                            value={data.user_id}
                            onChange={(e) => setData('user_id', e.target.value)}
                        >
                            <option value="">Selecione o membro</option>
                            {publisherOptions.map((o) => (
                                <option key={o.value} value={String(o.value)}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                        <InputError message={errors.user_id} />
                        {publisherOptions.length === 0 && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                Nenhum membro encontrado para a igreja ativa. Cadastre usuários em Usuários.
                            </p>
                        )}
                    </div>

                    <div>
                        <InputLabel value="Título" />
                        <TextInput className="mt-1 w-full" value={data.title} onChange={(e) => setData('title', e.target.value)} />
                        <InputError message={errors.title} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel value="Categoria" />
                            <SelectInput
                                className="mt-1 w-full"
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}
                            >
                                <option value="">Selecione</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.category_id} />
                        </div>
                        <div>
                            <InputLabel value="Tipo" />
                            <SelectInput
                                className="mt-1 w-full"
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value)}
                            >
                                {typeOptions.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.type} />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Descrição" />
                        <Textarea
                            className="mt-1 w-full"
                            rows={4}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        <InputError message={errors.description} />
                    </div>

                    <TalentListingContactFields
                        data={{
                            contact_phone: data.contact_phone,
                            contact_whatsapp: data.contact_whatsapp,
                            contact_email: data.contact_email,
                            contact_instagram: data.contact_instagram,
                        }}
                        setData={(key, value) => setData(key, value)}
                        errors={errors}
                        idPrefix="tc_admin_contact"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel value="Localidade" />
                            <TextInput
                                className="mt-1 w-full"
                                value={data.locality}
                                onChange={(e) => setData('locality', e.target.value)}
                            />
                        </div>
                        <div>
                            <InputLabel value="Disponibilidade" />
                            <TextInput
                                className="mt-1 w-full"
                                value={data.availability}
                                onChange={(e) => setData('availability', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Observações" />
                        <Textarea
                            className="mt-1 w-full"
                            rows={2}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                                checked={data.allows_exchange}
                                onChange={(e) => setData('allows_exchange', e.target.checked)}
                            />
                            Permite troca
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                                checked={data.allows_negotiation}
                                onChange={(e) => setData('allows_negotiation', e.target.checked)}
                            />
                            Permite combinar detalhes
                        </label>
                    </div>

                    <div>
                        <InputLabel value="Arte da publicação (opcional)" />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{ART_SPECS}</p>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                                {photoPreviewSrc ? (
                                    <img src={photoPreviewSrc} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-xs font-semibold text-zinc-400">Arte</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <input
                                    type="file"
                                    accept={GALLERY_IMAGE_ACCEPT}
                                    className="block w-full cursor-pointer text-sm text-zinc-900 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                    onChange={(e) => {
                                        const file = e.currentTarget.files?.[0] ?? null;
                                        setData('photo', file);
                                        e.currentTarget.value = '';
                                    }}
                                />
                                {data.photo ? (
                                    <button
                                        type="button"
                                        onClick={() => setData('photo', null)}
                                        className="cursor-pointer text-xs font-semibold text-brand-700 underline dark:text-brand-400"
                                    >
                                        Remover arte nova
                                    </button>
                                ) : null}
                            </div>
                        </div>
                        <InputError message={errors.photo} className="mt-1" />
                    </div>

                    {editing ? (
                        <div>
                            <InputLabel value="Status" />
                            <SelectInput
                                className="mt-1 w-full"
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                            >
                                {adminStatusOptions.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.status} />
                        </div>
                    ) : (
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                                checked={data.auto_approve}
                                onChange={(e) => setData('auto_approve', e.target.checked)}
                            />
                            Publicar imediatamente (aprovar automaticamente)
                        </label>
                    )}

                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={saving}>{editing ? 'Salvar' : 'Cadastrar'}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    );
}
