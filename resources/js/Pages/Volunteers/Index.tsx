import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getMinistryIcon } from '@/lib/ministryIcons';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import SearchableSelect from '@/Components/SearchableSelect';
import { useState, FormEventHandler } from 'react';

interface Member { id: number; name: string; photo_url?: string | null; }
interface Ministry { id: number; name: string; }

interface Volunteer {
    id: number;
    member_id: number | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    active: boolean;
    member: { id: number; name: string; photo_url?: string | null } | null;
    ministries: { id: number; name: string }[];
}

interface Props {
    volunteers: {
        data: Volunteer[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    members: Member[];
    ministries: Ministry[];
    filters?: {
        search?: string;
    };
}

export default function Index({ volunteers, members, ministries, filters }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        member_id: '' as number | '',
        name: '',
        email: '',
        phone: '',
        ministry_ids: [] as number[],
        role: '',
        active: true,
        photo_url: '',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (v: Volunteer) => {
        setIsEditing(true);
        setEditingId(v.id);
        setData({
            member_id: v.member_id ?? '',
            name: v.name ?? '',
            email: v.email ?? '',
            phone: v.phone ?? '',
            ministry_ids: v.ministries?.map((m) => m.id) ?? [],
            role: v.role || '',
            active: v.active,
            photo_url: v.member?.photo_url ?? '',
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
            put(route('volunteers.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('volunteers.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir este voluntário?')) {
            router.delete(route('volunteers.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Voluntários" />
            <PageHeader title="Voluntários">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                    <div className="w-full sm:w-80">
                        <TextInput
                            type="search"
                            name="search"
                            defaultValue={filters?.search ?? ''}
                            placeholder="Buscar por nome, e-mail ou telefone"
                            className="w-full"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const target = e.target as HTMLInputElement;
                                    router.get(route('volunteers.index'), { search: target.value }, { preserveState: true, replace: true });
                                }
                            }}
                        />
                    </div>
                    <PrimaryButton type="button" onClick={openCreateModal} className="gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Novo Voluntário
                    </PrimaryButton>
                </div>
            </PageHeader>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Membro</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Departamento</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cargo</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {volunteers.data.map((v) => {
                                const displayName = v.member?.name ?? v.name ?? '—';
                                const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';
                                return (
                                <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-4 md:px-8 py-3 md:py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0 overflow-hidden">
                                                {v.member?.photo_url ? (
                                                    <img src={v.member.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    initial
                                                )}
                                            </div>
                                            <span className="font-medium text-zinc-900 dark:text-white">{displayName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-8 py-3 md:py-4">
                                        <div className="flex flex-wrap items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                                            {(v.ministries ?? []).map((min) => {
                                                const Icon = getMinistryIcon(min.name);
                                                return (
                                                    <span key={min.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-xs">
                                                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                                        {min.name}
                                                    </span>
                                                );
                                            })}
                                            {(v.ministries ?? []).length === 0 && '—'}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-8 py-3 md:py-4 text-zinc-600 dark:text-zinc-300">{v.role || '—'}</td>
                                    <td className="px-4 md:px-8 py-3 md:py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${v.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'}`}>
                                            {v.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-8 py-3 md:py-4 text-right">
                                        <button type="button" onClick={() => openEditModal(v)} className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700" title="Editar">
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button type="button" onClick={() => handleDelete(v.id)} className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700" title="Excluir">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            );})}
                        </tbody>
                    </table>
                </div>
                {volunteers.data.length === 0 && (
                    <div className="px-4 md:px-8 py-12 text-center text-zinc-500 dark:text-zinc-400">Nenhum voluntário cadastrado. Clique em Novo Voluntário para começar.</div>
                )}
                {volunteers.links.length > 1 && (
                    <div className="px-4 md:px-8 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-center gap-2 flex-wrap">
                        {volunteers.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                className={`px-3 py-1 rounded-lg text-sm ${
                                    link.active
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                        : link.url
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </Card>

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                        {isEditing ? 'Editar voluntário' : 'Novo voluntário'}
                    </h2>
                    <div className="space-y-4">
                        {data.member_id && (() => {
                            const selectedMember = members.find((m) => m.id === data.member_id);
                            const photoUrl = data.photo_url || selectedMember?.photo_url || '';
                            const displayName = selectedMember?.name ?? '';
                            return (
                                <div>
                                    <InputLabel value="Foto" />
                                    <div className="mt-2 flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xl font-semibold text-zinc-600 dark:text-zinc-300 overflow-hidden flex-shrink-0">
                                            {photoUrl ? (
                                                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                displayName.charAt(0).toUpperCase() || '?'
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <InputLabel htmlFor="photo_url" value="URL da foto (opcional)" className="!mb-1" />
                                            <TextInput
                                                id="photo_url"
                                                value={data.photo_url}
                                                onChange={(e) => setData('photo_url', e.target.value)}
                                                className="block w-full"
                                                placeholder="https://..."
                                            />
                                            <InputError message={errors.photo_url} className="mt-1" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                        <div>
                            <SearchableSelect
                                id="member_id"
                                label="Membro"
                                value={data.member_id}
                                onChange={(id) => {
                                    const numId = id === '' ? '' : Number(id);
                                    setData('member_id', numId);
                                    if (numId) {
                                        const m = members.find((x) => x.id === numId);
                                        setData('photo_url', m?.photo_url ?? '');
                                    } else {
                                        setData('photo_url', '');
                                    }
                                }}
                                options={members.map((m) => ({ id: m.id, name: m.name }))}
                                placeholder="Digite para buscar membro..."
                                emptyOption="Não é membro (informar nome abaixo)"
                                error={errors.member_id}
                            />
                        </div>
                        {!data.member_id && (
                            <>
                                <div>
                                    <InputLabel htmlFor="name" value="Nome do voluntário" />
                                    <TextInput
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="Nome completo"
                                    />
                                    <InputError message={errors.name} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="email" value="E-mail (opcional)" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.email} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="phone" value="Telefone (opcional)" />
                                    <TextInput
                                        id="phone"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.phone} className="mt-1" />
                                </div>
                            </>
                        )}
                        <div>
                            <InputLabel value="Departamentos (pode escolher mais de um)" />
                            <div className="mt-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 max-h-48 overflow-y-auto space-y-2">
                                {ministries.map((m) => (
                                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.ministry_ids.includes(m.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setData('ministry_ids', [...data.ministry_ids, m.id]);
                                                } else {
                                                    setData('ministry_ids', data.ministry_ids.filter((id) => id !== m.id));
                                                }
                                            }}
                                            className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                        />
                                        <span className="text-sm text-zinc-900 dark:text-white">{m.name}</span>
                                    </label>
                                ))}
                            </div>
                            <InputError message={errors.ministry_ids} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="role" value="Cargo (opcional)" />
                            <TextInput
                                id="role"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex: Líder, Apoio"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                O cargo <strong>Líder</strong> pode administrar os voluntários do departamento e organizar a escala.
                            </p>
                            <InputError message={errors.role} className="mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={data.active}
                                onChange={(e) => setData('active', e.target.checked)}
                                className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                            />
                            <InputLabel htmlFor="active" value="Ativo" className="!mb-0" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {isEditing ? 'Salvar' : 'Cadastrar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
