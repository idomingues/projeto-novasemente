import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import { PencilIcon, TrashIcon, ChatBubbleLeftRightIcon, UserPlusIcon, CameraIcon } from '@heroicons/react/24/outline';
import VolunteerInviteShareModal from '@/Components/Volunteers/VolunteerInviteShareModal';
import PublicVolunteerSignupShareModal from '@/Components/Volunteers/PublicVolunteerSignupShareModal';
import AddButton from '@/Components/AddButton';
import { getMinistryIcon } from '@/lib/ministryIcons';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { useState, useEffect, useCallback, useRef, FormEventHandler, useMemo } from 'react';
import axios from 'axios';
import VolunteerRecordDetailBody from '@/Components/Volunteers/VolunteerRecordDetailBody';
import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';
import VolunteerDeleteConfirmBlock from '@/Components/Volunteers/VolunteerDeleteConfirmBlock';
import { activeInactivePillClass } from '@/lib/statusBadges';
import { appRoleLabel } from '@/lib/appRoleLabels';

interface Ministry { id: number; name: string; }
interface AppRole { id: number; name: string; }

interface Volunteer {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    active: boolean;
    app_access_only?: boolean;
    ministries: { id: number; name: string }[];
    user?: {
        id: number;
        email: string | null;
        is_ministry_leader?: boolean;
        status?: 'active' | 'inactive' | string;
        birth_date?: string | null;
        photo_url?: string | null;
        phone?: string | null;
        notify_via_app?: boolean;
        notify_via_email?: boolean;
        notify_via_whatsapp?: boolean;
        roles?: string[];
        ministry_ids?: number[];
    } | null;
}

interface Props {
    volunteers: {
        data: Volunteer[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    ministries: Ministry[];
    appRoles: AppRole[];
    filters?: {
        search?: string;
    };
    publicVolunteerSignupUrl: string | null;
    detailUrlPattern: string;
}

function detailUrlFromPattern(pattern: string, id: number): string {
    return pattern.replace(/\/0(\/|$)/, `/${id}$1`);
}

function splitDisplayName(full: string | null | undefined): { first: string; last: string } {
    const t = (full ?? '').trim();
    if (!t) return { first: '', last: '' };
    const i = t.indexOf(' ');
    if (i === -1) return { first: t, last: '' };
    return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
}

export default function Index({
    volunteers,
    ministries,
    appRoles,
    filters,
    publicVolunteerSignupUrl,
    detailUrlPattern,
}: Props) {
    const page = usePage().props as {
        flash?: {
            invitation_link?: string | null;
            invitation_for_name?: string | null;
            public_volunteer_signup_url?: string | null;
            error?: string | null;
            success?: string | null;
        };
        currentChurch?: { name?: string } | null;
        auth?: { permissions?: string[]; isSuperAdmin?: boolean };
    };
    const isSuperAdmin = page.auth?.isSuperAdmin === true;
    const { flash } = page;
    const churchNameForPublicInvite = page.currentChurch?.name ?? 'Igreja';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [inviteShareOpen, setInviteShareOpen] = useState(false);
    const [inviteShare, setInviteShare] = useState<{ link: string; name: string } | null>(null);
    const [invitingVolunteerId, setInvitingVolunteerId] = useState<number | null>(null);
    const [publicInviteModalOpen, setPublicInviteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters?.search ?? '');
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
    const [submitToast, setSubmitToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailVolunteer, setDetailVolunteer] = useState<VolunteerDetailData | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Volunteer | null>(null);
    const [avatarPreviewSrc, setAvatarPreviewSrc] = useState<string | null>(null);
    const lastSavedPhotoRef = useRef<string | null>(null);
    const openedVoluntarioFromUrl = useRef(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } = useForm({
        name: '',
        email: '',
        phone: '',
        ministry_ids: [] as number[],
        active: true,
        app_role: '',
        app_ministry_ids: [] as number[],
        app_password: '',
        app_password_confirmation: '',
        user_status: 'active' as 'active' | 'inactive',
        birth_date: '',
        notify_via_app: true,
        notify_via_email: true,
        notify_via_whatsapp: false,
        photo: null as File | null,
    });

    const isMinistryLeader = data.app_role === 'lider_ministerio';

    // Inertia v2: transform lives on the form, not on post()/put() options.
    transform((form) => {
        const ledIds = Array.isArray(form.app_ministry_ids)
            ? form.app_ministry_ids.filter((id) => Number(id) > 0)
            : [];
        const appRole =
            ledIds.length > 0 || form.app_role === 'lider_ministerio' ? 'lider_ministerio' : form.app_role;

        return {
            ...form,
            app_role: appRole,
            app_ministry_ids: appRole === 'lider_ministerio' ? ledIds : [],
        };
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setSubmitToast(null);
        setIsModalOpen(true);
    };

    const editingVolunteer = useMemo(() => {
        if (!isEditing || editingId === null) {
            return undefined;
        }
        return volunteers.data.find((v) => v.id === editingId);
    }, [isEditing, editingId, volunteers.data]);

    const editingUserIsSuperAdmin = Boolean(editingVolunteer?.user?.roles?.includes('super_admin'));
    const editingUserIsPanelTeam = Boolean(
        editingVolunteer?.user?.roles?.some((r) =>
            ['admin', 'super_admin', 'pastor', 'secretaria'].includes(r),
        ),
    );

    const populateEditForm = (v: Volunteer, detail?: VolunteerDetailData | null) => {
        const roles = detail?.user?.roles ?? v.user?.roles ?? [];
        const isSuper = roles.includes('super_admin');
        const isLeader =
            roles.includes('lider_ministerio') ||
            Boolean(detail?.user?.is_ministry_leader ?? v.user?.is_ministry_leader);
        const savedPhoto = detail?.photo_url ?? detail?.user?.photo_url ?? v.user?.photo_url ?? null;
        lastSavedPhotoRef.current = savedPhoto?.trim() ? savedPhoto : null;
        setAvatarPreviewSrc(lastSavedPhotoRef.current);
        setData({
            name: detail?.user?.name ?? v.name ?? '',
            email: detail?.display_email ?? detail?.user?.email ?? v.user?.email ?? v.email ?? '',
            phone: detail?.display_phone ?? detail?.user?.phone ?? v.phone ?? v.user?.phone ?? '',
            ministry_ids: (detail?.ministries ?? v.ministries)?.map((m) => m.id) ?? [],
            active: detail?.active ?? v.active,
            app_role: isSuper ? '' : isLeader ? 'lider_ministerio' : roles[0] ?? '',
            app_ministry_ids: detail?.user?.led_ministries?.map((m) => m.id) ?? v.user?.ministry_ids ?? [],
            app_password: '',
            app_password_confirmation: '',
            user_status:
                (detail?.user?.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            birth_date: (detail?.birth_date ?? detail?.user?.birth_date ?? v.user?.birth_date ?? '').split('T')[0] ?? '',
            notify_via_app: detail?.user?.notify_via_app ?? v.user?.notify_via_app ?? true,
            notify_via_email: detail?.user?.notify_via_email ?? v.user?.notify_via_email ?? true,
            notify_via_whatsapp: detail?.user?.notify_via_whatsapp ?? v.user?.notify_via_whatsapp ?? false,
            photo: null,
        });
    };

    const openEditModal = (v: Volunteer, detail?: VolunteerDetailData | null) => {
        setIsEditing(true);
        setEditingId(v.id);
        populateEditForm(v, detail ?? null);
        clearErrors();
        setSubmitToast(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (avatarPreviewSrc?.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreviewSrc);
        }
        setAvatarPreviewSrc(null);
        lastSavedPhotoRef.current = null;
        setIsModalOpen(false);
        reset();
        // Não limpar submitToast aqui: queremos mostrar feedback após fechar o modal.
    };

    const openDetail = useCallback(
        async (id: number) => {
            setDetailOpen(true);
            setDetailLoading(true);
            setDetailVolunteer(null);
            try {
                const { data } = await axios.get<{ volunteer: VolunteerDetailData }>(
                    detailUrlFromPattern(detailUrlPattern, id),
                );
                setDetailVolunteer(data.volunteer);
            } finally {
                setDetailLoading(false);
            }
        },
        [detailUrlPattern],
    );

    const closeDetail = useCallback(() => {
        setDetailOpen(false);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.has('voluntario')) {
                url.searchParams.delete('voluntario');
                window.history.replaceState({}, '', url.pathname + url.search);
            }
        }
    }, []);

    useEffect(() => {
        if (openedVoluntarioFromUrl.current || typeof window === 'undefined') {
            return;
        }
        const voluntario = new URLSearchParams(window.location.search).get('voluntario');
        if (voluntario && /^\d+$/.test(voluntario)) {
            openedVoluntarioFromUrl.current = true;
            void openDetail(Number(voluntario));
        }
    }, [openDetail]);

    const openEditFromDetail = () => {
        if (!detailVolunteer) return;
        const row = volunteers.data.find((v) => v.id === detailVolunteer.id);
        const snapshot = detailVolunteer;
        closeDetail();
        if (row) {
            openEditModal(row, snapshot);
        }
    };

    const detailBadge = (v: VolunteerDetailData): string | null => {
        const parts: string[] = [];
        if (v.active === false) {
            parts.push('Escalas: inativo');
        } else if (v.active === true) {
            parts.push('Escalas: ativo');
        }
        if (v.has_app_account) {
            parts.push(v.user?.status === 'inactive' ? 'Conta: inativa' : 'Conta: ativa');
        }
        return parts.length > 0 ? parts.join(' · ') : null;
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('volunteers.update', editingId), {
                forceFormData: true,
                onSuccess: (page) => {
                    const flash = (page?.props as { flash?: { error?: string | null; success?: string | null } } | undefined)?.flash;
                    if (flash?.error) {
                        setSubmitToast({ kind: 'error', message: flash.error });
                        return;
                    }
                    setSubmitToast({ kind: 'success', message: flash?.success ?? 'Alterações salvas com sucesso.' });
                    if (!flash?.error) {
                        closeModal();
                    }
                },
                onError: () => {
                    setSubmitToast({ kind: 'error', message: 'Não foi possível salvar. Verifique os campos em destaque.' });
                },
                onFinish: () => {
                    // Mantém o feedback visível por alguns segundos.
                    window.setTimeout(() => setSubmitToast(null), 4500);
                },
            });
        } else {
            post(route('volunteers.store'), {
                forceFormData: true,
                onSuccess: (page) => {
                    const flash = (page?.props as { flash?: { error?: string | null; success?: string | null } } | undefined)?.flash;
                    if (flash?.error) {
                        setSubmitToast({ kind: 'error', message: flash.error });
                        return;
                    }
                    setSubmitToast({ kind: 'success', message: flash?.success ?? 'Voluntário cadastrado com sucesso.' });
                    if (!flash?.error) {
                        closeModal();
                    }
                },
                onError: () => {
                    setSubmitToast({ kind: 'error', message: 'Não foi possível salvar. Verifique os campos em destaque.' });
                },
                onFinish: () => {
                    // Mantém o feedback visível por alguns segundos.
                    window.setTimeout(() => setSubmitToast(null), 4500);
                },
            });
        }
    };

    useEffect(() => {
        const link = flash?.invitation_link;
        const name = flash?.invitation_for_name;
        if (typeof link === 'string' && link.length > 0) {
            setInviteShare({ link, name: typeof name === 'string' ? name : '' });
            setInviteShareOpen(true);
        }
    }, [flash?.invitation_link, flash?.invitation_for_name]);

    useEffect(() => {
        if (typeof flash?.public_volunteer_signup_url === 'string' && flash.public_volunteer_signup_url.length > 0) {
            setPublicInviteModalOpen(true);
        }
    }, [flash?.public_volunteer_signup_url]);

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
        setPhotoPreviewUrl(null);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const modal = params.get('modal');
        let changed = false;
        if (modal === 'create') {
            openCreateModal();
            params.delete('modal');
            changed = true;
        } else if (modal === 'public' && publicVolunteerSignupUrl) {
            setPublicInviteModalOpen(true);
            params.delete('modal');
            changed = true;
        }
        if (changed) {
            const q = params.toString();
            window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
        }
        // Intencionalmente só no primeiro render (deep-link desde o quadro de voluntários).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AdminLayout>
            <Head title="Voluntários" />
            <PageHeader
                title="Voluntários"
                actions={<AddButton variant="icon" onClick={openCreateModal} title="Novo voluntário">Novo Voluntário</AddButton>}
            >
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full min-w-0 sm:max-w-md">
                        <TextInput
                            type="search"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome, e-mail ou telefone"
                            className="w-full"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {publicVolunteerSignupUrl ? (
                        <div className="flex justify-end sm:justify-start">
                            <button
                                type="button"
                                onClick={() => setPublicInviteModalOpen(true)}
                                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-2 border-white/90 bg-zinc-900 px-4 text-xs font-semibold uppercase tracking-widest text-white shadow-sm ring-1 ring-inset ring-white/70 transition hover:bg-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 sm:px-6"
                            >
                                <UserPlusIcon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                                <span className="hidden sm:inline">Convidar voluntários</span>
                                <span className="sm:hidden">Convidar</span>
                            </button>
                        </div>
                    ) : null}
                </div>
            </PageHeader>

            {submitToast && (
                <div
                    className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                        submitToast.kind === 'success'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100'
                            : 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100'
                    }`}
                    role="alert"
                >
                    {submitToast.message}
                </div>
            )}

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Voluntário</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Departamento</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cargo</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider min-w-[200px]">
                                    Conta no app
                                </th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                                    Convite
                                </th>
                                <th className="px-4 md:px-8 py-3 md:py-4 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap w-[1%]">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {volunteers.data.map((v) => {
                                const displayName = v.name ?? '—';
                                const initial = displayName !== '—' ? displayName.charAt(0).toUpperCase() : '?';
                                return (
                                <tr
                                    key={v.id}
                                    className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                                    onClick={() => void openDetail(v.id)}
                                >
                                    <td className="cursor-pointer px-4 md:px-8 py-3 md:py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0 overflow-hidden">
                                                {initial}
                                            </div>
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                <span className="font-medium text-zinc-900 dark:text-white">{displayName}</span>
                                                {v.app_access_only ? (
                                                    <span
                                                        className="inline-flex shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
                                                        title="Conta na app sem registro de serviço em ministérios"
                                                    >
                                                        Usuário (app)
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="cursor-pointer px-4 md:px-8 py-3 md:py-4">
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
                                    <td className="cursor-pointer px-4 md:px-8 py-3 md:py-4 text-zinc-600 dark:text-zinc-300">{v.role || '—'}</td>
                                    <td className="cursor-pointer px-4 md:px-8 py-3 md:py-4">
                                        <span className={activeInactivePillClass(v.active)}>
                                            {v.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="cursor-pointer px-4 md:px-8 py-3 md:py-4 text-zinc-700 dark:text-zinc-300">
                                        {!v.user ? (
                                            <span className="text-sm text-zinc-500 dark:text-zinc-400">Sem conta</span>
                                        ) : !v.user.email ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                                    Convite pendente
                                                </span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    Aguarda e-mail no registro
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
                                    <td className="cursor-default px-4 md:px-8 py-3 md:py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        {!v.user?.email ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setInvitingVolunteerId(v.id);
                                                    router.post(
                                                        route('volunteers.invite', v.id),
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                            onFinish: () => setInvitingVolunteerId(null),
                                                        },
                                                    );
                                                }}
                                                disabled={invitingVolunteerId === v.id}
                                                className="inline-flex w-full min-w-[8.5rem] items-center justify-center gap-2 rounded-full border border-emerald-600/80 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/70 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50 sm:w-auto"
                                                title="Gera o link e abre a tela para copiar ou enviar pelo WhatsApp"
                                            >
                                                <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0" aria-hidden />
                                                Convidar
                                            </button>
                                        ) : (
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                                        )}
                                    </td>
                                    <td
                                        className="cursor-default px-4 md:px-8 py-3 md:py-4 text-right align-middle w-[1%] whitespace-nowrap"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="inline-flex flex-nowrap items-center justify-end gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(v)}
                                                className="shrink-0 p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(v)}
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

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg" disableBodyScroll>
                <div className="flex max-h-[min(92dvh,calc(100dvh-1rem))] min-h-0 flex-col bg-white dark:bg-zinc-900">
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-10 sm:px-6 sm:pb-6 sm:pt-11">
                        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white sm:text-xl pr-8">
                            {isEditing ? 'Editar voluntário' : 'Novo voluntário'}
                        </h2>
                        <p className="-mt-2 mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                            Ficha de voluntário e conta no app na mesma tela — um cadastro só.
                        </p>
                        {submitToast && (
                            <div
                                className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                                    submitToast.kind === 'success'
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100'
                                        : 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100'
                                }`}
                                role="alert"
                            >
                                {submitToast.message}
                            </div>
                        )}
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="name" value="Nome completo" />
                            <TextInput
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Nome e sobrenome"
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        {/* Em mobile, uma coluna evita “saltos” quando o teclado abre e o Safari recalcula a grade. */}
                        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
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
                            <div className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 dark:border-zinc-800 dark:bg-zinc-900/40 sm:dark:bg-transparent">
                                <div className="flex items-center justify-between gap-3 sm:items-end sm:pb-0.5">
                                    <div className="min-w-0 flex-1">
                                        <InputLabel value="Ativar voluntário" />
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Se desativado, não aparece para seleção em escalas.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setData('active', !data.active)}
                                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                                            data.active ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                                        }`}
                                        role="switch"
                                        aria-checked={data.active}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                                data.active ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <InputLabel htmlFor="email" value="E-mail (login)" />
                            <TextInput
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="usuario@exemplo.com"
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-4 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Perfil da conta no app</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Situação da conta, <span className="font-medium">perfil de acesso</span>, foto e preferências — como em Membros do app.
                                </p>
                            </div>
                            <div>
                                <InputLabel htmlFor="app_role" value="Perfil de acesso no app" />
                                {editingUserIsSuperAdmin ? (
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2.5">
                                        Este usuário é <strong className="font-medium">super administrador</strong>: o perfil é gerido em Usuários do sistema.
                                    </p>
                                ) : editingUserIsPanelTeam ? (
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2.5">
                                        Conta da equipe do painel — altere o perfil em <span className="font-medium">Contas do app (equipe)</span>.
                                    </p>
                                ) : (
                                    <SelectInput
                                        id="app_role"
                                        value={data.app_role}
                                        onChange={(e) => {
                                            const role = e.target.value;
                                            setData((prev) => ({
                                                ...prev,
                                                app_role: role,
                                                app_ministry_ids:
                                                    role === 'lider_ministerio' ? prev.app_ministry_ids : [],
                                            }));
                                        }}
                                        className="mt-1 block w-full"
                                    >
                                        <option value="">Sem perfil (só conta até definir permissões)</option>
                                        {appRoles.map((r) => (
                                            <option key={r.id} value={r.name}>
                                                {appRoleLabel(r.name)}
                                            </option>
                                        ))}
                                    </SelectInput>
                                )}
                                <InputError message={errors.app_role} className="mt-1" />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="birth_date" value="Data de nascimento (opcional)" />
                                    <TextInput
                                        id="birth_date"
                                        type="date"
                                        value={data.birth_date}
                                        onChange={(e) => setData('birth_date', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.birth_date} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="user_status" value="Situação da conta no app" />
                                    <SelectInput
                                        id="user_status"
                                        value={data.user_status}
                                        onChange={(e) =>
                                            setData('user_status', e.target.value as 'active' | 'inactive')
                                        }
                                        className="mt-1 block w-full"
                                    >
                                        <option value="active">Ativa (pode entrar no app)</option>
                                        <option value="inactive">Inativa (bloqueia login)</option>
                                    </SelectInput>
                                    <InputError message={errors.user_status} className="mt-1" />
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700">
                                    <CameraIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <InputLabel htmlFor="volunteer_face_photo" value="Foto do usuário (opcional)" />
                                    <input
                                        id="volunteer_face_photo"
                                        type="file"
                                        accept="image/*"
                                        capture="user"
                                        className="block w-full max-w-md text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            if (avatarPreviewSrc?.startsWith('blob:')) {
                                                URL.revokeObjectURL(avatarPreviewSrc);
                                            }
                                            setData('photo', file);
                                            if (file) {
                                                setAvatarPreviewSrc(URL.createObjectURL(file));
                                            } else {
                                                setAvatarPreviewSrc(lastSavedPhotoRef.current);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                    <InputError message={errors.photo} className="mt-1" />
                                </div>
                            </div>
                            {avatarPreviewSrc ? (
                                <img
                                    src={avatarPreviewSrc}
                                    alt=""
                                    className="h-16 w-16 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-600"
                                />
                            ) : null}
                            <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Comunicações</p>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                        checked={data.notify_via_app}
                                        onChange={(e) => setData('notify_via_app', e.target.checked)}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">Notificações na app</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                        checked={data.notify_via_email}
                                        onChange={(e) => setData('notify_via_email', e.target.checked)}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">E-mail</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                        checked={data.notify_via_whatsapp}
                                        onChange={(e) => setData('notify_via_whatsapp', e.target.checked)}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">WhatsApp</span>
                                </label>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-4">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Senha (app)</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Defina a senha de acesso ao aplicativo.
                            </p>
                            <div className="mt-3 flex flex-col gap-4 sm:grid sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="app_password" value="Senha" />
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
                            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                                Se já existir usuário com o mesmo e-mail, a conta é reutilizada; só precisa de senha ao criar usuário novo.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 p-4 space-y-3">
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Acesso e permissões</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Uma conta pode existir <strong className="font-medium text-zinc-700 dark:text-zinc-300">sem perfil</strong> no
                                    painel até o administrador definir permissões. Quem for <strong className="font-medium text-zinc-700 dark:text-zinc-300">líder de ministério</strong> recebe automaticamente o perfil <strong className="font-medium text-zinc-700 dark:text-zinc-300">Líder de ministério</strong> e deve ter ao menos um departamento a gerir.
                                </p>
                                {isSuperAdmin ? (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                        Para criar perfis novos ou alterar o que cada perfil pode fazer:{' '}
                                        <Link
                                            href={route('roles.index')}
                                            className="font-medium text-primary-600 underline dark:text-primary-400"
                                        >
                                            Perfis de acesso
                                        </Link>
                                        .
                                    </p>
                                ) : null}
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                                <input
                                    type="checkbox"
                                    checked={isMinistryLeader}
                                    disabled={editingUserIsSuperAdmin || editingUserIsPanelTeam}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        if (checked) {
                                            setData('app_role', 'lider_ministerio');
                                        } else {
                                            setData((prev) => ({
                                                ...prev,
                                                app_role: prev.app_role === 'lider_ministerio' ? '' : prev.app_role,
                                                app_ministry_ids: [],
                                            }));
                                        }
                                    }}
                                    className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500 disabled:opacity-50"
                                />
                                <span className="font-medium">É líder de ministério</span>
                            </label>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Atalho: marca o perfil <span className="font-medium">Líder de ministério</span> no campo acima. Também pode escolher outro perfil diretamente na lista.
                            </p>

                            {isMinistryLeader && (
                                <div>
                                    <InputLabel value="Departamentos que este líder gerirá" />
                                    <div className="mt-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 max-h-48 overflow-y-auto space-y-2">
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

                        </div>

                        <div>
                            <InputLabel value="Departamentos (opcional)" />
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
                            </div>
                            <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex flex-col-reverse gap-3 border-t border-zinc-100 bg-white/95 px-4 pb-2 pt-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 sm:pb-0 sm:pt-5">
                                <SecondaryButton type="button" onClick={closeModal} className="justify-center sm:w-auto">
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
                                    disabled={
                                        processing ||
                                        (isMinistryLeader && (data.app_ministry_ids?.length ?? 0) < 1)
                                    }
                                    className="justify-center sm:w-auto"
                                >
                                    {isEditing ? 'Salvar' : 'Cadastrar'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>

            <Modal show={detailOpen} onClose={closeDetail} maxWidth="2xl">
                <div className="max-h-[min(90vh,80vh)] overflow-y-auto p-6">
                    {detailLoading && <p className="text-sm text-zinc-500">Carregando ficha…</p>}
                    {!detailLoading && detailVolunteer && (
                        <VolunteerRecordDetailBody
                            volunteer={detailVolunteer}
                            badge={detailBadge(detailVolunteer)}
                            onClose={closeDetail}
                            footer={
                                <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                                    <PrimaryButton type="button" onClick={openEditFromDetail}>
                                        Editar cadastro e perfil
                                    </PrimaryButton>
                                </div>
                            }
                        />
                    )}
                </div>
            </Modal>

            <VolunteerInviteShareModal
                show={inviteShareOpen && !!inviteShare}
                link={inviteShare?.link ?? ''}
                inviteeName={inviteShare?.name}
                onClose={() => {
                    setInviteShareOpen(false);
                    setInviteShare(null);
                }}
            />

            {publicVolunteerSignupUrl ? (
                <PublicVolunteerSignupShareModal
                    show={publicInviteModalOpen}
                    link={publicVolunteerSignupUrl}
                    churchName={churchNameForPublicInvite}
                    onClose={() => setPublicInviteModalOpen(false)}
                />
            ) : null}

            <Modal show={deleteTarget != null} onClose={() => setDeleteTarget(null)} maxWidth="md">
                <div className="p-6">
                    {deleteTarget ? (
                        <VolunteerDeleteConfirmBlock
                            destroyUrl={route('volunteers.destroy', deleteTarget.id)}
                            volunteerName={deleteTarget.name ?? 'Voluntário'}
                            volunteerEmail={deleteTarget.email}
                            linkedUser={deleteTarget.user}
                            onSuccess={() => {
                                setDeleteTarget(null);
                                setDetailOpen(false);
                                setDetailVolunteer(null);
                                router.visit(route('volunteers.index'), { preserveScroll: true });
                            }}
                        />
                    ) : null}
                </div>
            </Modal>
        </AdminLayout>
    );
}
