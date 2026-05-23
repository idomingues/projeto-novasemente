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
import { FormEventHandler, useState } from 'react';

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
}

interface Props {
    listings: Listing[];
    categories: { id: number; name: string }[];
    filters: { q: string; category_id: string; locality: string; type: string };
    typeOptions: { value: string; label: string }[];
    hasModuleMembership: boolean;
}

export default function TalentConnectionIndex({
    listings,
    categories,
    filters,
    typeOptions,
    hasModuleMembership,
}: Props) {
    const [publishOpen, setPublishOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
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
        member_declaration: false,
    });

    const applyFilters = () => {
        router.get(route('mobile.talents.index'), localFilters, { preserveState: true });
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

    return (
        <MobileLayout>
            <Head title="Conexão de Talentos" />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Conexão de Talentos
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Conecte habilidades, serviços e colaboração entre membros da comunidade — com apoio mútuo e
                        respeito.
                    </p>
                </div>

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

                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex gap-2">
                        <TextInput
                            className="flex-1"
                            placeholder="Buscar talentos ou serviços..."
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
                    <div className="grid gap-2 sm:grid-cols-3">
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
                            value={localFilters.type}
                            onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
                        >
                            <option value="">Todos os tipos</option>
                            {typeOptions.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
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
                            Nenhuma publicação ativa no momento. Seja o primeiro a compartilhar um talento!
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
                                        <h2 className="font-semibold text-zinc-900 dark:text-white">{listing.title}</h2>
                                        <p className="text-xs text-brand-700 dark:text-brand-400">{listing.type_label}</p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            {listing.category_name}
                                            {listing.locality ? ` · ${listing.locality}` : ''}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">por {listing.author_name}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

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
                        <InputLabel value="Foto (opcional)" />
                        <input
                            type="file"
                            accept="image/*"
                            className="mt-1 block w-full text-sm"
                            onChange={(e) => setData('photo', e.target.files?.[0] ?? null)}
                        />
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
