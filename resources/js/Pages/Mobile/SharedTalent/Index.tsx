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
import { MagnifyingGlassIcon, SparklesIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

interface Listing {
    id: number;
    title: string;
    category_name: string | null;
    locality: string | null;
    modality_label: string;
    author_name: string | null;
    photo_url: string | null;
    slots_remaining: number;
    slots_total: number;
    is_new: boolean;
    has_slots: boolean;
}

interface Props {
    listings: Listing[];
    categories: { id: number; name: string }[];
    filters: { q: string; category_id: string; locality: string; modality: string; age_range: string };
    modalityOptions: { value: string; label: string }[];
    ageRangeOptions: { value: string; label: string }[];
    hasModuleMembership: boolean;
}

export default function SharedTalentIndex({
    listings,
    categories,
    filters,
    modalityOptions,
    ageRangeOptions,
    hasModuleMembership,
}: Props) {
    const [publishOpen, setPublishOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
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
        member_declaration: false,
    });

    const photoObjectUrl = useMemo(() => {
        if (!data.photo) {
            return null;
        }
        return URL.createObjectURL(data.photo);
    }, [data.photo]);

    useEffect(() => {
        return () => {
            if (photoObjectUrl) {
                URL.revokeObjectURL(photoObjectUrl);
            }
        };
    }, [photoObjectUrl]);

    const ART_SPECS = 'Opcional. Recomendado: 1080×1080 px (quadrada), até 4 MB. Pode ser recortada no app.';

    const applyFilters = () => {
        router.get(route('mobile.shared-talents.index'), localFilters, { preserveState: true });
    };

    const submitPublish: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('mobile.shared-talents.store'), {
            forceFormData: true,
            onSuccess: () => {
                setPublishOpen(false);
                reset();
            },
        });
    };

    return (
        <MobileLayout>
            <Head title="Doar Talentos" />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Doar Talentos
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Compartilhe conhecimentos, apoio e crescimento com a comunidade — de forma gratuita e acolhedora.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={route('mobile.shared-talents.my-listings')}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                        Minhas publicações
                    </Link>
                    <Link
                        href={route('mobile.shared-talents.my-enrollments')}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                        Minhas inscrições
                    </Link>
                    <Link
                        href={route('mobile.shared-talents.enrollments')}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                        Participantes
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            clearErrors();
                            reset();
                            setPublishOpen(true);
                        }}
                        className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                        Compartilhar talento
                    </button>
                </div>

                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex gap-2">
                        <TextInput
                            className="flex-1"
                            placeholder="Buscar talentos..."
                            value={localFilters.q}
                            onChange={(e) => setLocalFilters({ ...localFilters, q: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="rounded-xl border border-zinc-200 p-2 dark:border-zinc-700"
                            aria-label="Buscar"
                        >
                            <MagnifyingGlassIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <SelectInput
                            value={localFilters.category_id}
                            onChange={(e) => setLocalFilters({ ...localFilters, category_id: e.target.value })}
                        >
                            <option value="">Todas as categorias</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectInput>
                        <SelectInput
                            value={localFilters.modality}
                            onChange={(e) => setLocalFilters({ ...localFilters, modality: e.target.value })}
                        >
                            <option value="">Todas as modalidades</option>
                            {modalityOptions.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </SelectInput>
                        <SelectInput
                            value={localFilters.age_range}
                            onChange={(e) => setLocalFilters({ ...localFilters, age_range: e.target.value })}
                        >
                            <option value="">Todas as faixas etárias</option>
                            {ageRangeOptions.map((a) => (
                                <option key={a.value} value={a.value}>
                                    {a.label}
                                </option>
                            ))}
                        </SelectInput>
                        <TextInput
                            placeholder="Localidade"
                            value={localFilters.locality}
                            onChange={(e) => setLocalFilters({ ...localFilters, locality: e.target.value })}
                        />
                    </div>
                    <SecondaryButton type="button" onClick={applyFilters} className="w-full sm:w-auto">
                        Aplicar filtros
                    </SecondaryButton>
                </div>

                {listings.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <SparklesIcon className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Nenhum talento disponível no momento. Seja o primeiro a compartilhar com a comunidade!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {listings.map((listing) => (
                            <Link
                                key={listing.id}
                                href={route('mobile.shared-talents.show', listing.id)}
                                className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex gap-3">
                                    {listing.photo_url ? (
                                        <img
                                            src={listing.photo_url}
                                            alt=""
                                            className="h-16 w-16 shrink-0 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
                                            <UserGroupIcon className="h-8 w-8 text-brand-600" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-semibold text-zinc-900 dark:text-white">{listing.title}</h2>
                                            {listing.is_new && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                                    Novo
                                                </span>
                                            )}
                                            {listing.has_slots && (
                                                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                                                    Vagas disponíveis
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            {listing.category_name} · {listing.modality_label}
                                            {listing.locality ? ` · ${listing.locality}` : ''}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            por {listing.author_name} · {listing.slots_remaining} de {listing.slots_total}{' '}
                                            vagas
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Modal show={publishOpen} onClose={() => setPublishOpen(false)} maxWidth="2xl">
                <form onSubmit={submitPublish} className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Compartilhar talento</h2>
                    {!hasModuleMembership && (
                        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-950 dark:text-brand-100">
                            Ao compartilhar, você participa da rede de apoio mútuo da igreja.
                        </p>
                    )}
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
                            <InputLabel value="Vagas" />
                            <TextInput
                                type="number"
                                min={1}
                                max={100}
                                className="mt-1 w-full"
                                value={data.slots_total}
                                onChange={(e) => setData('slots_total', Number(e.target.value))}
                            />
                            <InputError message={errors.slots_total} />
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
                            <InputLabel value="Modalidade" />
                            <SelectInput
                                className="mt-1 w-full"
                                value={data.modality}
                                onChange={(e) => setData('modality', e.target.value)}
                            >
                                {modalityOptions.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        <div>
                            <InputLabel value="Faixa etária" />
                            <SelectInput
                                className="mt-1 w-full"
                                value={data.age_range}
                                onChange={(e) => setData('age_range', e.target.value)}
                            >
                                {ageRangeOptions.map((a) => (
                                    <option key={a.value} value={a.value}>
                                        {a.label}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
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
                            <InputLabel value="Horário" />
                            <TextInput
                                className="mt-1 w-full"
                                value={data.schedule_time}
                                onChange={(e) => setData('schedule_time', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <InputLabel value="Dias disponíveis" />
                        <TextInput
                            className="mt-1 w-full"
                            placeholder="Ex.: terças e quintas"
                            value={data.available_days}
                            onChange={(e) => setData('available_days', e.target.value)}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel value="Frequência" />
                            <TextInput
                                className="mt-1 w-full"
                                value={data.frequency}
                                onChange={(e) => setData('frequency', e.target.value)}
                            />
                        </div>
                        <div>
                            <InputLabel value="Duração estimada" />
                            <TextInput
                                className="mt-1 w-full"
                                value={data.duration_estimate}
                                onChange={(e) => setData('duration_estimate', e.target.value)}
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
                    <div>
                        <InputLabel value="Arte da publicação (opcional)" />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{ART_SPECS}</p>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                                {photoObjectUrl ? (
                                    <img src={photoObjectUrl} alt="" className="h-full w-full object-cover" />
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
                                        Remover arte
                                    </button>
                                ) : null}
                                <InputError message={errors.photo} className="!mt-1" />
                            </div>
                        </div>
                    </div>
                    <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <Checkbox
                            checked={data.member_declaration}
                            onChange={(e) => setData('member_declaration', e.target.checked)}
                        />
                        <span>
                            Declaro que esta atividade está alinhada aos princípios da comunidade e é oferecida de forma
                            gratuita, sem fins comerciais.
                        </span>
                    </label>
                    <InputError message={errors.member_declaration} />
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setPublishOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>Enviar para análise</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </MobileLayout>
    );
}
