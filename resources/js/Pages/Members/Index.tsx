import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Card from '@/Components/Card';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { useState, useEffect, FormEventHandler } from 'react';
import { activeInactivePillClass } from '@/lib/statusBadges';
import { confirmAction } from '@/utils/confirmDialog';

interface Member {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    address: string | null;
    status: 'active' | 'inactive';
    is_volunteer?: boolean;
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
    const [search, setSearch] = useState(filters?.search ?? '');

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        phone: '',
        birth_date: '',
        status: 'active' as 'active' | 'inactive',
        is_volunteer: false as boolean,
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
            status: member.status,
            is_volunteer: Boolean(member.is_volunteer),
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

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir usuário?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('members.destroy', id));
        }
    };

    useEffect(() => {
        if (search === (filters?.search ?? '')) {
            return;
        }
        const timeout = setTimeout(() => {
            router.get(
                route('members.index'),
                { search },
                {
                    preserveState: true,
                    replace: true,
                },
            );
        }, 400);
        return () => clearTimeout(timeout);
    }, [search, filters?.search]);

    return (
        <AdminLayout>
            <Head title="Usuários" />

            <header className="mt-6 mb-6 space-y-4 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Usuários</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
                    Acesso e login baseiam-se na tabela de utilizadores (<strong className="font-medium text-zinc-700 dark:text-zinc-300">users</strong>); a ficha na igreja é{' '}
                    <strong className="font-medium text-zinc-700 dark:text-zinc-300">members</strong>. O mesmo núcleo do registo público «Criar conta»: nome e e-mail obrigatórios; telefone e data de nascimento são opcionais.{' '}
                    <strong className="font-medium text-zinc-700 dark:text-zinc-300">Morada não é pedida nesta fase.</strong>
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4 min-w-0">
                    <div className="w-full min-w-0 sm:max-w-md">
                        <TextInput
                            type="search"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome, e-mail ou telefone"
                            className="w-full min-w-0"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex w-full shrink-0 justify-end sm:w-auto">
                        <AddButton onClick={openCreateModal} className="w-full justify-center sm:w-auto">
                            Novo usuário
                        </AddButton>
                    </div>
                </div>
            </header>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Nome
                                </th>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    E-mail
                                </th>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Telefone
                                </th>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Voluntário
                                </th>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 sm:px-6 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {members.data.map((member) => (
                                <tr key={member.id} className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group">
                                    <td className="px-4 py-4 sm:px-6 sm:py-6 align-top">
                                        <div className="text-base font-medium text-zinc-900 dark:text-white">{member.name}</div>
                                        <div className="text-xs text-zinc-500 mt-1">Cadastrado em {new Date(member.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-4 py-4 sm:px-6 sm:py-6 align-top max-w-[14rem] sm:max-w-xs">
                                        <div className="text-sm text-zinc-800 dark:text-zinc-100 break-all font-mono leading-snug">
                                            {member.email?.trim() ? member.email : <span className="text-zinc-400 dark:text-zinc-500 font-sans">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 sm:px-6 sm:py-6 align-top whitespace-nowrap">
                                        <div className="text-sm text-zinc-800 dark:text-zinc-100 tabular-nums">
                                            {member.phone?.trim() ? member.phone : <span className="text-zinc-400 dark:text-zinc-500">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 sm:px-6 sm:py-6 whitespace-nowrap">
                                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                            {member.is_volunteer ? 'Sim' : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 sm:px-6 sm:py-6 whitespace-nowrap">
                                        <span className={activeInactivePillClass(member.status === 'active')}>
                                            {member.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 sm:px-6 sm:py-6 whitespace-nowrap text-right text-sm font-medium">
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
                        Nenhum usuário encontrado.
                    </div>
                )}
            </Card>

            <div className="mt-6 flex justify-end overflow-x-auto pb-1">
                <nav className="inline-flex shrink-0 rounded-full shadow-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                    {members.links.map((link, index) => (
                        <button
                            key={index}
                            disabled={!link.url}
                            onClick={() => link.url && router.visit(link.url)}
                            className={`px-4 py-2 text-xs md:text-sm border-l border-zinc-300 dark:border-zinc-700 first:border-l-0 first:rounded-l-full last:rounded-r-full transition-colors ${
                                link.active
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold'
                                    : !link.url
                                    ? 'text-zinc-400 dark:text-zinc-500 cursor-default bg-zinc-100 dark:bg-zinc-800'
                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            </div>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
                <div className="flex max-h-[min(92dvh,calc(100dvh-1rem))] min-h-0 flex-col bg-white dark:bg-zinc-900">
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-10 sm:px-6 sm:pb-6 sm:pt-11">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white sm:text-xl pr-8">
                        {isEditing ? 'Editar usuário' : 'Novo usuário'}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-5">
                        {isEditing
                            ? 'Atualize nome, e-mail, contactos opcionais e estado. A morada não é alterada neste formulário.'
                            : 'Cria a conta em users (login) e a ficha em members. A senha é definida pela pessoa ao usar «Esqueci a senha» ou ao completar o primeiro acesso, como no registo público.'}
                    </p>

                    <form onSubmit={submit} className="space-y-5 sm:space-y-6">
                        <div>
                            <InputLabel htmlFor="name" value="Nome completo" className="mb-1" />
                            <TextInput
                                id="name"
                                type="text"
                                className="block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                isFocused
                                placeholder="Nome completo"
                            />
                            {errors.name && <div className="text-red-500 text-sm mt-2">{errors.name}</div>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="email" value="E-mail" className="mb-1" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="block w-full"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="exemplo@email.com"
                                    required
                                />
                                {errors.email && <div className="text-red-500 text-sm mt-2">{errors.email}</div>}
                            </div>

                            <div>
                                <InputLabel htmlFor="phone" value="Telefone (opcional)" className="mb-1" />
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
                                <InputLabel htmlFor="birth_date" value="Data de nascimento (opcional)" className="mb-1" />
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

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="is_volunteer"
                                    checked={data.is_volunteer}
                                    onChange={(e) => setData('is_volunteer', e.target.checked)}
                                />
                                <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                    <span className="font-semibold text-zinc-900 dark:text-white">Voluntário</span> — serve ou
                                    irá servir em ministérios. A equipe pode completar departamentos e detalhes em{' '}
                                    <span className="font-medium">Voluntários</span> quando aplicável.
                                </span>
                            </label>
                            <InputError message={errors.is_volunteer} className="mt-2" />
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:flex-row sm:justify-end sm:pt-5">
                            <SecondaryButton type="button" onClick={closeModal} className="justify-center sm:w-auto">
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton disabled={processing} className="justify-center sm:w-auto">
                                {isEditing ? 'Atualizar' : 'Salvar'}
                            </PrimaryButton>
                        </div>
                    </form>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
