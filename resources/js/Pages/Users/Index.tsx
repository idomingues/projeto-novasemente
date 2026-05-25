import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import {
    PencilIcon,
    TrashIcon,
    CameraIcon,
    UserGroupIcon,
    EnvelopeIcon,
    LinkIcon,
    DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import LeaderPublicSignupShareModal from '@/Components/Leaders/LeaderPublicSignupShareModal';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import PasswordInput from '@/Components/PasswordInput';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Card from '@/Components/Card';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { useState, useEffect, useRef, FormEventHandler } from 'react';
import { PhotoPreviewButton } from '@/Components/PhotoPreview';
import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import UserListAvatar from '@/Components/UserListAvatar';
import { activeInactivePillClass } from '@/lib/statusBadges';
import { confirmAction } from '@/utils/confirmDialog';
import SortedMultiCheckboxList from '@/Components/SortedMultiCheckboxList';

interface MinistryOption {
    id: number;
    name: string;
}

interface AssignableRole {
    name: string;
    label: string;
}

interface InvitationRow {
    id: number;
    email: string | null;
    user_name: string | null;
    role: string | null;
    token: string;
    expires_at: string | null;
    used_at: string | null;
    link: string;
}

interface InviteRole {
    id: number;
    name: string;
}

interface Member {
    id: number;
    name: string;
    email: string | null;
    needs_registration?: boolean;
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
    profile_kind?: 'app_only' | 'volunteer';
    volunteer_profile_id?: number | null;
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
        leaders_only?: string;
        app_members_only?: string;
        ministry_id?: string;
    };
    canManageLeaderSignupLink?: boolean;
    leaderSelfSignupUrl?: string | null;
    leaderSelfSignupChurch?: string | null;
    canManageUsers?: boolean;
    canManageMembers?: boolean;
    invitations?: InvitationRow[];
    inviteRoles?: InviteRole[];
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

export default function Index({
    members,
    ministryOptions = [],
    assignableRoles = [],
    filters,
    canManageLeaderSignupLink = false,
    leaderSelfSignupUrl = null,
    leaderSelfSignupChurch = null,
    canManageUsers = false,
    canManageMembers = false,
    invitations = [],
    inviteRoles = [],
}: Props) {
    const page = usePage();
    const isSuperAdmin = (page.props as { auth?: { isSuperAdmin?: boolean } }).auth?.isSuperAdmin === true;
    const canChangeUserPassword = canManageMembers || canManageUsers;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters?.search ?? '');
    const [leaderFilter, setLeaderFilter] = useState(filters?.leaders_only ?? '');
    const [appMembersFilter, setAppMembersFilter] = useState(filters?.app_members_only ?? '');
    const [ministryFilter, setMinistryFilter] = useState(filters?.ministry_id ?? '');

    const listFilterParams = (overrides?: {
        search?: string;
        leaders_only?: string;
        app_members_only?: string;
        ministry_id?: string;
    }) => {
        const params: Record<string, string> = {};
        const s = overrides?.search ?? search;
        const l = overrides?.leaders_only ?? leaderFilter;
        const a = overrides?.app_members_only ?? appMembersFilter;
        const m = overrides?.ministry_id ?? ministryFilter;
        if (s.trim() !== '') {
            params.search = s.trim();
        }
        if (l === '1') {
            params.leaders_only = '1';
        }
        if (a === '1') {
            params.app_members_only = '1';
        }
        if (m !== '') {
            params.ministry_id = m;
        }
        return params;
    };

    const applyListFilters = (overrides?: {
        search?: string;
        leaders_only?: string;
        app_members_only?: string;
        ministry_id?: string;
    }) => {
        router.get(route('users.index'), listFilterParams(overrides), {
            preserveState: true,
            replace: true,
        });
    };
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
    const [leaderShareOpen, setLeaderShareOpen] = useState(false);
    const [leaderShareUrl, setLeaderShareUrl] = useState<string | null>(null);
    const [leaderShareChurch, setLeaderShareChurch] = useState<string>('');
    const [leaderLinkRotating, setLeaderLinkRotating] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    const inviteForm = useForm({
        email: '',
        role: '',
    });

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
        // Sem isto, `photo` (arquivo) vem antes de `role_name` na ordem das chaves do `useForm` e o
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
                    const msg = firstFlatError(errs) ?? 'Não foi possível salvar. Verifique os campos.';
                    setSubmitMessage({ kind: 'error', text: msg });
                },
            });
        } else {
            post(route('members.store'), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => closeModal(),
                onError: (errs) => {
                    const msg = firstFlatError(errs) ?? 'Não foi possível salvar. Verifique os campos.';
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

    const submitInvite: FormEventHandler = (e) => {
        e.preventDefault();
        inviteForm.post(route('invitations.store'), {
            onSuccess: () => {
                setInviteModalOpen(false);
                inviteForm.reset();
            },
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

    const handleRemoveInvitation = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover convite?',
            text: 'O link deixará de funcionar.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('invitations.destroy', id));
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir usuário?',
            text: 'Esta ação não pode ser desfeita. O acesso ao app será removido e a pessoa deixará de conseguir entrar.',
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
            applyListFilters({ search });
        }, 200);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filters?.search]);

    const flash = (page.props as {
        flash?: {
            success?: string | null;
            error?: string | null;
            leader_self_signup_url?: string | null;
            leader_self_signup_church?: string | null;
        };
    }).flash;

    useEffect(() => {
        const u = flash?.leader_self_signup_url;
        if (typeof u === 'string' && u.length > 0) {
            setLeaderShareUrl(u);
            setLeaderShareChurch(typeof flash?.leader_self_signup_church === 'string' ? flash.leader_self_signup_church : '');
            setLeaderShareOpen(true);
        }
    }, [flash?.leader_self_signup_url, flash?.leader_self_signup_church]);

    const leaderLinkForModal = leaderShareUrl ?? leaderSelfSignupUrl ?? '';
    const leaderChurchForModal = leaderShareChurch || leaderSelfSignupChurch || '';

    const rotateLeaderLink = () => {
        setLeaderLinkRotating(true);
        router.post(
            route('leaders.self-signup.rotate'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setLeaderLinkRotating(false),
            },
        );
    };
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
                        Pessoas com conta para entrar no aplicativo (papel <strong className="font-medium">membro</strong> da igreja,
                        líderes ou equipe). Quem <strong className="font-medium">serve em ministérios</strong> deve também ter ficha em{' '}
                        <strong className="font-medium">Voluntários</strong> — são cadastros complementares, não o mesmo menu.
                    </>
                }
                actions={
                    canManageMembers ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Novo usuário">
                            Novo usuário
                        </AddButton>
                    ) : null
                }
            >
                <div className="flex w-full flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        {canManageLeaderSignupLink && leaderLinkForModal ? (
                            <SecondaryButton
                                type="button"
                                onClick={() => {
                                    setLeaderShareUrl(null);
                                    setLeaderShareChurch('');
                                    setLeaderShareOpen(true);
                                }}
                                className="shrink-0 justify-center gap-2 sm:w-auto"
                            >
                                <UserGroupIcon className="h-5 w-5" />
                                Link para líderes (WhatsApp)
                            </SecondaryButton>
                        ) : null}
                        {canManageUsers ? (
                            <SecondaryButton
                                type="button"
                                onClick={() => setInviteModalOpen(true)}
                                className="shrink-0 justify-center gap-2 sm:w-auto"
                            >
                                <EnvelopeIcon className="h-5 w-5" />
                                Convidar
                            </SecondaryButton>
                        ) : null}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="w-full sm:w-52">
                            <InputLabel value="Líderes" className="mb-1" />
                            <SelectInput
                                value={leaderFilter}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setLeaderFilter(v);
                                    applyListFilters({ leaders_only: v });
                                }}
                                className="w-full"
                            >
                                <option value="">Todos os membros</option>
                                <option value="1">Apenas líderes de departamento</option>
                            </SelectInput>
                        </div>
                        <div className="w-full sm:w-52">
                            <InputLabel value="Tipo" className="mb-1" />
                            <SelectInput
                                value={appMembersFilter}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setAppMembersFilter(v);
                                    applyListFilters({ app_members_only: v });
                                }}
                                className="w-full"
                            >
                                <option value="">Todos</option>
                                <option value="1">Só app (sem voluntário)</option>
                            </SelectInput>
                        </div>
                        <div className="w-full sm:flex-1 sm:max-w-xs">
                            <InputLabel value="Departamento" className="mb-1" />
                            <SelectInput
                                value={ministryFilter}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setMinistryFilter(v);
                                    applyListFilters({ ministry_id: v });
                                }}
                                className="w-full"
                            >
                                <option value="">Todos os departamentos</option>
                                {ministryOptions.map((m) => (
                                    <option key={m.id} value={String(m.id)}>
                                        {m.name}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                    </div>
                </div>
            </PageHeader>

            {canManageLeaderSignupLink && leaderLinkForModal ? (
                <LeaderPublicSignupShareModal
                    show={leaderShareOpen}
                    link={leaderLinkForModal}
                    churchName={leaderChurchForModal || 'Igreja'}
                    onClose={() => {
                        setLeaderShareOpen(false);
                        setLeaderShareUrl(null);
                        setLeaderShareChurch('');
                    }}
                    onRotate={rotateLeaderLink}
                    rotating={leaderLinkRotating}
                />
            ) : null}

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
                                <th className="sticky right-0 z-20 w-[1%] whitespace-nowrap bg-zinc-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.12)] dark:bg-zinc-900 dark:text-zinc-400 dark:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.45)] sm:px-6">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {members.data.map((member) => (
                                <tr
                                    key={member.id}
                                    role="button"
                                    tabIndex={0}
                                    title={canManageMembers ? 'Clique para editar' : 'Clique para ver detalhes'}
                                    className="cursor-pointer bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group"
                                    onClick={() => openEditModal(member)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openEditModal(member);
                                        }
                                    }}
                                >
                                    <td className="cursor-pointer px-4 py-4 sm:px-6 sm:py-6 align-top">
                                        <div className="flex items-center gap-3">
                                            <UserListAvatar name={member.name} photoUrl={member.photo_url} size="md" />
                                            <div className="min-w-0">
                                                <div className="text-base font-medium text-zinc-900 dark:text-white">{member.name}</div>
                                                <div className="mt-1 text-xs text-zinc-500">
                                                    Cadastrado em {new Date(member.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="cursor-pointer px-4 py-4 sm:px-6 sm:py-6 align-top max-w-[14rem] sm:max-w-xs">
                                        <div className="text-sm text-zinc-800 dark:text-zinc-100 break-all font-mono leading-snug">
                                            {member.email?.trim() ? member.email : <span className="text-zinc-400 dark:text-zinc-500 font-sans">—</span>}
                                        </div>
                                    </td>
                                    <td className="cursor-pointer px-4 py-4 sm:px-6 sm:py-6 align-top max-w-[10rem]">
                                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 leading-snug">
                                            {member.role_label ?? '—'}
                                        </span>
                                    </td>
                                    <td className="cursor-pointer px-4 py-4 sm:px-6 sm:py-6 align-top whitespace-nowrap">
                                        <div className="text-sm text-zinc-800 dark:text-zinc-100 tabular-nums">
                                            {member.phone?.trim() ? member.phone : <span className="text-zinc-400 dark:text-zinc-500">—</span>}
                                        </div>
                                    </td>
                                    <td className="cursor-pointer px-4 py-4 sm:px-6 sm:py-6 whitespace-nowrap">
                                        {member.profile_kind === 'volunteer' ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                                                    Também voluntário
                                                </span>
                                                {member.volunteer_profile_id ? (
                                                    <Link
                                                        href={route('volunteers.index', { voluntario: member.volunteer_profile_id })}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="cursor-pointer text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                                                    >
                                                        Ver cadastro
                                                    </Link>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span className="inline-flex w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                                Só app
                                            </span>
                                        )}
                                    </td>
                                    <td className="cursor-pointer px-4 py-4 sm:px-6 sm:py-6 whitespace-nowrap">
                                        <span className={activeInactivePillClass(member.status === 'active')}>
                                            {member.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td
                                        className="sticky right-0 z-10 cursor-default whitespace-nowrap bg-white px-4 py-4 text-right text-sm font-medium shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.12)] group-hover:bg-zinc-50 dark:bg-zinc-950 dark:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.45)] dark:group-hover:bg-zinc-900 sm:px-6 sm:py-6"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                                            {canManageMembers ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(member)}
                                                    className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-white dark:text-zinc-300"
                                                    title="Editar"
                                                    aria-label="Editar"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                            ) : null}
                                            {canManageUsers && member.needs_registration ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.post(route('users.invite', member.id));
                                                    }}
                                                    className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-green-400 dark:text-zinc-300"
                                                    title="Gerar link de convite (WhatsApp) para finalizar cadastro"
                                                    aria-label="Convidar"
                                                >
                                                    <LinkIcon className="h-5 w-5" />
                                                </button>
                                            ) : null}
                                            {canManageMembers ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleDelete(member.id);
                                                    }}
                                                    className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400 dark:text-zinc-300"
                                                    title="Excluir"
                                                    aria-label="Excluir"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            ) : null}
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

            {canManageUsers ? (
                <section className="mt-10 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Convites para auto-cadastro</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Envie o link do convite para a pessoa se cadastrar. O link vale 7 dias.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">
                                        Convidado
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">
                                        Papel
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">
                                        Link
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {invitations.map((i) => {
                                    const used = !!i.used_at;
                                    const expired = i.expires_at && new Date(i.expires_at) < new Date();
                                    const status = used ? 'Usado' : expired ? 'Expirado' : 'Pendente';
                                    return (
                                        <tr key={i.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                            <td className="px-4 md:px-6 py-3 text-zinc-900 dark:text-white">
                                                {i.user_name ?? i.email ?? '—'}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 text-zinc-600 dark:text-zinc-300">{i.role ?? '—'}</td>
                                            <td className="px-4 md:px-6 py-3">
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded ${
                                                        used
                                                            ? 'bg-zinc-200 dark:bg-zinc-700'
                                                            : expired
                                                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                                    }`}
                                                >
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3">
                                                {!used && !expired ? (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyLink(i.link)}
                                                            className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
                                                        >
                                                            Copiar link
                                                        </button>
                                                        <span className="text-zinc-400">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyForWhatsApp(i.link)}
                                                            className="text-sm text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
                                                            title="Copiar mensagem com instruções para colar no WhatsApp"
                                                        >
                                                            <DevicePhoneMobileIcon className="w-4 h-4" /> WhatsApp
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRemoveInvitation(i.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-600 rounded-lg"
                                                    title="Remover"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {invitations.length === 0 ? (
                        <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                            Nenhum convite. Clique em &quot;Convidar&quot; para gerar um link.
                        </div>
                    ) : null}
                </section>
            ) : null}

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg" disableBodyScroll>
                <div className="flex max-h-[min(92dvh,calc(100dvh-1rem))] min-h-0 flex-col bg-white dark:bg-zinc-900">
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-10 sm:px-6 sm:pb-6 sm:pt-11">
                    {isEditing ? (
                        <div className="mb-5 pr-8">
                            <RecordDetailHeader
                                title={(data.name ?? '').trim() || memberForLgpd?.name || 'Usuário'}
                                subtitle={memberForLgpd?.role_label ?? 'Conta no app'}
                                photoUrl={avatarPreviewSrc}
                                badge={data.status === 'active' ? 'Ativo' : 'Inativo'}
                                onClose={closeModal}
                            />
                            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                                Ficha da pessoa e conta no app na mesma tela.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="pr-8 text-lg font-semibold text-zinc-900 dark:text-white sm:text-xl">Novo usuário</h2>
                            <p className="mb-5 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Cria a conta de login na igreja. Senha inicial com mínimo de 6 caracteres.
                            </p>
                        </>
                    )}

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
                                        {submitMessage.kind === 'success' ? 'Salvo com sucesso' : 'Não foi possível salvar'}
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

                    <form onSubmit={submit} className="space-y-5">
                        {/* Foto — primeiro */}
                        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Foto</p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Aparece no app e no painel. No celular pode usar a câmera; no computador, escolha uma imagem (máx. 4 MB).
                            </p>
                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                                {avatarPreviewSrc ? (
                                    <PhotoPreviewButton
                                        photoUrl={avatarPreviewSrc}
                                        name={data.name?.trim() || memberForLgpd?.name}
                                        className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-600"
                                        imageClassName="h-full w-full rounded-2xl object-cover"
                                        stopPropagation={false}
                                    />
                                ) : (
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800">
                                        <CameraIcon className="h-8 w-8 text-zinc-400" aria-hidden />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1 space-y-2">
                                    <input
                                        id="member_face_photo"
                                        type="file"
                                        accept="image/*"
                                        capture="user"
                                        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900"
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
                        </section>

                        {/* Identificação */}
                        <section className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Dados do usuário</p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Nome e contatos; o e-mail também serve para login no app.
                                </p>
                            </div>
                            <div>
                                <InputLabel htmlFor="name" value="Nome completo" className="mb-1" />
                                <TextInput
                                    id="name"
                                    type="text"
                                    className="block w-full"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    isFocused={!isEditing}
                                    placeholder="Nome completo"
                                />
                                <InputError message={errors.name} className="mt-2" />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="email" value="E-mail (login)" className="mb-1" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        className="block w-full"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="exemplo@email.com"
                                        required
                                    />
                                    <InputError message={errors.email} className="mt-2" />
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
                                    <InputError message={errors.phone} className="mt-2" />
                                </div>
                            </div>
                        </section>

                        {!isEditing ? (
                            <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Senha (app)</p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Obrigatória ao criar a conta. Clique no olho para ver o que está digitando.
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor="password" value="Senha inicial" className="mb-1" />
                                        <PasswordInput
                                            id="password"
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
                                        <PasswordInput
                                            id="password_confirmation"
                                            className="block w-full"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <InputError message={errors.password_confirmation} className="mt-2" />
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        {isEditing && canChangeUserPassword ? (
                            <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Nova senha de acesso</p>
                                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/90">
                                    Deixe em branco para manter a senha atual. Clique no olho para ver o que está digitando.
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor="edit_password" value="Nova senha (opcional)" className="mb-1" />
                                        <PasswordInput
                                            id="edit_password"
                                            className="block w-full"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="edit_password_confirmation" value="Confirmar nova senha" className="mb-1" />
                                        <PasswordInput
                                            id="edit_password_confirmation"
                                            className="block w-full"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <InputError message={errors.password_confirmation} className="mt-2" />
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        {/* Conta no app */}
                        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Conta no app</p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Situação da conta e perfil de acesso no painel.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="birth_date" value="Data de nascimento (opcional)" className="mb-1" />
                                    <TextInput
                                        id="birth_date"
                                        type="date"
                                        className="block w-full"
                                        value={data.birth_date}
                                        onChange={(e) => setData('birth_date', e.target.value)}
                                    />
                                    <InputError message={errors.birth_date} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="status" value="Situação da conta" className="mb-1" />
                                    <SelectInput
                                        id="status"
                                        className="block w-full"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value as 'active' | 'inactive')}
                                    >
                                        <option value="active">Ativa (pode entrar no app)</option>
                                        <option value="inactive">Inativa (bloqueia login)</option>
                                    </SelectInput>
                                    <InputError message={errors.status} className="mt-2" />
                                </div>
                            </div>
                            {assignableRoles.length > 0 ? (
                                <div>
                                    <InputLabel htmlFor="role_name" value="Perfil de acesso" className="mb-1" />
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
                                        O seu acesso permite ver usuários, mas não alterar o perfil de permissões.
                                    </p>
                                    <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-100">
                                        {profileReadOnlyText}
                                    </p>
                                </div>
                            ) : null}
                            <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Comunicações</p>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                        name="notify_via_app"
                                        checked={data.notify_via_app}
                                        onChange={(e) => setData('notify_via_app', e.target.checked)}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">Notificações na app</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                        name="notify_via_email"
                                        checked={data.notify_via_email}
                                        onChange={(e) => setData('notify_via_email', e.target.checked)}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">E-mail</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
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
                        </section>

                        {showLgpdField ? (
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                                <label className="flex cursor-pointer items-start gap-3">
                                    <Checkbox
                                        name="lgpd_accepted"
                                        checked={data.lgpd_accepted}
                                        onChange={(e) => setData('lgpd_accepted', e.target.checked)}
                                    />
                                    <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                        O usuário aceita o tratamento dos dados pessoais conforme a{' '}
                                        <strong className="font-semibold text-zinc-900 dark:text-white">LGPD</strong> nesta
                                        plataforma.
                                    </span>
                                </label>
                                <InputError message={errors.lgpd_accepted} className="mt-2" />
                            </div>
                        ) : null}

                        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/40 space-y-3">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Voluntariado e liderança</p>
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
                                <Checkbox
                                    name="is_volunteer"
                                    checked={data.is_volunteer}
                                    onChange={(e) => setData('is_volunteer', e.target.checked)}
                                />
                                <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                    <span className="font-semibold text-zinc-900 dark:text-white">Voluntário</span> — serve ou
                                    irá servir em ministérios (detalhes em{' '}
                                    <span className="font-medium">Voluntários</span>).
                                </span>
                            </label>
                            <InputError message={errors.is_volunteer} className="mt-1" />
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
                                <Checkbox
                                    name="is_ministry_leader"
                                    checked={data.is_ministry_leader}
                                    onChange={(e) => setData('is_ministry_leader', e.target.checked)}
                                />
                                <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                    <span className="font-semibold text-zinc-900 dark:text-white">Líder de ministério</span> — gere
                                    encaminhados em <span className="font-medium">Meus voluntários</span> (menu Mais).
                                </span>
                            </label>
                            <InputError message={errors.is_ministry_leader} className="mt-1" />
                        </section>

                        {ministryOptions.length > 0 ? (
                            <section
                                ref={departmentsSectionRef}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/40 space-y-3"
                            >
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Departamentos</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Ministérios em que serve e/ou que lidera.
                                </p>
                                {ministryOptions.length > 0 ? (
                                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-600 space-y-2">
                                        <SortedMultiCheckboxList
                                            options={ministryOptions.map((m) => ({ id: m.id, name: m.name }))}
                                            selectedIds={data.department_ids}
                                            onChange={(ids) => {
                                                setData((prev) => ({
                                                    ...prev,
                                                    department_ids: ids,
                                                    ...(ids.length > 0 && !prev.is_volunteer ? { is_volunteer: true } : {}),
                                                }));
                                            }}
                                            maxHeightClass="sm:max-h-48"
                                            emptyMessage="Ainda não há departamentos configurados para esta igreja."
                                        />
                                        <InputError message={errors.volunteer_ministry_ids} className="!mt-1" />
                                        <InputError message={errors.app_ministry_ids} className="!mt-1" />
                                    </div>
                                ) : (
                                    <p className="text-xs text-amber-800 dark:text-amber-200 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                                        Ainda não há departamentos (ministérios) configurados para esta igreja.
                                    </p>
                                )}
                            </section>
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

            {canManageUsers ? (
                <Modal show={inviteModalOpen} onClose={() => setInviteModalOpen(false)}>
                    <form onSubmit={submitInvite} className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Novo convite</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                            Um link será gerado para a pessoa se cadastrar. Envie o link por e-mail ou mensagem.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="invite_email" value="E-mail do convidado" />
                                <TextInput
                                    id="invite_email"
                                    type="email"
                                    value={inviteForm.data.email}
                                    onChange={(e) => inviteForm.setData('email', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="email@exemplo.com"
                                    required
                                />
                                <InputError message={inviteForm.errors.email} className="mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Papel ao se cadastrar
                                </label>
                                <select
                                    value={inviteForm.data.role}
                                    onChange={(e) => inviteForm.setData('role', e.target.value)}
                                    className="mt-1 block w-full min-h-[2.75rem] h-11 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                >
                                    <option value="">Nenhum</option>
                                    {inviteRoles.map((r) => (
                                        <option key={r.id} value={r.name}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <SecondaryButton type="button" onClick={() => setInviteModalOpen(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={inviteForm.processing}>
                                Gerar link
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            ) : null}
        </AdminLayout>
    );
}
