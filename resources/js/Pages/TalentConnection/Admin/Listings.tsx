import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
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
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

interface Listing {
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
    listings: Listing[];
    statusFilter: string;
    statusOptions: { value: string; label: string }[];
    categories: { id: number; name: string }[];
    typeOptions: { value: string; label: string }[];
    publisherOptions: { value: number; label: string }[];
}

const adminStatusOptions = [
    { value: 'pending', label: 'Em análise' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'paused', label: 'Pausado' },
    { value: 'closed', label: 'Encerrado' },
    { value: 'rejected', label: 'Rejeitado' },
];

export default function TalentConnectionAdminListings({
    listings,
    statusFilter,
    statusOptions,
    categories,
    typeOptions,
    publisherOptions,
}: Props) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Listing | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        user_id: '',
        title: '',
        category_id: '',
        type: 'offer',
        description: '',
        locality: '',
        availability: '',
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

    const moderate = (id: number, action: string, rejection_reason?: string) => {
        router.post(route('talents.admin.listings.moderate', id), { action, rejection_reason });
    };

    const openCreate = () => {
        setEditing(null);
        clearErrors();
        reset();
        setData({
            user_id: publisherOptions[0] ? String(publisherOptions[0].value) : '',
            title: '',
            category_id: '',
            type: 'offer',
            description: '',
            locality: '',
            availability: '',
            allows_exchange: false,
            allows_negotiation: true,
            notes: '',
            photo: null,
            auto_approve: true,
            status: 'approved',
        });
        setModalOpen(true);
    };

    const openEdit = (listing: Listing) => {
        setEditing(listing);
        clearErrors();
        setData({
            user_id: String(listing.user_id),
            title: listing.title,
            category_id: String(listing.category_id),
            type: listing.type,
            description: listing.description,
            locality: listing.locality ?? '',
            availability: listing.availability ?? '',
            allows_exchange: listing.allows_exchange,
            allows_negotiation: listing.allows_negotiation,
            notes: listing.notes ?? '',
            photo: null,
            auto_approve: listing.status === 'approved',
            status: listing.status,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { forceFormData: true, onSuccess: () => closeModal() };
        if (editing) {
            put(route('talents.admin.listings.update', editing.id), options);
        } else {
            post(route('talents.admin.listings.store'), options);
        }
    };

    return (
        <AdminLayout>
            <Head title="Publicações — Central de Serviços" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar ao painel
                    </Link>
                }
                title="Publicações"
                subtitle="Cadastrar, aprovar e gerenciar talentos da comunidade"
                actions={
                    <AddButton variant="icon" onClick={openCreate} title="Cadastrar publicação">
                        Cadastrar publicação
                    </AddButton>
                }
            />

            <div className="mb-4 flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                    <Link
                        key={opt.value}
                        href={route('talents.admin.listings', { status: opt.value })}
                        className={`rounded-lg px-3 py-1.5 text-sm ${
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
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
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
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={data.allows_exchange}
                                onChange={(e) => setData('allows_exchange', e.target.checked)}
                            />
                            Permite troca
                        </label>
                        <label className="flex items-center gap-2 text-sm">
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
                                    accept="image/*"
                                    className="block w-full text-sm text-zinc-900 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-100 dark:file:text-zinc-900"
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
                                        className="text-xs font-semibold text-brand-700 underline dark:text-brand-400"
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
                        <label className="flex items-center gap-2 text-sm">
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
                        <PrimaryButton disabled={processing}>{editing ? 'Salvar' : 'Cadastrar'}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
