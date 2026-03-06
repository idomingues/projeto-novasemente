import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon, EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import SearchableSelect from '@/Components/SearchableSelect';
import { useState, useEffect, FormEventHandler } from 'react';

interface UserRow {
    id: number;
    name: string;
    email: string;
    member_id: number | null;
    member: { id: number; name: string } | null;
    roles: string[];
}

interface InvitationRow {
    id: number;
    email: string;
    role: string | null;
    token: string;
    expires_at: string | null;
    used_at: string | null;
    link: string;
}

interface Member { id: number; name: string; }
interface Role { id: number; name: string; }

interface Props {
    users: UserRow[];
    invitations: InvitationRow[];
    members: Member[];
    roles: Role[];
    filters?: {
        search?: string;
    };
}

export default function Index({ users, invitations, members, roles, filters }: Props) {
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRow | null>(null);
    const [search, setSearch] = useState(filters?.search ?? '');

    const userForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        member_id: '' as number | '',
        role: '',
    });

    const inviteForm = useForm({
        email: '',
        role: '',
    });

    const openNewUser = () => {
        setEditingUser(null);
        userForm.reset();
        userForm.clearErrors();
        setUserModalOpen(true);
    };

    const openEditUser = (u: UserRow) => {
        setEditingUser(u);
        userForm.setData({
            name: u.name,
            email: u.email,
            password: '',
            password_confirmation: '',
            member_id: u.member_id ?? '',
            role: u.roles[0] ?? '',
        });
        userForm.clearErrors();
        setUserModalOpen(true);
    };

    const submitUser: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingUser) {
            userForm.put(route('users.update', editingUser.id), {
                onSuccess: () => { setUserModalOpen(false); setEditingUser(null); },
            });
        } else {
            userForm.post(route('users.store'), {
                onSuccess: () => { setUserModalOpen(false); },
            });
        }
    };

    const submitInvite: FormEventHandler = (e) => {
        e.preventDefault();
        inviteForm.post(route('invitations.store'), {
            onSuccess: () => { setInviteModalOpen(false); inviteForm.reset(); },
        });
    };

    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
    };

    const whatsappMessage = (link: string) =>
        `Você foi convidado a acessar o sistema.\n\nPara criar sua conta:\n1. Acesse o link abaixo no navegador (celular ou computador)\n2. Preencha seus dados e defina uma senha\n3. O link é válido por 7 dias\n\n${link}`;

    const copyForWhatsApp = (link: string) => {
        navigator.clipboard.writeText(whatsappMessage(link));
    };

    useEffect(() => {
        if (search === (filters?.search ?? '')) {
            return;
        }
        const timeout = setTimeout(() => {
            router.get(
                route('users.index'),
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
            <PageHeader title="Usuários">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                    <div className="w-full sm:w-80">
                        <TextInput
                            type="search"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome, e-mail ou membro"
                            className="w-full"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <SecondaryButton type="button" onClick={() => setInviteModalOpen(true)} className="gap-2">
                            <EnvelopeIcon className="w-5 h-5" />
                            Convidar
                        </SecondaryButton>
                        <PrimaryButton type="button" onClick={openNewUser} className="gap-2">
                            <PlusIcon className="w-5 h-5" />
                            Novo usuário
                        </PrimaryButton>
                    </div>
                </div>
            </PageHeader>

            <div className="space-y-8">
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Usuários do sistema</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Contas que podem acessar o sistema.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Nome</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">E-mail</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Membro</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Papel</th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                        <td className="px-4 md:px-6 py-3 font-medium text-zinc-900 dark:text-white">{u.name}</td>
                                        <td className="px-4 md:px-6 py-3 text-zinc-600 dark:text-zinc-300">{u.email}</td>
                                        <td className="px-4 md:px-6 py-3 text-zinc-600 dark:text-zinc-300">{u.member?.name ?? '—'}</td>
                                        <td className="px-4 md:px-6 py-3">
                                            {u.roles.length > 0 ? (
                                                <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-xs">{u.roles.join(', ')}</span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-3 text-right">
                                            <button type="button" onClick={() => openEditUser(u)} className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg" title="Editar">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button type="button" onClick={() => confirm('Excluir este usuário?') && router.delete(route('users.destroy', u.id))} className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg" title="Excluir">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {users.length === 0 && (
                        <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">Nenhum usuário. Crie um ou envie um convite.</div>
                    )}
                </section>

                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Convites para auto-cadastro</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Envie o link do convite para a pessoa se cadastrar. O link vale 7 dias.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">E-mail</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Papel</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Status</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Link</th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {invitations.map((i) => {
                                    const used = !!i.used_at;
                                    const expired = i.expires_at && new Date(i.expires_at) < new Date();
                                    const status = used ? 'Usado' : expired ? 'Expirado' : 'Pendente';
                                    return (
                                        <tr key={i.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                            <td className="px-4 md:px-6 py-3 text-zinc-900 dark:text-white">{i.email}</td>
                                            <td className="px-4 md:px-6 py-3 text-zinc-600 dark:text-zinc-300">{i.role ?? '—'}</td>
                                            <td className="px-4 md:px-6 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded ${used ? 'bg-zinc-200 dark:bg-zinc-700' : expired ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3">
                                                {!used && !expired && (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button type="button" onClick={() => copyLink(i.link)} className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline">
                                                            Copiar link
                                                        </button>
                                                        <span className="text-zinc-400">|</span>
                                                        <button type="button" onClick={() => copyForWhatsApp(i.link)} className="text-sm text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1" title="Copiar mensagem com instruções para colar no WhatsApp">
                                                            <DevicePhoneMobileIcon className="w-4 h-4" /> WhatsApp
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 text-right">
                                                <button type="button" onClick={() => confirm('Remover convite?') && router.delete(route('invitations.destroy', i.id))} className="p-2 text-zinc-500 hover:text-red-600 rounded-lg" title="Remover">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {invitations.length === 0 && (
                        <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">Nenhum convite. Clique em &quot;Convidar&quot; para gerar um link.</div>
                    )}
                </section>
            </div>

            <Modal show={userModalOpen} onClose={() => { setUserModalOpen(false); setEditingUser(null); }}>
                <form onSubmit={submitUser} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                        {editingUser ? 'Editar usuário' : 'Novo usuário'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="user_name" value="Nome" />
                            <TextInput id="user_name" value={userForm.data.name} onChange={(e) => userForm.setData('name', e.target.value)} className="mt-1 block w-full" required />
                            <InputError message={userForm.errors.name} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="user_email" value="E-mail" />
                            <TextInput id="user_email" type="email" value={userForm.data.email} onChange={(e) => userForm.setData('email', e.target.value)} className="mt-1 block w-full" required />
                            <InputError message={userForm.errors.email} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="user_password" value={editingUser ? 'Nova senha (deixe em branco para manter)' : 'Senha'} />
                            <TextInput id="user_password" type="password" value={userForm.data.password} onChange={(e) => userForm.setData('password', e.target.value)} className="mt-1 block w-full" autoComplete="new-password" required={!editingUser} />
                            <InputError message={userForm.errors.password} className="mt-1" />
                        </div>
                        {!editingUser && (
                            <div>
                                <InputLabel htmlFor="user_password_confirmation" value="Confirmar senha" />
                                <TextInput id="user_password_confirmation" type="password" value={userForm.data.password_confirmation} onChange={(e) => userForm.setData('password_confirmation', e.target.value)} className="mt-1 block w-full" autoComplete="new-password" required={!editingUser} />
                                <InputError message={userForm.errors.password_confirmation} className="mt-1" />
                            </div>
                        )}
                        <div>
                            <SearchableSelect
                                id="user_member"
                                label="Vincular a membro (opcional)"
                                value={userForm.data.member_id}
                                onChange={(id) => userForm.setData('member_id', id === '' ? '' : Number(id))}
                                options={members.map((m) => ({ id: m.id, name: m.name }))}
                                placeholder="Buscar membro..."
                                emptyOption="Nenhum"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Papel</label>
                            <select
                                value={userForm.data.role}
                                onChange={(e) => userForm.setData('role', e.target.value)}
                                className="mt-1 block w-full min-h-[2.75rem] h-11 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                            >
                                <option value="">Nenhum</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setUserModalOpen(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={userForm.processing}>{editingUser ? 'Salvar' : 'Criar'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={inviteModalOpen} onClose={() => setInviteModalOpen(false)}>
                <form onSubmit={submitInvite} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Novo convite</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Um link será gerado para a pessoa se cadastrar. Envie o link por e-mail ou mensagem.</p>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="invite_email" value="E-mail do convidado" />
                            <TextInput id="invite_email" type="email" value={inviteForm.data.email} onChange={(e) => inviteForm.setData('email', e.target.value)} className="mt-1 block w-full" placeholder="email@exemplo.com" required />
                            <InputError message={inviteForm.errors.email} className="mt-1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Papel ao se cadastrar</label>
                            <select
                                value={inviteForm.data.role}
                                onChange={(e) => inviteForm.setData('role', e.target.value)}
                                className="mt-1 block w-full min-h-[2.75rem] h-11 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                            >
                                <option value="">Nenhum</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setInviteModalOpen(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={inviteForm.processing}>Gerar link</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
