import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardTextActionButton from '@/Components/ListCard/ListCardTextActionButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import SelectInput from '@/Components/SelectInput';
import InputError from '@/Components/InputError';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Listing {
    id: number;
    title: string;
    category_id: number;
    category_name: string | null;
    description: string;
    locality: string | null;
    modality: string;
    age_range: string;
    age_range_notes: string | null;
    available_days: string | null;
    schedule_time: string | null;
    frequency: string | null;
    duration_estimate: string | null;
    notes: string | null;
    slots_total: number;
    status: string;
    status_label: string;
    rejection_reason: string | null;
}

interface Props {
    listings: Listing[];
    categories: { id: number; name: string }[];
    modalityOptions: { value: string; label: string }[];
    ageRangeOptions: { value: string; label: string }[];
}

export default function SharedTalentMyListings({ listings, categories, modalityOptions, ageRangeOptions }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<Listing | null>(null);

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        title: '',
        category_id: '',
        description: '',
        slots_total: 5,
        age_range: 'all',
        age_range_notes: '',
        modality: 'in_person',
        locality: '',
        available_days: '',
        schedule_time: '',
        frequency: '',
        duration_estimate: '',
        notes: '',
        photo: null as File | null,
    });

    const openEdit = (listing: Listing) => {
        setEditing(listing);
        clearErrors();
        setData({
            title: listing.title,
            category_id: String(listing.category_id),
            description: listing.description,
            slots_total: listing.slots_total,
            age_range: listing.age_range,
            age_range_notes: listing.age_range_notes ?? '',
            modality: listing.modality,
            locality: listing.locality ?? '',
            available_days: listing.available_days ?? '',
            schedule_time: listing.schedule_time ?? '',
            frequency: listing.frequency ?? '',
            duration_estimate: listing.duration_estimate ?? '',
            notes: listing.notes ?? '',
            photo: null,
        });
        setEditOpen(true);
    };

    const submitEdit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editing) return;
        put(route('mobile.shared-talents.update', editing.id), {
            forceFormData: true,
            onSuccess: () => {
                setEditOpen(false);
                setEditing(null);
            },
        });
    };

    const changeStatus = (id: number, status: string) => {
        router.patch(route('mobile.shared-talents.status', id), { status });
    };

    return (
        <MobileLayout>
            <Head title="Minhas publicações" />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-6">
                <Link href={route('mobile.shared-talents.index')} className="text-sm font-medium text-brand-600">
                    ← Doar Talentos
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Minhas publicações</h1>
                {listings.length === 0 ? (
                    <p className="text-sm text-zinc-600">
                        Você ainda não compartilhou nenhum talento.{' '}
                        <Link href={route('mobile.shared-talents.index')} className="font-semibold underline">
                            Compartilhar agora
                        </Link>
                    </p>
                ) : (
                    listings.map((listing) => (
                        <div
                            key={listing.id}
                            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <h2 className="font-semibold text-zinc-900 dark:text-white">{listing.title}</h2>
                            <p className="text-sm text-zinc-500">
                                {listing.category_name} · {listing.status_label}
                            </p>
                            {listing.rejection_reason && (
                                <p className="mt-2 text-sm text-red-600">Motivo: {listing.rejection_reason}</p>
                            )}
                            <ListCardActionRow className="mt-3">
                                <ListCardTextActionButton type="button" onClick={() => openEdit(listing)}>
                                    Editar
                                </ListCardTextActionButton>
                                {listing.status === 'active' || listing.status === 'full' ? (
                                    <ListCardTextActionButton type="button" onClick={() => changeStatus(listing.id, 'paused')}>
                                        Pausar
                                    </ListCardTextActionButton>
                                ) : null}
                                {listing.status === 'paused' ? (
                                    <ListCardTextActionButton type="button" onClick={() => changeStatus(listing.id, 'active')}>
                                        Reativar
                                    </ListCardTextActionButton>
                                ) : null}
                                {['active', 'paused', 'full'].includes(listing.status) && (
                                    <ListCardTextActionButton type="button" onClick={() => changeStatus(listing.id, 'closed')}>
                                        Encerrar
                                    </ListCardTextActionButton>
                                )}
                                <Link
                                    href={route('mobile.shared-talents.enrollments')}
                                    className="inline-flex h-9 items-center rounded-xl border border-zinc-300 px-3 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                                >
                                    Ver inscritos
                                </Link>
                            </ListCardActionRow>
                        </div>
                    ))
                )}
            </div>

            <Modal show={editOpen} onClose={() => setEditOpen(false)} maxWidth="2xl">
                <form onSubmit={submitEdit} className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold">Editar publicação</h2>
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
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        <div>
                            <InputLabel value="Vagas" />
                            <TextInput
                                type="number"
                                min={1}
                                className="mt-1 w-full"
                                value={data.slots_total}
                                onChange={(e) => setData('slots_total', Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <Textarea
                        className="w-full"
                        rows={4}
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                    />
                    <PrimaryButton disabled={processing}>Salvar</PrimaryButton>
                </form>
            </Modal>
        </MobileLayout>
    );
}
