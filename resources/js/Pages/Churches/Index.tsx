import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon, PhotoIcon, ClockIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import Card from '@/Components/Card';
import { useState, FormEventHandler } from 'react';

interface Church {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    description: string | null;
    active: boolean;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    pix_key?: string | null;
    donation_url?: string | null;
}

interface Props {
    churches: Church[];
}

export default function Index({ churches }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        slug: '',
        logo_url: '',
        city: '',
        state: '',
        country: '',
        description: '',
        active: true,
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        pix_key: '',
        donation_url: '',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (church: Church) => {
        setIsEditing(true);
        setEditingId(church.id);
        setData({
            name: church.name,
            slug: church.slug,
            logo_url: church.logo_url ?? '',
            city: church.city ?? '',
            state: church.state ?? '',
            country: church.country ?? '',
            description: church.description ?? '',
            active: church.active,
            email: church.email ?? '',
            phone: church.phone ?? '',
            whatsapp: church.whatsapp ?? '',
            address: church.address ?? '',
            pix_key: church.pix_key ?? '',
            donation_url: church.donation_url ?? '',
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('churches.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('churches.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir esta igreja?')) {
            router.delete(route('churches.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Igrejas" />
            <PageHeader title="Igrejas">
                <PrimaryButton type="button" onClick={openCreateModal} className="gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Nova Igreja
                </PrimaryButton>
            </PageHeader>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Logo</th>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nome</th>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Localização</th>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Horários</th>
                                <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {churches.map((church) => (
                                <tr key={church.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                                    <td className="px-4 md:px-6 py-3">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                            {church.logo_url ? (
                                                <img src={church.logo_url} alt={church.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <BuildingOfficeIcon className="w-5 h-5 text-zinc-500" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-3">
                                        <div className="font-medium text-zinc-900 dark:text-white">{church.name}</div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">slug: {church.slug}</div>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 text-zinc-600 dark:text-zinc-300">
                                        {[church.city, church.state, church.country].filter(Boolean).join(' • ') || '—'}
                                    </td>
                                    <td className="px-4 md:px-6 py-3">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                church.active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                            }`}
                                        >
                                            {church.active ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3">
                                        <Link
                                            href={route('churches.services.index', church.id)}
                                            className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                                        >
                                            <ClockIcon className="w-4 h-4" />
                                            Cultos
                                        </Link>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(church)}
                                            className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            title="Editar"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(church.id)}
                                            className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            title="Excluir"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {churches.length === 0 && (
                    <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                        Nenhuma igreja cadastrada. Clique em &quot;Nova Igreja&quot; para começar.
                    </div>
                )}
            </Card>

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                        {isEditing ? 'Editar igreja' : 'Nova igreja'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="name" value="Nome da igreja" />
                            <TextInput
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex: Nova Semente"
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="slug" value="Slug (identificador único)" />
                            <TextInput
                                id="slug"
                                value={data.slug}
                                onChange={(e) => setData('slug', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="ex: nova-semente"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Use apenas letras minúsculas, números e hífens.
                            </p>
                            <InputError message={errors.slug} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="logo_url" value="URL da logo (opcional)" />
                            <div className="mt-1 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {data.logo_url ? (
                                        <img src={data.logo_url} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                        <PhotoIcon className="w-5 h-5 text-zinc-500" />
                                    )}
                                </div>
                                <TextInput
                                    id="logo_url"
                                    value={data.logo_url}
                                    onChange={(e) => setData('logo_url', e.target.value)}
                                    className="block w-full"
                                    placeholder="https://..."
                                />
                            </div>
                            <InputError message={errors.logo_url} className="mt-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <InputLabel htmlFor="city" value="Cidade" />
                                <TextInput
                                    id="city"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.city} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="state" value="Estado" />
                                <TextInput
                                    id="state"
                                    value={data.state}
                                    onChange={(e) => setData('state', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.state} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="country" value="País" />
                                <TextInput
                                    id="country"
                                    value={data.country}
                                    onChange={(e) => setData('country', e.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.country} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <InputLabel htmlFor="description" value="Descrição (opcional)" />
                            <textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                            />
                            <InputError message={errors.description} className="mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="active"
                                type="checkbox"
                                checked={data.active}
                                onChange={(e) => setData('active', e.target.checked)}
                                className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                            />
                            <InputLabel htmlFor="active" value="Igreja ativa" className="!mb-0" />
                        </div>
                        <hr className="border-zinc-200 dark:border-zinc-700" />
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Contato e ofertas (mobile)</h3>
                        <div>
                            <InputLabel htmlFor="email" value="E-mail" />
                            <TextInput id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="mt-1 block w-full" />
                            <InputError message={errors.email} className="mt-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="phone" value="Telefone" />
                                <TextInput id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-1 block w-full" />
                            </div>
                            <div>
                                <InputLabel htmlFor="whatsapp" value="WhatsApp (número com DDI)" />
                                <TextInput id="whatsapp" value={data.whatsapp} onChange={(e) => setData('whatsapp', e.target.value)} className="mt-1 block w-full" placeholder="5511999999999" />
                            </div>
                        </div>
                        <div>
                            <InputLabel htmlFor="address" value="Endereço" />
                            <TextInput id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} className="mt-1 block w-full" />
                        </div>
                        <div>
                            <InputLabel htmlFor="pix_key" value="Chave PIX (ofertas)" />
                            <TextInput id="pix_key" value={data.pix_key} onChange={(e) => setData('pix_key', e.target.value)} className="mt-1 block w-full" placeholder="CPF, e-mail ou chave aleatória" />
                        </div>
                        <div>
                            <InputLabel htmlFor="donation_url" value="URL página de ofertas (opcional)" />
                            <TextInput id="donation_url" value={data.donation_url} onChange={(e) => setData('donation_url', e.target.value)} className="mt-1 block w-full" placeholder="https://..." />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {isEditing ? 'Salvar' : 'Criar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

