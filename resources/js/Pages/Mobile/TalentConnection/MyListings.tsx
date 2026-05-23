import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
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
import { FormEventHandler, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

interface Listing {
    id: number;
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
    status: string;
    status_label: string;
    rejection_reason: string | null;
}

interface Props {
    listings: Listing[];
    categories: { id: number; name: string }[];
    hasModuleMembership: boolean;
}

export default function TalentConnectionMyListings({ listings, categories }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<Listing | null>(null);

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
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
    });

    const openEdit = (listing: Listing) => {
        setEditing(listing);
        clearErrors();
        setData({
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
        });
        setEditOpen(true);
    };

    const submitEdit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editing) return;
        put(route('mobile.talents.update', editing.id), {
            forceFormData: true,
            onSuccess: () => {
                setEditOpen(false);
                setEditing(null);
            },
        });
    };

    const changeStatus = (id: number, status: string) => {
        router.patch(route('mobile.talents.status', id), { status });
    };

    const destroyListing = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir publicação?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('mobile.talents.destroy', id));
        }
    };

    return (
        <MobileLayout>
            <Head title="Minhas publicações" />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-6">
                <Link href={route('mobile.talents.index')} className="text-sm font-medium text-brand-600">
                    ← Central de Serviços
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Minhas publicações</h1>

                {listings.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Você ainda não publicou nenhum talento ou serviço.</p>
                ) : (
                    <div className="space-y-3">
                        {listings.map((listing) => (
                            <div
                                key={listing.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h2 className="font-semibold text-zinc-900 dark:text-white">{listing.title}</h2>
                                        <p className="text-xs text-zinc-500">
                                            {listing.type_label} · {listing.category_name}
                                        </p>
                                        <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                                            {listing.status_label}
                                        </span>
                                        {listing.rejection_reason && (
                                            <p className="mt-2 text-sm text-red-600">{listing.rejection_reason}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {listing.status === 'approved' && (
                                        <SecondaryButton type="button" onClick={() => changeStatus(listing.id, 'paused')}>
                                            Pausar
                                        </SecondaryButton>
                                    )}
                                    {listing.status === 'paused' && (
                                        <SecondaryButton type="button" onClick={() => changeStatus(listing.id, 'approved')}>
                                            Reativar
                                        </SecondaryButton>
                                    )}
                                    {['approved', 'paused'].includes(listing.status) && (
                                        <SecondaryButton type="button" onClick={() => changeStatus(listing.id, 'closed')}>
                                            Encerrar
                                        </SecondaryButton>
                                    )}
                                    <SecondaryButton type="button" onClick={() => openEdit(listing)}>
                                        Editar
                                    </SecondaryButton>
                                    {['pending', 'rejected', 'closed', 'paused'].includes(listing.status) && (
                                        <button
                                            type="button"
                                            onClick={() => destroyListing(listing.id)}
                                            className="text-sm text-red-600"
                                        >
                                            Excluir
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal show={editOpen} onClose={() => setEditOpen(false)} maxWidth="2xl">
                <form onSubmit={submitEdit} className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold">Editar publicação</h2>
                    <p className="text-sm text-zinc-500">Alterações em publicações aprovadas voltam para análise.</p>
                    <div>
                        <InputLabel value="Título" />
                        <TextInput className="mt-1 w-full" value={data.title} onChange={(e) => setData('title', e.target.value)} />
                        <InputError message={errors.title} />
                    </div>
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
                    </div>
                    <div>
                        <InputLabel value="Descrição" />
                        <Textarea
                            className="mt-1 w-full"
                            rows={4}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setEditOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>Salvar</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </MobileLayout>
    );
}
