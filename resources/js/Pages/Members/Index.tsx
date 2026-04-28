import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import { PencilIcon, TrashIcon, CameraIcon } from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Card from '@/Components/Card';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { useState, useEffect, useRef, FormEventHandler } from 'react';
import { activeInactivePillClass } from '@/lib/statusBadges';
import { confirmAction } from '@/utils/confirmDialog';

interface MinistryOption {
    id: number;
    name: string;
}

interface AssignableRole {
    name: string;
    label: string;
}

interface Member {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    address: string | null;
    status: 'active' | 'inactive';
    is_volunteer?: boolean;
    is_ministry_leader?: boolean;
    volunteer_ministry_ids?: number[];
    app_ministry_ids?: number[];
    photo_url?: string | null;
    notify_via_app?: boolean;
    notify_via_email?: boolean;
    notify_via_whatsapp?: boolean;
    lgpd_accepted_at?: string | null;
    created_at: string;
    role_name?: string | null;
    role_label?: string | null;
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
    ministryOptions: MinistryOption[];
    assignableRoles?: AssignableRole[];
    filters?: {
        search?: string;
    };
}

function pickAssignableRoleName(assignableRoles: AssignableRole[], preferred: string | null | undefined): string {
    const list = assignableRoles ?? [];
    const p = preferred ?? '';
    if (p && list.some((r) => r.name === p)) {
        return p;
    }
    return '';
}

function firstFlatError(errors: Record<string, string | string[] | undefined>): string | null {
    for (const key of Object.keys(errors)) {
        const v = errors[key];
        if (v === undefined) {
            continue;
        }
        const s = Array.isArray(v) ? v[0] : v;
        if (typeof s === 'string' && s.trim() !== '') {
            return s;
        }
    }
    return null;
}

export default function Index({ members, ministryOptions = [], assignableRoles = [], filters }: Props) {
    const page = usePage();
    const isSuperAdmin = (page.props as { auth?: { isSuperAdmin?: boolean } }).auth?.isSuperAdmin === true;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters?.search ?? '');
    const hydratedErrorKey = useRef<string | null>(null);
    const memberFormModeRef = useRef<{ isEditing: boolean; editingId: number | null }>({
        isEditing: false,
        editingId: null,
    });
    const departmentsSectionRef = useRef<HTMLDivElement | null>(null);
    const lastLeaderFlagRef = useRef<boolean>(false);
    const lastSavedMemberPhotoRef = useRef<string | null>(null);
    const [avatarPreviewSrc, setAvatarPreviewSrc] = useState<string | null>(null);
    const [submitMessage, setSubmitMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        name: '',
        email: '',
        phone: '',
        birth_date: '',
        status: 'active' as 'active' | 'inactive',
        is_volunteer: false as boolean,
        is_ministry_leader: false as boolean,
        department_ids: [] as number[],
        volunteer_ministry_ids: [] as number[],
        app_ministry_ids: [] as number[],
        password: '',
        password_confirmation: '',
        photo: null as File | null,
        inertia_member_form: 'create' as 'create' | 'edit',
        inertia_member_id: null as number | null,
        notify_via_app: true,
        notify_via_email: true,
        notify_via_whatsapp: false,
        lgpd_accepted: false as boolean,
        role_name: '',
    });

    useEffect(() => {
        memberFormModeRef.current = { isEditing, editingId };
    }, [isEditing, editingId]);

    useEffect(() => {
        const prev = lastLeaderFlagRef.current;
        const next = data.is_ministry_leader === true;
        lastLeaderFlagRef.current = next;
        if (!prev && next) {
            // Aguarda um tick para o DOM renderizar a seção antes de rolar.
            window.setTimeout(() => {
                departmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    }, [data.is_ministry_leader]);

    transform((form) => {
        const editing =
            memberFormModeRef.current.isEditing && memberFormModeRef.current.editingId;
        // Sem isto, `photo` (ficheiro) vem antes de `role_name` na ordem das chaves do `useForm` e o
        // multipart pode cortar o fim do pedido (post_max_size / limites) — o Laravel deixa de receber `role_name`.
        const { photo, ...rest } = form;
        const departmentIds = Array.isArray(rest.department_ids) ? rest.department_ids : [];
        const isVolunteer = Boolean(rest.is_volunteer);
        return {
            ...rest,
            role_name: rest.role_name ?? '',
            volunteer_ministry_ids: isVolunteer ? departmentIds : [],
            app_ministry_ids: departmentIds,
            inertia_member_form: editing ? 'edit' : 'create',
            inertia_member_id: editing ? memberFormModeRef.current.editingId : null,
            // PHP < 8.4 não preenche $_POST em PUT multipart; POST + _method é o padrão Laravel para uploads.
            ...(editing ? { _method: 'put' as const } : {}),
            photo,
        };
    });

    const openCreateModal = () => {
        memberFormModeRef.current = { isEditing: false, editingId: null };
        setSubmitMessage(null);
        setIsEditing(false);
        setEditingId(null);
        lastSavedMemberPhotoRef.current = null;
        setAvatarPreviewSrc(null);
        reset();
        clearErrors();
        hydratedErrorKey.current = null;
        setIsModalOpen(true);
    };

    const openEditModal = (member: Member) => {
        memberFormModeRef.current = { isEditing: true, editingId: member.id };
        setSubmitMessage(null);
        setIsEditing(true);
        setEditingId(member.id);
        const saved = member.photo_url?.trim() ? member.photo_url : null;
        lastSavedMemberPhotoRef.current = saved;
        setAvatarPreviewSrc(saved);
        const volunteerIds = [...(member.volunteer_ministry_ids ?? [])];
        const leaderIds = [...(member.app_ministry_ids ?? [])];
        const departmentIds = Array.from(new Set([...volunteerIds, ...leaderIds]));
        setData({
            name: member.name,
            email: member.email || '',
            phone: member.phone || '',
            birth_date: member.birth_date ? member.birth_date.split('T')[0] : '',
            status: member.status,
            is_volunteer: Boolean(member.is_volunteer),
            is_ministry_leader: Boolean(member.is_ministry_leader),
            department_ids: departmentIds,
            volunteer_ministry_ids: [...(member.volunteer_ministry_ids ?? [])],
            app_ministry_ids: [...(member.app_ministry_ids ?? [])],
            password: '',
            password_confirmation: '',
            photo: null,
            inertia_member_form: 'edit',
            inertia_member_id: member.id,
            notify_via_app: member.notify_via_app !== false,
            notify_via_email: member.notify_via_email !== false,
            notify_via_whatsapp: member.notify_via_whatsapp === true,
            lgpd_accepted: Boolean(member.lgpd_accepted_at),
            role_name: pickAssignableRoleName(assignableRoles, member.role_name),
        });
        clearErrors();
        hydratedErrorKey.current = null;
        setIsModalOpen(true);
    };

    const closeModal = () => {
        memberFormModeRef.current = { isEditing: false, editingId: null };
        setSubmitMessage(null);
        if (avatarPreviewSrc?.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreviewSrc);
        }
        setIsModalOpen(false);
        setAvatarPreviewSrc(null);
        lastSavedMemberPhotoRef.current = null;
        reset();
        hydratedErrorKey.current = null;
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (isEditing && editingId) {
            post(route('members.update', editingId), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => closeModal(),
                onError: (errs) => {
                    const msg = firstFlatError(errs) ?? 'Não foi possível guardar. Verifique os campos.';
                    setSubmitMessage({ kind: 'error', text: msg });
                },
            });
        } else {
            post(route('members.store'), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => closeModal(),
                onError: (errs) => {
                    const msg = firstFlatError(errs) ?? 'Não foi possível guardar. Verifique os campos.';
                    setSubmitMessage({ kind: 'error', text: msg });
                },
            });
        }
    };

    /** Após validação falhada o servidor faz redirect 303 com `oldInput` — reabre o modal com os dados. */
    useEffect(() => {
        const props = page.props as { oldInput?: Record<string, unknown>; errors?: Record<string, string | string[] | undefined> };
        const old = props.oldInput;
        if (!old || typeof old !== 'object' || Object.keys(old).length === 0) {
            return;
        }
        const flatErrors = props.errors ?? {};
        const errKeys = Object.keys(flatErrors);
        if (errKeys.length === 0) {
            return;
        }
        const memberKeys = new Set([
            'name',
            'email',
            'phone',
            'birth_date',
            'address',
            'status',
            'is_volunteer',
            'volunteer_ministry_ids',
            'password',
            'password_confirmation',
            'photo',
            'notify_via_app',
            'notify_via_email',
            'notify_via_whatsapp',
            'lgpd_accepted',
            'role_name',
        ]);
        if (!errKeys.some((k) => memberKeys.has(k))) {
            return;
        }
        const fingerprint = `${errKeys.sort().join('|')}:${JSON.stringify(old)}`;
        if (hydratedErrorKey.current === fingerprint) {
            return;
        }
        hydratedErrorKey.current = fingerprint;

        const formKind = old.inertia_member_form === 'edit' ? 'edit' : 'create';
        const mid = old.inertia_member_id;
        const idNum = typeof mid === 'number' ? mid : typeof mid === 'string' ? parseInt(mid, 10) : NaN;

        setIsEditing(formKind === 'edit' && !Number.isNaN(idNum));
        setEditingId(formKind === 'edit' && !Number.isNaN(idNum) ? idNum : null);

        setData((prev) => ({
            ...prev,
            name: typeof old.name === 'string' ? old.name : String(old.name ?? prev.name ?? ''),
            email: typeof old.email === 'string' ? old.email : String(old.email ?? prev.email ?? ''),
            phone: typeof old.phone === 'string' ? old.phone : String(old.phone ?? prev.phone ?? ''),
            birth_date:
                typeof old.birth_date === 'string'
                    ? old.birth_date
                    : old.birth_date
                      ? String(old.birth_date)
                      : prev.birth_date,
            status: old.status === 'inactive' ? 'inactive' : 'active',
            is_volunteer: old.is_volunteer === true || old.is_volunteer === 1 || old.is_volunteer === '1',
            volunteer_ministry_ids: Array.isArray(old.volunteer_ministry_ids)
                ? (old.volunteer_ministry_ids as unknown[]).map((x) => Number(x)).filter((n) => !Number.isNaN(n) && n > 0)
                : prev.volunteer_ministry_ids,
            password: '',
            password_confirmation: '',
            photo: null,
            notify_via_app: old.notify_via_app === false ? false : true,
            notify_via_email: old.notify_via_email === false ? false : true,
            notify_via_whatsapp: old.notify_via_whatsapp === true || old.notify_via_whatsapp === '1',
            lgpd_accepted: old.lgpd_accepted === true || old.lgpd_accepted === '1' || old.lgpd_accepted === 1,
            role_name:
                typeof old.role_name === 'string' && old.role_name
                    ? pickAssignableRoleName(assignableRoles, old.role_name)
                    : '',
            inertia_member_form: formKind === 'edit' ? 'edit' : 'create',
            inertia_member_id: formKind === 'edit' && !Number.isNaN(idNum) ? idNum : null,
        }));
        const errMsg = firstFlatError(flatErrors);
        if (errMsg) {
            setSubmitMessage({ kind: 'error', text: errMsg });
        }
        setIsModalOpen(true);
    }, [page.props, assignableRoles]);

    const memberForLgpd =
        isEditing && editingId !== null ? members.data.find((m) => m.id === editingId) ?? null : null;
    const showLgpdField = !memberForLgpd?.lgpd_accepted_at;

    /** Só leitura: quem tem `members.view` sem poder atribuir perfis ainda vê o perfil actual. */
    const profileReadOnly =
        isEditing && assignableRoles.length === 0 && memberForLgpd !== null;
    const profileReadOnlyText =
        memberForLgpd?.role_label && memberForLgpd.role_label.trim() !== ''
            ? memberForLgpd.role_label
            : memberForLgpd?.role_name && String(memberForLgpd.role_name).trim() !== ''
              ? String(memberForLgpd.role_name)
              : 'Sem perfil';

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

    const flash = (page.props as { flash?: { success?: string | null; error?: string | null } }).flash;
    const pageFlashSuccess =
        typeof flash?.success === 'string' && flash.success.trim() !== '' ? flash.success : null;
    const pageFlashError = typeof flash?.error === 'string' && flash.error.trim() !== '' ? flash.error : null;

    return (
        <AdminLayout>
            <Head title="Usuários" />

            <PageHeader
                title="Usuários"
                subtitle={
                    <>
                        Acesso e login baseiam-se na tabela de utilizadores (
                        <strong className="font-medium text-zinc-700 dark:text-zinc-300">users</strong>); a ficha na igreja é{' '}
                        <strong className="font-medium text-zinc-700 dark:text-zinc-300">members</strong>. O mesmo núcleo do registo público «Criar conta»: nome e e-mail obrigatórios; telefone e data de nascimento são opcionais.{' '}
                        <strong className="font-medium text-zinc-700 dark:text-zinc-300">Morada não é pedida nesta fase.</strong>
                    </>
                }
                actions={<AddButton variant="icon" onClick={openCreateModal} title="Novo usuário">Novo usuário</AddButton>}
            >
                <div className="w-full min-w-0 max-w-md">
                    <TextInput
                        type="search"
                        name="search"
                        value={search}
                        placeholder="Buscar por nome, e-mail ou telefone"
                        className="w-full min-w-0"
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </PageHeader>

            {pageFlashSuccess ? (
                <div
                    role="status"
                    className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50"
                >
                    {pageFlashSuccess}
                </div>
            ) : null}
            {pageFlashError ? (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-50"
                >
                    <span className="font-semibold">Erro</span>
                    <p className="mt-1 font-normal opacity-95">{pageFlashError}</p>
                </div>
            ) : null}

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Nome
                                </th>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    E-mail
                                </th>
                                <th className="px-4 py-3 sm:px-6 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Perfil
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
                                    <td className="px-4 py-4 sm:px-6 sm:py-6 align-top max-w-[10rem]">
                                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 leading-snug">
                                            {member.role_label ?? '—'}
                                        </span>
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

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg" disableBodyScroll>
                <div className="flex max-h-[min(92dvh,calc(100dvh-1rem))] min-h-0 flex-col bg-white dark:bg-zinc-900">
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-10 sm:px-6 sm:pb-6 sm:pt-11">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white sm:text-xl pr-8">
                        {isEditing ? 'Editar usuário' : 'Novo usuário'}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-5">
                        {isEditing
                            ? 'Atualize nome, e-mail, contactos opcionais e estado. A morada não é alterada neste formulário.'
                            : 'Cria a conta de login na igreja. Defina uma senha inicial (mínimo 6 caracteres); a pessoa pode alterá-la depois em «Editar dados da conta» ou em «Esqueci a senha».'}
                    </p>

                    {submitMessage ? (
                        <div
                            role="alert"
                            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                                submitMessage.kind === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100'
                                    : 'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold">
                                        {submitMessage.kind === 'success' ? 'Guardado com sucesso' : 'Não foi possível guardar'}
                                    </p>
                                    <p className="mt-1 text-sm opacity-90">{submitMessage.text}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSubmitMessage(null)}
                                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    ) : null}

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

                        {!isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="password" value="Senha inicial" className="mb-1" />
                                    <TextInput
                                        id="password"
                                        type="password"
                                        className="block w-full"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        autoComplete="new-password"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <InputError message={errors.password} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="password_confirmation" value="Confirmar senha" className="mb-1" />
                                    <TextInput
                                        id="password_confirmation"
                                        type="password"
                                        className="block w-full"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    <InputError message={errors.password_confirmation} className="mt-2" />
                                </div>
                            </div>
                        ) : null}

                        {isEditing && isSuperAdmin ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Nova senha de acesso</p>
                                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/90">
                                    Apenas super administrador: deixe em branco para manter a senha actual; caso contrário, defina uma nova
                                    (mesmas regras de complexidade que no registo).
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor="edit_password" value="Nova senha (opcional)" className="mb-1" />
                                        <TextInput
                                            id="edit_password"
                                            type="password"
                                            className="block w-full"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="edit_password_confirmation" value="Confirmar nova senha" className="mb-1" />
                                        <TextInput
                                            id="edit_password_confirmation"
                                            type="password"
                                            className="block w-full"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <InputError message={errors.password_confirmation} className="mt-2" />
                                    </div>
                                </div>
                            </div>
                        ) : null}

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

                        {assignableRoles.length > 0 ? (
                            <div>
                                <InputLabel htmlFor="role_name" value="Perfil de acesso" className="mb-1" />
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                                    Define o papel no painel e nas permissões (ex.: secretaria, pastor, membro da app).
                                </p>
                                <SelectInput
                                    id="role_name"
                                    className="block w-full"
                                    value={data.role_name}
                                    onChange={(e) => setData('role_name', e.target.value)}
                                >
                                    <option value="">Sem perfil</option>
                                    {assignableRoles.map((r) => (
                                        <option key={r.name} value={r.name}>
                                            {r.label}
                                        </option>
                                    ))}
                                </SelectInput>
                                <InputError message={errors.role_name} className="mt-2" />
                            </div>
                        ) : profileReadOnly ? (
                            <div>
                                <InputLabel value="Perfil de acesso" className="mb-1" />
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                                    O seu acesso permite ver utilizadores, mas não alterar o perfil de permissões.
                                </p>
                                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-100">
                                    {profileReadOnlyText}
                                </p>
                            </div>
                        ) : null}

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700">
                                    <CameraIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div>
                                        <InputLabel htmlFor="member_face_photo" value="Foto do utilizador (opcional)" className="!mb-1" />
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            No telemóvel pode usar a câmara; no computador, escolha um ficheiro de imagem (máx. 4 MB).
                                        </p>
                                    </div>
                                    <input
                                        id="member_face_photo"
                                        type="file"
                                        accept="image/*"
                                        capture="user"
                                        className="block w-full max-w-md text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-white"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            if (avatarPreviewSrc?.startsWith('blob:')) {
                                                URL.revokeObjectURL(avatarPreviewSrc);
                                            }
                                            setData('photo', file);
                                            if (file) {
                                                setAvatarPreviewSrc(URL.createObjectURL(file));
                                            } else {
                                                setAvatarPreviewSrc(lastSavedMemberPhotoRef.current);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                    {data.photo ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (avatarPreviewSrc?.startsWith('blob:')) {
                                                    URL.revokeObjectURL(avatarPreviewSrc);
                                                }
                                                setData('photo', null);
                                                setAvatarPreviewSrc(lastSavedMemberPhotoRef.current);
                                            }}
                                            className="text-xs font-semibold text-primary-600 underline dark:text-primary-400"
                                        >
                                            Remover foto nova
                                        </button>
                                    ) : null}
                                    <InputError message={errors.photo} className="!mt-1" />
                                </div>
                            </div>
                            {avatarPreviewSrc ? (
                                <div className="flex items-center gap-3 pt-1">
                                    <img
                                        src={avatarPreviewSrc}
                                        alt=""
                                        className="h-16 w-16 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-600"
                                    />
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Pré-visualização</span>
                                </div>
                            ) : null}
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Comunicações</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Preferências de contacto para avisos da igreja e da app (editáveis depois no perfil do utilizador).
                            </p>
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="notify_via_app"
                                    checked={data.notify_via_app}
                                    onChange={(e) => setData('notify_via_app', e.target.checked)}
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-200">Notificações na app</span>
                            </label>
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="notify_via_email"
                                    checked={data.notify_via_email}
                                    onChange={(e) => setData('notify_via_email', e.target.checked)}
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-200">E-mail</span>
                            </label>
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="notify_via_whatsapp"
                                    checked={data.notify_via_whatsapp}
                                    onChange={(e) => setData('notify_via_whatsapp', e.target.checked)}
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-200">WhatsApp (quando disponível)</span>
                            </label>
                            <InputError message={errors.notify_via_app} className="!mt-1" />
                            <InputError message={errors.notify_via_email} className="!mt-1" />
                            <InputError message={errors.notify_via_whatsapp} className="!mt-1" />
                        </div>

                        {showLgpdField ? (
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                                <label className="flex cursor-pointer items-start gap-3">
                                    <Checkbox
                                        name="lgpd_accepted"
                                        checked={data.lgpd_accepted}
                                        onChange={(e) => setData('lgpd_accepted', e.target.checked)}
                                    />
                                    <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                        O utilizador aceita o tratamento dos dados pessoais conforme a{' '}
                                        <strong className="font-semibold text-zinc-900 dark:text-white">LGPD</strong> nesta
                                        plataforma.
                                    </span>
                                </label>
                                <InputError message={errors.lgpd_accepted} className="mt-2" />
                            </div>
                        ) : null}

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3">
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="is_volunteer"
                                    checked={data.is_volunteer}
                                    onChange={(e) => {
                                        const on = e.target.checked;
                                        setData('is_volunteer', on);
                                    }}
                                />
                                <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                    <span className="font-semibold text-zinc-900 dark:text-white">Voluntário</span> — serve ou
                                    irá servir em ministérios. Os departamentos abaixo são usados nas escalas; outros detalhes
                                    podem ser completados em <span className="font-medium">Voluntários</span> quando aplicável.
                                </span>
                            </label>
                            <InputError message={errors.is_volunteer} className="mt-2" />
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3">
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="is_ministry_leader"
                                    checked={data.is_ministry_leader}
                                    onChange={(e) => setData('is_ministry_leader', e.target.checked)}
                                />
                                <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                    <span className="font-semibold text-zinc-900 dark:text-white">Líder</span> — habilita a opção{' '}
                                    <span className="font-medium">Meus voluntários</span> (no menu “Mais”) para gerir o status dos encaminhados.
                                </span>
                            </label>
                            <InputError message={errors.is_ministry_leader} className="mt-2" />
                        </div>

                        {(ministryOptions.length > 0) ? (
                            <div
                                ref={departmentsSectionRef}
                                className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3"
                            >
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Departamentos</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Selecione os departamentos que este usuário lidera e/ou em que serve.
                                </p>
                                {ministryOptions.length > 0 ? (
                                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-600 space-y-2">
                                        <div className="space-y-2 pr-1 sm:max-h-48 sm:overflow-y-auto">
                                            {ministryOptions.map((m) => (
                                                <label key={m.id} className="flex cursor-pointer items-start gap-3">
                                                    <Checkbox
                                                        name={`department_${m.id}`}
                                                        checked={data.department_ids.includes(m.id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            const next = new Set(data.department_ids);
                                                            if (checked) {
                                                                next.add(m.id);
                                                            } else {
                                                                next.delete(m.id);
                                                            }
                                                            setData('department_ids', [...next]);

                                                            // Se começou a escolher departamentos, assumimos que este usuário
                                                            // também deve ser marcado como voluntário (serve/irá servir).
                                                            if (next.size > 0 && !data.is_volunteer) {
                                                                setData('is_volunteer', true);
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">{m.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <InputError message={errors.volunteer_ministry_ids} className="!mt-1" />
                                        <InputError message={errors.app_ministry_ids} className="!mt-1" />
                                    </div>
                                ) : (
                                    <p className="text-xs text-amber-800 dark:text-amber-200 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                                        Ainda não há departamentos (ministérios) configurados para esta igreja.
                                    </p>
                                )}
                            </div>
                        ) : null}

                        <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col-reverse gap-3 border-t border-zinc-100 bg-white/95 px-4 pb-2 pt-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 sm:pb-0 sm:pt-5">
                            <SecondaryButton type="button" onClick={closeModal} className="justify-center sm:w-auto">
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                disabled={
                                    processing ||
                                    (data.is_ministry_leader && (data.department_ids?.length ?? 0) < 1)
                                }
                                className="justify-center sm:w-auto"
                            >
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
