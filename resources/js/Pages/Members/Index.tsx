import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import SelectInput from '@/Components/SelectInput';
import { useState, FormEventHandler } from 'react';

interface Member {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    address: string | null;
    status: 'active' | 'inactive';
    created_at: string;
}

interface Props {
    members: {
        data: Member[];
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
    };
    filters?: {
        search?: string;
    };
}

export default function Index({ members, filters }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        phone: '',
        birth_date: '',
        address: '',
        status: 'active' as 'active' | 'inactive',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (member: Member) => {
        setIsEditing(true);
        setEditingId(member.id);
        setData({
            name: member.name,
            email: member.email || '',
            phone: member.phone || '',
            birth_date: member.birth_date ? member.birth_date.split('T')[0] : '',
            address: member.address || '',
            status: member.status,
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
            put(route('members.update', editingId), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('members.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir este membro?')) {
            router.delete(route('members.destroy', id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Membros" />

            <PageHeader title="Membros">
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
                                    router.get(route('members.index'), { search: target.value }, { preserveState: true, replace: true });
                                }
                            }}
                        />
                    </div>
                    <PrimaryButton type="button" onClick={openCreateModal} className="gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Novo Membro
                    </PrimaryButton>
                </div>
            </PageHeader>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                            <tr>
                                <th className="px-8 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nome</th>
                                <th className="px-8 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Contato</th>
                                <th className="px-8 py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-4 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {members.data.map((member) => (
                                <tr key={member.id} className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group">
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <div className="text-base font-medium text-zinc-900 dark:text-white">{member.name}</div>
                                        <div className="text-xs text-zinc-500 mt-1">Cadastrado em {new Date(member.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <div className="text-sm text-zinc-700 dark:text-zinc-300">{member.email}</div>
                                        <div className="text-xs text-zinc-500 mt-1">{member.phone}</div>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                                            member.status === 'active' 
                                            ? 'bg-green-950/30 text-green-400 border-green-900/50' 
                                            : 'bg-red-950/30 text-red-400 border-red-900/50'
                                        }`}>
                                            {member.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                    href={route('members.show', member.id)}
                                    className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                    <EyeIcon className="w-5 h-5" />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => openEditModal(member)}
                                    className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(member.id)}
                                    className="p-2 rounded-full text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {members.data.length === 0 && (
                    <div className="p-12 text-center text-zinc-500">
                        Nenhum membro encontrado.
                    </div>
                )}
            </Card>

            <div className="mt-6 flex justify-end">
                <nav className="inline-flex rounded-full shadow-sm border border-zinc-800 bg-zinc-950/60">
                    {members.links.map((link, index) => (
                        <button
                            key={index}
                            disabled={!link.url}
                            onClick={() => link.url && router.visit(link.url)}
                            className={`px-4 py-2 text-xs md:text-sm border-l border-zinc-800 first:border-l-0 first:rounded-l-full last:rounded-r-full ${
                                link.active
                                    ? 'bg-zinc-100 text-zinc-900 dark:bg-white dark:text-black'
                                    : !link.url
                                    ? 'text-zinc-600 cursor-default'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            </div>

            <Modal show={isModalOpen} onClose={closeModal}>
                <div className="p-8 bg-white dark:bg-zinc-900">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">
                        {isEditing ? 'Editar membro' : 'Novo membro'}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                        Preencha os dados abaixo para {isEditing ? 'atualizar o cadastro' : 'cadastrar um novo membro'}.
                    </p>

                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <InputLabel htmlFor="name" value="Nome Completo" className="mb-1" />
                            <TextInput
                                id="name"
                                type="text"
                                className="block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                isFocused
                                placeholder="Nome do membro"
                            />
                            {errors.name && <div className="text-red-500 text-sm mt-2">{errors.name}</div>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="email" value="Email" className="mb-1" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="block w-full"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="exemplo@email.com"
                                />
                                {errors.email && <div className="text-red-500 text-sm mt-2">{errors.email}</div>}
                            </div>

                            <div>
                                <InputLabel htmlFor="phone" value="Telefone" className="mb-1" />
                                <TextInput
                                    id="phone"
                                    type="text"
                                    className="block w-full"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="(00) 00000-0000"
                                />
                                {errors.phone && <div className="text-red-500 text-sm mt-2">{errors.phone}</div>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="birth_date" value="Data de Nascimento" className="mb-1" />
                                <TextInput
                                    id="birth_date"
                                    type="date"
                                    className="block w-full"
                                    value={data.birth_date}
                                    onChange={(e) => setData('birth_date', e.target.value)}
                                />
                                {errors.birth_date && <div className="text-red-500 text-sm mt-2">{errors.birth_date}</div>}
                            </div>

                            <div>
                                <InputLabel htmlFor="status" value="Status" className="mb-1" />
                                <SelectInput
                                    id="status"
                                    className="block w-full"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value as 'active' | 'inactive')}
                                >
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Inativo</option>
                                </SelectInput>
                                {errors.status && <div className="text-red-500 text-sm mt-2">{errors.status}</div>}
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="address" value="Endereço" className="mb-1" />
                            <textarea
                                id="address"
                                className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm shadow-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20 min-h-[96px] p-3"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                placeholder="Endereço completo"
                            />
                            {errors.address && <div className="text-red-500 text-sm mt-2">{errors.address}</div>}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <SecondaryButton type="button" onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton disabled={processing}>
                                {isEditing ? 'Atualizar' : 'Salvar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </AdminLayout>
    );
}
