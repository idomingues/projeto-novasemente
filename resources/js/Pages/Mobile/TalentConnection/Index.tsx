import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
import PageHeader from '@/Components/PageHeader';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import SelectInput from '@/Components/SelectInput';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import ListSortOptionPicker from '@/Components/ListSortOptionPicker';
import TalentListingContactFields from '@/Components/Talents/TalentListingContactFields';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AdjustmentsHorizontalIcon,
    ArrowsUpDownIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';

interface Listing {
    id: number;
    title: string;
    type_label: string;
    category_name: string | null;
    locality: string | null;
    author_name: string | null;
    photo_url: string | null;
    allows_exchange: boolean;
    created_at: string | null;
    is_example?: boolean;
    has_contact?: boolean;
}

type Filters = { q: string; category_id: string; locality: string; type: string; sort: string };

interface Props {
    listings: Listing[];
    categories: { id: number; name: string }[];
    filters: Filters;
    typeOptions: { value: string; label: string }[];
    hasModuleMembership: boolean;
}

const headerIconBtnClass =
    'relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto sm:px-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800';

const headerIconBtnActiveClass =
    'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-600 dark:bg-teal-950/40 dark:text-teal-200';

const SORT_OPTIONS = [
    { value: 'created_desc', label: 'Mais recentes' },
    { value: 'created_asc', label: 'Mais antigos' },
    { value: 'title_asc', label: 'Título (A–Z)' },
    { value: 'title_desc', label: 'Título (Z–A)' },
] as const;

function filterQueryParams(filters: Filters): Record<string, string> {
    const p: Record<string, string> = {};
    if (filters.q.trim()) p.q = filters.q.trim();
    if (filters.category_id) p.category_id = filters.category_id;
    if (filters.locality.trim()) p.locality = filters.locality.trim();
    if (filters.type) p.type = filters.type;
    if (filters.sort && filters.sort !== 'created_desc') p.sort = filters.sort;
    return p;
}

function optionLabel(options: { value: string; label: string }[], value: string): string | null {
    const hit = options.find((o) => o.value === value);
    return hit?.label ?? null;
}

export default function TalentConnectionIndex({
    listings,
    categories,
    filters,
    typeOptions,
    hasModuleMembership,
}: Props) {
    const [publishOpen, setPublishOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [sortModalOpen, setSortModalOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const [draftFilters, setDraftFilters] = useState(filters);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
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

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    useEffect(() => {
        if (filterSheetOpen) {
            setDraftFilters(localFilters);
        }
    }, [filterSheetOpen, localFilters]);

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (localFilters.category_id) n += 1;
        if (localFilters.type) n += 1;
        if (localFilters.locality.trim()) n += 1;
        return n;
    }, [localFilters]);

    const sortIsCustom = localFilters.sort !== 'created_desc';
    const currentSortLabel = optionLabel([...SORT_OPTIONS], localFilters.sort) ?? 'Mais recentes';

    const activeChips = useMemo(() => {
        const chips: { key: string; label: string }[] = [];
        if (localFilters.category_id) {
            const lb = categories.find((c) => String(c.id) === localFilters.category_id)?.name;
            if (lb) chips.push({ key: 'category_id', label: lb });
        }
        if (localFilters.type) {
            const lb = optionLabel(typeOptions, localFilters.type);
            if (lb) chips.push({ key: 'type', label: lb });
        }
        if (localFilters.locality.trim()) {
            chips.push({ key: 'locality', label: localFilters.locality.trim() });
        }
        if (localFilters.q.trim()) {
            const q = localFilters.q.trim();
            chips.push({ key: 'q', label: q.length > 28 ? `${q.slice(0, 28)}…` : q });
        }
        return chips;
    }, [localFilters, categories, typeOptions]);

    const applySearch: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(route('mobile.talents.index'), filterQueryParams(localFilters), {
            preserveScroll: true,
            replace: true,
        });
    };

    const applyFiltersFromDraft = () => {
        setLocalFilters(draftFilters);
        router.get(route('mobile.talents.index'), filterQueryParams(draftFilters), {
            preserveScroll: true,
            replace: true,
        });
        setFilterSheetOpen(false);
    };

    const clearFiltersAndApply = () => {
        const cleared = { ...localFilters, category_id: '', type: '', locality: '' };
        setLocalFilters(cleared);
        setDraftFilters(cleared);
        router.get(route('mobile.talents.index'), filterQueryParams(cleared), {
            preserveScroll: true,
            replace: true,
        });
        setFilterSheetOpen(false);
    };

    const removeChip = (key: string) => {
        const next = {
            ...localFilters,
            category_id: key === 'category_id' ? '' : localFilters.category_id,
            type: key === 'type' ? '' : localFilters.type,
            locality: key === 'locality' ? '' : localFilters.locality,
            q: key === 'q' ? '' : localFilters.q,
        };
        setLocalFilters(next);
        router.get(route('mobile.talents.index'), filterQueryParams(next), {
            preserveScroll: true,
            replace: true,
        });
    };

    const filterSheetSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        applyFiltersFromDraft();
    };

    const selectSort = (sort: string) => {
        const next = { ...localFilters, sort };
        setLocalFilters(next);
        router.get(route('mobile.talents.index'), filterQueryParams(next), {
            preserveScroll: true,
            replace: true,
        });
        setSortModalOpen(false);
    };

    const submitPublish: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('mobile.talents.store'), {
            forceFormData: true,
            onSuccess: () => {
                setPublishOpen(false);
                reset();
            },
        });
    };

    const listControls = (
        <>
            <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                title="Filtros"
                aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ativos)` : 'Filtros'}
                className={`${headerIconBtnClass} ${activeFilterCount > 0 ? headerIconBtnActiveClass : ''}`}
            >
                <AdjustmentsHorizontalIcon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="hidden text-sm font-medium sm:inline">Filtros</span>
                {activeFilterCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                        {activeFilterCount > 9 ? '9+' : activeFilterCount}
                    </span>
                ) : null}
            </button>
            <button
                type="button"
                onClick={() => setSortModalOpen(true)}
                title={`Ordenação: ${currentSortLabel}`}
                aria-label={`Ordenação: ${currentSortLabel}`}
                className={`${headerIconBtnClass} ${sortIsCustom ? headerIconBtnActiveClass : ''}`}
            >
                <ArrowsUpDownIcon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="hidden text-sm font-medium sm:inline">Ordenar</span>
            </button>
        </>
    );

    return (
        <MobileLayout>
            <Head title="Central de Serviços" />
            <FlashMessages />
            <div className="mx-auto w-full max-w-3xl space-y-6 lg:max-w-6xl">
                <PageHeader
                    title="Central de Serviços"
                    subtitle="Conecte habilidades, serviços e colaboração entre membros da comunidade — com apoio mútuo e respeito."
                    actions={listControls}
                />

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={route('mobile.talents.my-listings')}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                        Minhas publicações
                    </Link>
                    <Link
                        href={route('mobile.talents.my-interests')}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                        Meus interesses
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
                        Publicar serviço
                    </button>
                </div>

                <form onSubmit={applySearch} className="flex gap-2 sm:max-w-xl lg:max-w-2xl">
                    <TextInput
                        className="flex-1"
                        type="search"
                        placeholder="Buscar talentos ou serviços..."
                        value={localFilters.q}
                        onChange={(e) => setLocalFilters({ ...localFilters, q: e.target.value })}
                    />
                    <button
                        type="submit"
                        className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                        Buscar
                    </button>
                </form>

                {activeChips.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            Filtros
                        </span>
                        {activeChips.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                onClick={() => removeChip(c.key)}
                                className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200"
                                title="Remover filtro"
                            >
                                <span className="truncate">{c.label}</span>
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
                                    ×
                                </span>
                            </button>
                        ))}
                    </div>
                ) : null}

                {listings.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <SparklesIcon className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {activeChips.length > 0
                                ? 'Nenhuma publicação com estes filtros.'
                                : 'Nenhuma publicação ativa no momento. Seja o primeiro a compartilhar um talento!'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {listings.map((listing) => (
                            <Link
                                key={listing.id}
                                href={route('mobile.talents.show', listing.id)}
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
                                            {listing.is_example ? (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                                                    Exemplo
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="text-xs text-brand-700 dark:text-brand-400">{listing.type_label}</p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            {listing.category_name}
                                            {listing.locality ? ` · ${listing.locality}` : ''}
                                        </p>
                                        {listing.has_contact ? (
                                            <p className="mt-1 text-xs font-medium text-brand-700 dark:text-brand-400">
                                                Contato disponível
                                            </p>
                                        ) : null}
                                        <p className="mt-1 text-xs text-zinc-500">por {listing.author_name}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                show={filterSheetOpen}
                onClose={() => setFilterSheetOpen(false)}
                maxWidth="md"
                footer={
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={clearFiltersAndApply}
                            className="cursor-pointer text-center text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400"
                        >
                            Limpar filtros
                        </button>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <PrimaryButton type="submit" form="talents-filter-form" className="justify-center sm:w-auto">
                                Aplicar
                            </PrimaryButton>
                        </div>
                    </div>
                }
            >
                <div className="px-5 pb-2 pt-14 sm:px-6 sm:pt-16">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Filtros</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Refine por categoria, tipo ou localidade.
                    </p>
                </div>
                <form id="talents-filter-form" onSubmit={filterSheetSubmit} className="space-y-4 px-5 pb-6 sm:px-6">
                    <div>
                        <InputLabel htmlFor="tc_f_category" value="Categoria" />
                        <SelectInput
                            id="tc_f_category"
                            className="mt-1 w-full"
                            value={draftFilters.category_id}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, category_id: e.target.value }))}
                        >
                            <option value="">Todas as categorias</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <InputLabel htmlFor="tc_f_type" value="Tipo" />
                        <SelectInput
                            id="tc_f_type"
                            className="mt-1 w-full"
                            value={draftFilters.type}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, type: e.target.value }))}
                        >
                            <option value="">Todos os tipos</option>
                            {typeOptions.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <InputLabel htmlFor="tc_f_locality" value="Localidade" />
                        <TextInput
                            id="tc_f_locality"
                            className="mt-1 w-full"
                            placeholder="Ex.: bairro ou cidade"
                            value={draftFilters.locality}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, locality: e.target.value }))}
                        />
                    </div>
                </form>
            </Modal>

            <Modal show={sortModalOpen} onClose={() => setSortModalOpen(false)} maxWidth="md">
                <div className="px-5 pb-6 pt-14 sm:px-6 sm:pt-16">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Ordenação</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Toque em uma opção para ordenar a lista.
                    </p>
                    <ListSortOptionPicker options={SORT_OPTIONS} value={localFilters.sort} onChange={selectSort} />
                </div>
            </Modal>

            <Modal show={publishOpen} onClose={() => setPublishOpen(false)} maxWidth="2xl">
                <form onSubmit={submitPublish} className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Publicar serviço ou talento</h2>
                    {!hasModuleMembership && (
                        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-950 dark:text-brand-100">
                            Ao publicar, você confirma participação como membro da igreja nesta rede de colaboração.
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
                        idPrefix="tc_publish_contact"
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
                                {photoObjectUrl ? (
                                    <img src={photoObjectUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-xs font-semibold text-zinc-400">Arte</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <input
                                    type="file"
                                    accept={GALLERY_IMAGE_ACCEPT}
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
                            Declaro que sou membro da igreja Nova Semente e que esta publicação está de acordo com os
                            princípios da comunidade. O app não intermedia pagamentos nem resolução de problemas entre
                            negociações.
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
