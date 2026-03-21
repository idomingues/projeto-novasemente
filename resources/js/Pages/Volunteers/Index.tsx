import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import { PencilIcon, TrashIcon, LinkIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
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
import { useState, useEffect, FormEventHandler } from 'react';
import { activeInactivePillClass } from '@/lib/statusBadges';
import { appRoleLabel } from '@/lib/appRoleLabels';

interface Member { id: number; name: string; photo_url?: string | null; email?: string | null; }
interface Ministry { id: number; name: string; }
interface AppRole { id: number; name: string; }

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
    user?: { id: number; email: string | null; roles?: string[]; ministry_ids?: number[] } | null;
}

interface Props {
    volunteers: {
        data: Volunteer[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    members: Member[];
    ministries: Ministry[];
    appRoles: AppRole[];
    filters?: {
        search?: string;
    };
}

function splitDisplayName(full: string | null | undefined): { first: string; last: string } {
    const t = (full ?? '').trim();
    if (!t) return { first: '', last: '' };
    const i = t.indexOf(' ');
    if (i === -1) return { first: t, last: '' };
    return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
}

export default function Index({ volunteers, members, ministries, appRoles, filters }: Props) {
    const { flash } = usePage().props as { flash?: { invitation_link?: string | null } };
    const invitationLink = flash?.invitation_link ?? null;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters?.search ?? '');
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        is_member: 1 as 0 | 1,
        member_id: '' as number | '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        ministry_ids: [] as number[],
        role: '',
        active: true,
        photo_file: null as File | null,
        enable_app_access: false,
        app_email: '',
        app_role: '',
        app_ministry_ids: [] as number[],
        app_password: '',
        app_password_confirmation: '',
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
        const isMember = !!v.member_id;
        const { first, last } = splitDisplayName(v.name);
        setData({
            is_member: isMember ? 1 : 0,
            member_id: v.member_id ?? '',
            first_name: isMember ? '' : first,
            last_name: isMember ? '' : last,
            email: v.email ?? '',
            phone: v.phone ?? '',
            ministry_ids: v.ministries?.map((m) => m.id) ?? [],
            role: v.role || '',
            active: v.active,
            photo_file: null,
            enable_app_access: !!v.user,
            app_email: v.user?.email ?? v.email ?? '',
            app_role: v.user?.roles?.[0] ?? '',
            app_ministry_ids: v.user?.ministry_ids ?? [],
            app_password: '',
            app_password_confirmation: '',
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
            put(route('volunteers.update', editingId), {
                forceFormData: true,
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('volunteers.store'), {
                forceFormData: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir este voluntário?')) {
            router.delete(route('volunteers.destroy', id));
        }
    };

    const copyInviteLink = (link: string) => {
        navigator.clipboard.writeText(link);
    };

    const copyForWhatsApp = (link: string) => {
        const message = `Você foi convidado a acessar o app.\n\nPara criar sua conta:\n1. Acesse o link abaixo\n2. Preencha e-mail e senha\n3. O link é válido por 7 dias\n\n${link}`;
        navigator.clipboard.writeText(message);
    };

    useEffect(() => {
        if (search === (filters?.search ?? '')) {
            return;
        }
        const timeout = setTimeout(() => {
            router.get(
                route('volunteers.index'),
                { search },
                {
                    preserveState: true,
                    replace: true,
                },
            );
        }, 400);
        return () => clearTimeout(timeout);
    }, [search, filters?.search]);

    useEffect(() => {
        if (!data.photo_file) {
            setPhotoPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(data.photo_file);
        setPhotoPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [data.photo_file]);

    const selectedMemberForPhoto =
        data.is_member === 1 && data.member_id ? members.find((m) => m.id === data.member_id) : undefined;
    const memberHasPhoto = Boolean(
        selectedMemberForPhoto?.photo_url && String(selectedMemberForPhoto.photo_url).trim() !== '',
    );
    const displayPhotoUrl = photoPreviewUrl || selectedMemberForPhoto?.photo_url || '';

    return (
        <AdminLayout>
            <Head title="Voluntários" />
            <PageHeader title="Voluntários">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                    <div className="w-full sm:w-80">
                        <TextInput
                            type="search"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome, e-mail ou telefone"
                            className="w-full"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <AddButton onClick={openCreateModal}>Novo Voluntário</AddButton>
                </div>
            </PageHeader>

            <Card className="!p-0 overflow-hidden">
                {invitationLink && (
                    <div className="px-4 md:px-8 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-green-50 dark:bg-green-900/20 flex flex-wrap items-center gap-3">
                        <span className="text-sm text-green-800 dark:text-green-200">
                            Link de convite gerado com sucesso.
                        </span>
                        <button
                            type="button"
                            onClick={() => copyInviteLink(invitationLink)}
                            className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline"
                        >
                            Copiar link
                        </button>
                        <span className="text-green-400">|</span>
                        <button
                            type="button"
                            onClick={() => copyForWhatsApp(invitationLink)}
                            className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline inline-flex items-center gap-1"
                        >
                            <DevicePhoneMobileIcon className="w-4 h-4" />
                            Copiar para WhatsApp
                        </button>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Membro</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Departamento</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cargo</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider min-w-[200px]">
                                    Conta no app
                                </th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap w-[1%]">
                                    Ações
                                </th>
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
                                        <span className={activeInactivePillClass(v.active)}>
                                            {v.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-8 py-3 md:py-4 text-zinc-700 dark:text-zinc-300">
                                        {!v.user ? (
                                            <span className="text-sm text-zinc-500 dark:text-zinc-400">Sem conta</span>
                                        ) : !v.user.email ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                                    Convite pendente
                                                </span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    Aguarda e-mail no registo
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <span className="text-sm truncate" title={v.user.email}>
                                                    {v.user.email}
                                                </span>
                                                {(v.user.roles?.length ?? 0) > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {(v.user.roles ?? []).map((rn) => (
                                                            <span
                                                                key={rn}
                                                                className="inline-flex text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                                                            >
                                                                {appRoleLabel(rn)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 md:px-8 py-3 md:py-4 text-right align-middle w-[1%] whitespace-nowrap">
                                        <div className="inline-flex flex-nowrap items-center justify-end gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(v)}
                                                className="shrink-0 p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            {!v.user?.email && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.post(route('volunteers.invite', v.id))}
                                                    className="shrink-0 p-2 text-zinc-500 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                    title="Gerar link de convite para auto cadastro"
                                                >
                                                    <LinkIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(v.id)}
                                                className="shrink-0 p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                title="Excluir"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
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
                        {data.is_member === 1 && data.member_id && (
                            <div>
                                <InputLabel value="Foto" />
                                <div className="mt-2 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xl font-semibold text-zinc-600 dark:text-zinc-300 overflow-hidden flex-shrink-0">
                                        {displayPhotoUrl ? (
                                            <img src={displayPhotoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            (selectedMemberForPhoto?.name ?? '').charAt(0).toUpperCase() || '?'
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <InputLabel
                                            htmlFor="photo_file"
                                            value={
                                                memberHasPhoto
                                                    ? 'Upload da foto (opcional — substituir)'
                                                    : 'Upload da foto (obrigatório)'
                                            }
                                            className="!mb-1"
                                        />
                                        <input
                                            id="photo_file"
                                            type="file"
                                            accept="image/*"
                                            required={!memberHasPhoto}
                                            onChange={(e) => setData('photo_file', e.target.files?.[0] ?? null)}
                                            className="block w-full text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 dark:file:text-zinc-100 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700"
                                        />
                                        <InputError message={errors.photo_file} className="mt-1" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="flex items-start gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-3">
                                <input
                                    type="checkbox"
                                    id="is_member"
                                    checked={data.is_member === 1}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setData('is_member', checked ? 1 : 0);
                                        if (checked) {
                                            setData('first_name', '');
                                            setData('last_name', '');
                                        } else {
                                            setData('member_id', '');
                                            setData('photo_file', null);
                                            if (!isEditing) {
                                                setData('app_email', '');
                                            }
                                        }
                                    }}
                                    className="mt-1 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                />
                                <div>
                                    <InputLabel htmlFor="is_member" value="Vincular a um membro cadastrado" className="!mb-0" />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Desmarque para cadastrar por nome e sobrenome (quem não é membro ou não está na lista).
                                    </p>
                                </div>
                            </div>

                            {data.is_member === 1 && (
                                <SearchableSelect
                                    id="member_id"
                                    label="Membro"
                                    value={data.member_id}
                                    onChange={(id) => {
                                        const numId = id === '' ? '' : Number(id);
                                        setData('member_id', numId);
                                        if (numId) {
                                            const m = members.find((x) => x.id === numId);
                                            setData('photo_file', null);
                                            if (!isEditing || !data.app_email) {
                                                setData('app_email', m?.email ?? '');
                                            }
                                        } else {
                                            setData('photo_file', null);
                                            if (!isEditing) {
                                                setData('app_email', '');
                                            }
                                        }
                                    }}
                                    options={members.map((m) => ({ id: m.id, name: m.name }))}
                                    placeholder="Digite para buscar membro..."
                                    emptyOption="Selecione o membro…"
                                    error={errors.member_id}
                                />
                            )}

                            {data.is_member === 0 && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <InputLabel htmlFor="first_name" value="Nome" />
                                            <TextInput
                                                id="first_name"
                                                value={data.first_name}
                                                onChange={(e) => setData('first_name', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="Nome"
                                                autoComplete="given-name"
                                            />
                                            <InputError message={errors.first_name} className="mt-1" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="last_name" value="Sobrenome" />
                                            <TextInput
                                                id="last_name"
                                                value={data.last_name}
                                                onChange={(e) => setData('last_name', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="Sobrenome"
                                                autoComplete="family-name"
                                            />
                                            <InputError message={errors.last_name} className="mt-1" />
                                        </div>
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
                        </div>
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

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-4 space-y-3">
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Conta no aplicativo</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Liga este voluntário a um utilizador com login na app (e-mail, senha e perfil). Membros já
                                    associados a um utilizador podem reutilizar essa conta.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="enable_app_access"
                                    checked={data.enable_app_access}
                                    onChange={(e) => setData('enable_app_access', e.target.checked)}
                                    className="mt-1 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                />
                                <div>
                                    <InputLabel htmlFor="enable_app_access" value="Criar ou manter acesso ao app" className="!mb-0" />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Desligar remove a ligação voluntário ↔ utilizador e invalida o acesso (conforme regras no
                                        servidor).
                                    </p>
                                </div>
                            </div>

                            {data.enable_app_access && (
                                <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                    <div>
                                        <InputLabel htmlFor="app_email" value="E-mail de login (app)" />
                                        <TextInput
                                            id="app_email"
                                            type="email"
                                            value={data.app_email}
                                            onChange={(e) => setData('app_email', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="usuario@exemplo.com"
                                        />
                                        <InputError message={errors.app_email} className="mt-1" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <InputLabel htmlFor="app_password" value="Senha (app)" />
                                            <TextInput
                                                id="app_password"
                                                type="password"
                                                value={data.app_password}
                                                onChange={(e) => setData('app_password', e.target.value)}
                                                className="mt-1 block w-full"
                                                autoComplete="new-password"
                                                placeholder={isEditing ? 'Deixe em branco para não alterar' : ''}
                                            />
                                            <InputError message={errors.app_password} className="mt-1" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="app_password_confirmation" value="Confirmar senha" />
                                            <TextInput
                                                id="app_password_confirmation"
                                                type="password"
                                                value={data.app_password_confirmation}
                                                onChange={(e) => setData('app_password_confirmation', e.target.value)}
                                                className="mt-1 block w-full"
                                                autoComplete="new-password"
                                            />
                                            <InputError message={errors.app_password_confirmation} className="mt-1" />
                                        </div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="app_role" value="Perfil de acesso no app" />
                                        <select
                                            id="app_role"
                                            value={data.app_role}
                                            onChange={(e) => setData('app_role', e.target.value)}
                                            className="mt-1 block w-full min-h-[2.75rem] h-11 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                        >
                                            <option value="">Sem perfil</option>
                                            {appRoles.map((r) => (
                                                <option key={r.id} value={r.name}>
                                                    {appRoleLabel(r.name)}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.app_role} className="mt-1" />
                                    </div>
                                    {data.app_role === 'lider_ministerio' && (
                                        <div>
                                            <InputLabel value="Departamentos geridos no app (líder de ministério)" />
                                            <div className="mt-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 max-h-48 overflow-y-auto space-y-2">
                                                {ministries.map((m) => (
                                                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={data.app_ministry_ids.includes(m.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setData('app_ministry_ids', [...data.app_ministry_ids, m.id]);
                                                                } else {
                                                                    setData(
                                                                        'app_ministry_ids',
                                                                        data.app_ministry_ids.filter((id) => id !== m.id),
                                                                    );
                                                                }
                                                            }}
                                                            className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                                        />
                                                        <span className="text-sm text-zinc-900 dark:text-white">{m.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <InputError message={errors.app_ministry_ids} className="mt-1" />
                                        </div>
                                    )}
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Se já existir utilizador com o mesmo e-mail ou membro ligado, a conta é reutilizada; só
                                        precisa de senha ao criar utilizador novo.
                                    </p>
                                </div>
                            )}
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
