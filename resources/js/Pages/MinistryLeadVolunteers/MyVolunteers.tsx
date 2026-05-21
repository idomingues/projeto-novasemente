import AdminLayout from '@/Layouts/AdminLayout';
import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import Textarea from '@/Components/Textarea';
import TextInput from '@/Components/TextInput';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
    ChatBubbleLeftEllipsisIcon,
    ClipboardDocumentIcon,
    EllipsisVerticalIcon,
    LinkIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

type VolunteerRow = {
    id: number | string;
    ministryId?: number;
    createdAt: string | null;
    ministryName: string | null;
    /** Convite de ministério (só linhas vindas de `VolunteerMinistryInvitation`). */
    invitePublicUrl?: string | null;
    inviteRegisterUrl?: string | null;
    inviteResendEmailUrl?: string | null;
    canResendInvite?: boolean;
    inviteIntroMessage?: string | null;
    inviteIntroSaveUrl?: string | null;
    /** Remove o voluntário deste departamento (desvincula do ministério do líder). */
    removeFromMinistryUrl?: string | null;
    volunteer: {
        id: number;
        name: string | null;
        email: string | null;
        phone: string | null;
        birthDate: string | null;
        hasWhatsapp: boolean | null;
        hasSocialNetworks: boolean | null;
        attendanceDuration: string | null;
        isOfficialMember: boolean | null;
        memberRecordAtNovaSemente: boolean | null;
        memberRecordChurch: string | null;
        hasPreviousMinistryVolunteerExperience: boolean | null;
        previousMinistryDetails: string | null;
        professionalArea: string | null;
        ministryInvolvement: string | null;
        otherMinistryInterest: string | null;
        giftsToDevelop: string | null;
        needsPastoralGuidance: boolean | null;
        lgpdDataConsent: boolean | null;
        role: string | null;
        appAccessOnly: boolean | null;
        linkedUser?: { id: number; email: string | null } | null;
    };
    inviteStatus: string;
    leaderStatus: string | null;
    leaderNote: string | null;
    updateUrl: string | null;
    historyUrl?: string | null;
};

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

type RequestRow = {
    id: number;
    subject: string;
    status: string;
    status_label: string;
    message_preview: string;
    created_at: string | null;
    completed_at: string | null;
    attached_volunteer_name: string | null;
    attached_volunteer_email: string | null;
    attached_volunteer_profile: VolunteerRow['volunteer'] | null;
};

type RequestMinistry = {
    id: number;
    name: string;
    schedule_roles: Array<{ id: number; name: string }>;
};

type HistoryRow = {
    id: number;
    fromStatus: string | null;
    toStatus: string | null;
    note: string | null;
    changedAt: string | null;
    changedBy: string | null;
};

export default function MyVolunteers() {
    const { invitations, activeVolunteers, requestRows, requestMinistries, requestStoreUrl, churchMinistryInvitationIntro } = usePage()
        .props as unknown as {
        invitations: Paginated<VolunteerRow>;
        activeVolunteers: VolunteerRow[];
        requestRows: RequestRow[];
        requestMinistries: RequestMinistry[];
        requestStoreUrl: string;
        churchMinistryInvitationIntro?: string | null;
    };

    const [editingRow, setEditingRow] = useState<VolunteerRow | null>(null);
    const row = editingRow;
    const [profileRow, setProfileRow] = useState<VolunteerRow | null>(null);
    const [tab, setTab] = useState<'status' | 'history'>('status');
    const [screenTab, setScreenTab] = useState<'active' | 'training' | 'new' | 'requests'>('new');
    const [history, setHistory] = useState<HistoryRow[] | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [inviteHelpRow, setInviteHelpRow] = useState<VolunteerRow | null>(null);
    const [inviteModalCopyFeedback, setInviteModalCopyFeedback] = useState<string | null>(null);

    const form = useForm({
        leader_status: '' as '' | 'denied' | 'training' | 'active',
        leader_note: '',
    });
    const requestForm = useForm({
        ministry_id: '' as '' | number,
        schedule_role_id: '' as '' | number,
        message: '',
        quantity: 1,
    });
    const resendInviteForm = useForm({});

    const newRows = useMemo(
        () => invitations.data.filter((item) => item.leaderStatus === null || item.leaderStatus === ''),
        [invitations.data],
    );
    const trainingRows = useMemo(
        () => invitations.data.filter((item) => item.leaderStatus === 'training'),
        [invitations.data],
    );
    const activeRows = useMemo(() => {
        const source = [
            ...invitations.data.filter((item) => item.leaderStatus === 'active'),
            ...activeVolunteers,
        ];
        const byVolunteerMinistry = new Map<string, VolunteerRow>();

        source.forEach((item) => {
            const ministryId = item.ministryId ?? 0;
            const key = `${item.volunteer.id}-${ministryId}`;
            const current = byVolunteerMinistry.get(key);
            if (!current) {
                byVolunteerMinistry.set(key, {
                    ...item,
                    id: ministryId > 0 ? `active-${item.volunteer.id}-${ministryId}` : `active-${item.volunteer.id}`,
                });
                return;
            }
            if (!current.updateUrl && item.updateUrl) {
                current.updateUrl = item.updateUrl;
            }
            if (!current.historyUrl && item.historyUrl) {
                current.historyUrl = item.historyUrl;
            }
            if (!current.inviteIntroSaveUrl && item.inviteIntroSaveUrl) {
                current.inviteIntroSaveUrl = item.inviteIntroSaveUrl;
                current.inviteIntroMessage = item.inviteIntroMessage;
                current.invitePublicUrl = item.invitePublicUrl ?? current.invitePublicUrl;
                current.inviteRegisterUrl = item.inviteRegisterUrl ?? current.inviteRegisterUrl;
                current.inviteResendEmailUrl = item.inviteResendEmailUrl ?? current.inviteResendEmailUrl;
                current.canResendInvite = item.canResendInvite ?? current.canResendInvite;
            }
            if (!current.removeFromMinistryUrl && item.removeFromMinistryUrl) {
                current.removeFromMinistryUrl = item.removeFromMinistryUrl;
            }
            if (!current.volunteer.linkedUser && item.volunteer.linkedUser) {
                current.volunteer.linkedUser = item.volunteer.linkedUser;
            }
            if (current.leaderStatus !== 'active' && item.leaderStatus === 'active') {
                current.leaderStatus = 'active';
            }
        });

        return Array.from(byVolunteerMinistry.values());
    }, [invitations.data, activeVolunteers]);

    useEffect(() => {
        if (newRows.length > 0) {
            setScreenTab('new');
            return;
        }
        if (trainingRows.length > 0) {
            setScreenTab('training');
            return;
        }
        if (activeRows.length > 0) {
            setScreenTab('active');
            return;
        }
        setScreenTab('requests');
    }, [newRows.length, trainingRows.length, activeRows.length]);

    const builtinMinistryInviteIntro = (ministryName: string) =>
        `Você foi convidado(a) para servir no departamento ${ministryName}. Para participar, crie sua conta no aplicativo pelo link abaixo.`;

    /** Parágrafo central igual ao servidor: convite.intro_message ou texto da igreja ou texto padrão. */
    const inviteIntroResolvedPreview = useMemo(() => {
        const ministry = (inviteHelpRow?.ministryName ?? 'Departamento').trim() || 'Departamento';
        const saved = (inviteHelpRow?.inviteIntroMessage ?? '').trim();
        if (saved !== '') return saved;
        const church = (churchMinistryInvitationIntro ?? '').trim();
        if (church !== '') return church;
        return builtinMinistryInviteIntro(ministry);
    }, [inviteHelpRow?.ministryName, inviteHelpRow?.inviteIntroMessage, churchMinistryInvitationIntro]);

    /** Texto plano igual ao enviado no e-mail (BuildVolunteerMinistryInvitePlainCopy) e ao WhatsApp. */
    const invitePlainFullMessage = useMemo(() => {
        const row = inviteHelpRow;
        if (!row) return '';
        const name = (row.volunteer.name ?? '').trim();
        const greeting = name ? `Olá, ${name}!` : 'Olá!';
        const ministry = (row.ministryName ?? 'Departamento').trim() || 'Departamento';
        const email = (row.volunteer.email ?? '').trim();
        const registerUrl = row.inviteRegisterUrl?.trim() ?? '';
        let msg = `${greeting}\n\n${inviteIntroResolvedPreview}`;
        if (registerUrl !== '') {
            msg += `\n\nPara confirmar o convite para «${ministry}», crie sua conta no aplicativo (o e-mail já vem preenchido):\n${registerUrl}`;
            if (email !== '') {
                msg += `\n\nSe criar a conta por outro caminho, use exatamente este e-mail: ${email}.`;
            }
        }
        return msg;
    }, [inviteHelpRow, inviteIntroResolvedPreview]);

    const selectedMinistry = useMemo(
        () => requestMinistries.find((m) => m.id === Number(requestForm.data.ministry_id)),
        [requestMinistries, requestForm.data.ministry_id],
    );
    const requestRoleOptions = useMemo(
        () => (selectedMinistry?.schedule_roles ?? []).map((r) => ({ value: r.id, label: r.name })),
        [selectedMinistry],
    );

    const closeInviteHelp = () => {
        setInviteHelpRow(null);
        setInviteModalCopyFeedback(null);
    };

    const flashInviteModalCopyNotice = (message: string) => {
        setInviteModalCopyFeedback(message);
        window.setTimeout(() => setInviteModalCopyFeedback(null), 2800);
    };

    const copyInviteRegisterLink = async () => {
        const url = inviteHelpRow?.inviteRegisterUrl?.trim();
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            flashInviteModalCopyNotice('Link de cadastro copiado.');
        } catch {
            window.prompt('Copie o link de cadastro:', url);
        }
    };

    const copyInvitePlainFullMessage = async () => {
        if (!invitePlainFullMessage) return;
        try {
            await navigator.clipboard.writeText(invitePlainFullMessage);
            flashInviteModalCopyNotice('Texto completo copiado (igual ao e-mail e ao WhatsApp).');
        } catch {
            window.prompt('Copie a mensagem (e-mail / WhatsApp):', invitePlainFullMessage);
        }
    };

    const whatsAppSendPhoneDigits = (raw: string | null | undefined): string | null => {
        const d = (raw ?? '').replace(/\D/g, '');
        if (d.length < 10) return null;
        if (!d.startsWith('55') && d.length <= 11) {
            return `55${d}`;
        }
        return d;
    };

    const openWhatsAppWithInvite = () => {
        const phone = whatsAppSendPhoneDigits(inviteHelpRow?.volunteer.phone);
        if (!phone || !invitePlainFullMessage) return;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(invitePlainFullMessage)}`, '_blank', 'noopener,noreferrer');
    };

    const submitResendInviteEmail = () => {
        const url = inviteHelpRow?.inviteResendEmailUrl;
        if (!url) return;
        resendInviteForm.post(url, {
            preserveScroll: true,
            onSuccess: () => closeInviteHelp(),
        });
    };

    const openEdit = (r: VolunteerRow) => {
        if (!r.updateUrl) return;
        setEditingRow(r);
        setTab('status');
        setHistory(null);
        setHistoryLoading(false);
        form.setData({
            leader_status: (r.leaderStatus as 'denied' | 'training' | 'active' | null) ?? '',
            leader_note: r.leaderNote ?? '',
        });
        form.clearErrors();
    };

    const closeEdit = () => {
        setEditingRow(null);
        setTab('status');
        setHistory(null);
        setHistoryLoading(false);
        form.reset();
        form.clearErrors();
    };

    const openProfile = (r: VolunteerRow) => {
        setProfileRow(r);
    };

    const closeProfile = () => {
        setProfileRow(null);
    };

    const handleRemoveFromMinistry = async (sourceRow: VolunteerRow) => {
        const url = sourceRow.removeFromMinistryUrl ?? '';
        if (!url) return;
        const dept = (sourceRow.ministryName ?? '').trim() || 'este departamento';
        const name = (sourceRow.volunteer.name ?? '').trim() || 'este voluntário';
        const ok = await confirmAction({
            title: `Confirmar remoção do departamento «${dept}»?`,
            text: `Deseja remover ${name} do departamento «${dept}»? Depois de confirmar, deixa de aparecer na sua lista de Meus voluntários. O cadastro geral na igreja não é apagado.`,
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar',
            danger: true,
            icon: 'warning',
        });
        if (!ok) return;

        router.delete(url, {
            preserveScroll: true,
            onSuccess: () => {
                closeEdit();
                closeProfile();
                setInviteHelpRow(null);
            },
        });
    };

    const openAttachedVolunteerProfile = (req: RequestRow) => {
        if (!req.attached_volunteer_profile) return;
        setProfileRow({
            id: `request-${req.id}-attached`,
            ministryName: 'Pedido concluído',
            createdAt: req.completed_at,
            volunteer: req.attached_volunteer_profile,
            inviteStatus: 'active_roster',
            leaderStatus: 'active',
            leaderNote: null,
            updateUrl: null,
        });
    };

    const submit = () => {
        if (!row || !row.updateUrl) return;
        form.patch(row.updateUrl, { preserveScroll: true, onSuccess: () => closeEdit() });
    };

    const openRequestModal = () => {
        requestForm.reset();
        requestForm.clearErrors();
        requestForm.setData({
            ministry_id: '',
            schedule_role_id: '',
            message: '',
            quantity: 1,
        });
        setRequestModalOpen(true);
    };

    const closeRequestModal = () => {
        setRequestModalOpen(false);
        requestForm.reset();
        requestForm.clearErrors();
    };

    const submitRequest: FormEventHandler = (e) => {
        e.preventDefault();
        requestForm.post(requestStoreUrl, {
            preserveScroll: true,
            onSuccess: () => closeRequestModal(),
        });
    };

    const loadHistory = async () => {
        if (!row?.historyUrl || historyLoading) return;
        setHistoryLoading(true);
        try {
            const r = await fetch(row.historyUrl, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (!r.ok) {
                setHistory([]);
                return;
            }
            const j = (await r.json()) as { history?: HistoryRow[] };
            setHistory(Array.isArray(j.history) ? j.history : []);
        } catch {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const statusLabel = (s: string | null) => {
        if (s === 'denied') return 'Recusado';
        if (s === 'training') return 'Treinamento';
        if (s === 'active') return 'Atuante';
        return '—';
    };

    const inviteLabel = (s: string) => {
        if (s === 'active_roster') return 'Ativo na escala';
        if (s === 'accepted') return 'Aceito no link';
        if (s === 'declined') return 'Recusado no link';
        if (s === 'pending') return 'Aguardando resposta';
        return s || '—';
    };

    const requestDateLabel = (iso: string | null) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('pt-BR');
        } catch {
            return iso;
        }
    };

    const requestStatusClass = (status: string) => {
        if (status === 'completed') {
            return 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
        }
        if (status === 'in_progress') {
            return 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
        }
        return 'rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';
    };

    const boolLabel = (v: boolean | null | undefined) => {
        if (v === null || v === undefined) return 'Não informado';
        return v ? 'Sim' : 'Não';
    };

    const textLabel = (v: string | null | undefined) => {
        if (!v || v.trim() === '') return '—';
        return v;
    };

    const dateLabel = (v: string | null | undefined) => {
        if (!v || v.trim() === '') return '—';
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return v;
        return d.toLocaleDateString('pt-BR');
    };

    const attendanceLabel = (raw: string | null | undefined) => {
        if (!raw) return '—';
        const map: Record<string, string> = {
            less_than_3_months: 'Menos de 3 meses',
            months_3_6: '3 a 6 meses',
            months_6_12: '6 meses a 1 ano',
            years_1_3: '1 a 3 anos',
            more_than_3_years: 'Mais de 3 anos',
        };
        return map[raw] ?? raw;
    };

    const rowActionsMenuItemClass =
        'flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800';

    const rowActionsMenuItemDangerClass =
        'flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40';

    const renderVolunteerTable = (rows: VolunteerRow[], emptyText: string) => (
        <>
            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                            <th className="pb-2 pr-3 font-semibold">Voluntário</th>
                            <th className="pb-2 pr-3 font-semibold">Departamento</th>
                            <th className="pb-2 pr-3 font-semibold">Status do convite</th>
                            <th className="pb-2 pr-3 font-semibold">Status (líder)</th>
                            <th className="pb-2 font-semibold" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item) => (
                            <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800">
                                <td className="py-2 pr-3">
                                    <div className="font-medium text-zinc-900 dark:text-white">{item.volunteer.name ?? '—'}</div>
                                    <div className="text-xs text-zinc-500">{item.volunteer.email ?? ''}</div>
                                </td>
                                <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{item.ministryName ?? '—'}</td>
                                <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">{inviteLabel(item.inviteStatus)}</td>
                                <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{statusLabel(item.leaderStatus)}</td>
                                <td className="py-2 text-right">
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <SecondaryButton type="button" onClick={() => openProfile(item)}>
                                            Ver dados
                                        </SecondaryButton>
                                        {item.updateUrl ? (
                                            <SecondaryButton type="button" onClick={() => openEdit(item)}>
                                                Alterar status
                                            </SecondaryButton>
                                        ) : null}
                                        {item.canResendInvite && item.inviteResendEmailUrl ? (
                                            <SecondaryButton type="button" onClick={() => setInviteHelpRow(item)}>
                                                Enviar convite
                                            </SecondaryButton>
                                        ) : null}
                                        {item.removeFromMinistryUrl ? (
                                            <button
                                                type="button"
                                                title="Remover deste departamento"
                                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                                                onClick={() => void handleRemoveFromMinistry(item)}
                                            >
                                                <TrashIcon className="h-4 w-4 shrink-0" aria-hidden />
                                                Remover
                                            </button>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-6 text-center text-sm text-zinc-500">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden">
                {rows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
                ) : (
                    <ul className="space-y-3">
                        {rows.map((item) => (
                            <li
                                key={item.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div>
                                            <div className="truncate font-semibold text-zinc-900 dark:text-white">
                                                {item.volunteer.name ?? '—'}
                                            </div>
                                            {item.volunteer.email ? (
                                                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                    {item.volunteer.email}
                                                </div>
                                            ) : null}
                                        </div>
                                        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                            <div>
                                                <dt className="font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                    Departamento
                                                </dt>
                                                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-100">{item.ministryName ?? '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                    Status do convite
                                                </dt>
                                                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-100">
                                                    {inviteLabel(item.inviteStatus)}
                                                </dd>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <dt className="font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                    Status (líder)
                                                </dt>
                                                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-100">{statusLabel(item.leaderStatus)}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <Popover className="relative shrink-0">
                                        <PopoverButton
                                            type="button"
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-500"
                                            aria-label="Ações"
                                        >
                                            <EllipsisVerticalIcon className="h-6 w-6" aria-hidden />
                                        </PopoverButton>
                                        <PopoverPanel
                                            anchor="bottom end"
                                            className="z-[80] w-52 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl [--anchor-gap:6px] dark:border-zinc-700 dark:bg-zinc-900"
                                        >
                                            {({ close }) => (
                                                <>
                                                    <button
                                                        type="button"
                                                        className={rowActionsMenuItemClass}
                                                        onClick={() => {
                                                            close();
                                                            openProfile(item);
                                                        }}
                                                    >
                                                        Ver dados
                                                    </button>
                                                    {item.updateUrl ? (
                                                        <button
                                                            type="button"
                                                            className={rowActionsMenuItemClass}
                                                            onClick={() => {
                                                                close();
                                                                openEdit(item);
                                                            }}
                                                        >
                                                            Alterar status
                                                        </button>
                                                    ) : null}
                                                    {item.canResendInvite && item.inviteResendEmailUrl ? (
                                                        <button
                                                            type="button"
                                                            className={rowActionsMenuItemClass}
                                                            onClick={() => {
                                                                close();
                                                                setInviteHelpRow(item);
                                                            }}
                                                        >
                                                            Enviar convite
                                                        </button>
                                                    ) : null}
                                                    {item.removeFromMinistryUrl ? (
                                                        <button
                                                            type="button"
                                                            className={rowActionsMenuItemDangerClass}
                                                            onClick={() => {
                                                                close();
                                                                void handleRemoveFromMinistry(item);
                                                            }}
                                                        >
                                                            Remover do departamento…
                                                        </button>
                                                    ) : null}
                                                </>
                                            )}
                                        </PopoverPanel>
                                    </Popover>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );

    return (
        <AdminLayout>
            <Head title="Meus voluntários" />
            <FlashMessages />
            <PageHeader
                title="Meus voluntários"
                subtitle="Fluxo único do líder: acompanhe novos voluntários, voluntários em atividade e solicitações à secretaria."
                actions={
                    <AddButton variant="icon" onClick={openRequestModal} disabled={requestMinistries.length === 0}>
                        Solicitar voluntário
                    </AddButton>
                }
            />

            <Card className="p-4">
                <div className="mb-4 flex gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                    <button
                        type="button"
                        onClick={() => setScreenTab('active')}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            screenTab === 'active'
                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        Em atividade ({activeRows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setScreenTab('training')}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            screenTab === 'training'
                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        Em treinamento ({trainingRows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setScreenTab('requests')}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            screenTab === 'requests'
                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        Solicitações ({requestRows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setScreenTab('new')}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            screenTab === 'new'
                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        Novos ({newRows.length})
                    </button>
                </div>

                {screenTab === 'new'
                    ? renderVolunteerTable(newRows, 'Sem novos voluntários pendentes de análise.')
                    : null}
                {screenTab === 'active'
                    ? renderVolunteerTable(activeRows, 'Sem voluntários em atividade.')
                    : null}
                {screenTab === 'training'
                    ? renderVolunteerTable(trainingRows, 'Sem voluntários em treinamento.')
                    : null}
                {screenTab === 'requests' ? (
                    <div className="space-y-3">
                        {requestRows.length === 0 ? (
                            <p className="py-6 text-center text-sm text-zinc-500">Ainda não há solicitações enviadas.</p>
                        ) : (
                            requestRows.map((req) => (
                                <div
                                    key={req.id}
                                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/30"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium text-zinc-900 dark:text-white">{req.subject}</div>
                                            <div className="mt-1 text-xs text-zinc-500">{requestDateLabel(req.created_at)}</div>
                                        </div>
                                        <span className={requestStatusClass(req.status)}>
                                            {req.status_label}
                                        </span>
                                    </div>
                                    {req.message_preview ? (
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Observação:</span>{' '}
                                            {req.message_preview}
                                        </p>
                                    ) : null}
                                    {req.attached_volunteer_name ? (
                                        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-emerald-800 dark:text-emerald-200">Voluntário anexado:</span>
                                                <span className="text-emerald-900 dark:text-emerald-100">{req.attached_volunteer_name}</span>
                                                {req.attached_volunteer_email ? (
                                                    <span className="text-emerald-700 dark:text-emerald-300">{` — ${req.attached_volunteer_email}`}</span>
                                                ) : null}
                                                {req.attached_volunteer_profile ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openAttachedVolunteerProfile(req)}
                                                        className="ml-1 inline-flex items-center rounded-md border border-emerald-300 bg-white/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800 transition hover:bg-white dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
                                                    >
                                                        Ver dados
                                                    </button>
                                                ) : null}
                                            </div>
                                            {req.completed_at ? (
                                                <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                                                    Concluído em: {requestDateLabel(req.completed_at)}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            ))
                        )}
                    </div>
                ) : null}
            </Card>

            <Modal show={!!row} onClose={closeEdit} maxWidth="lg">
                {row ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Alterar status</h2>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                    {row.volunteer.name ?? 'Voluntário'} — {row.ministryName ?? 'Departamento'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="flex gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                            <button
                                type="button"
                                onClick={() => setTab('status')}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    tab === 'status'
                                        ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                            >
                                Status
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTab('history');
                                    void loadHistory();
                                }}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    tab === 'history'
                                        ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                            >
                                Histórico
                            </button>
                        </div>

                        {tab === 'status' ? (
                            <>
                                <div>
                                    <InputLabel value="Status (líder)" />
                                    <select
                                        value={form.data.leader_status}
                                        onChange={(e) =>
                                            form.setData('leader_status', e.target.value as '' | 'denied' | 'training' | 'active')
                                        }
                                        className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                    >
                                        <option value="">—</option>
                                        <option value="denied">Recusar</option>
                                        <option value="training">Treinamento</option>
                                        <option value="active">Atuante</option>
                                    </select>
                                    <InputError message={form.errors.leader_status} className="mt-1" />
                                </div>

                                {form.data.leader_status === 'denied' ? (
                                    <div>
                                        <InputLabel value="Mensagem (obrigatória para Recusar)" />
                                        <Textarea
                                            value={form.data.leader_note}
                                            onChange={(e) => form.setData('leader_note', e.target.value)}
                                            rows={4}
                                            className="mt-2 w-full"
                                            placeholder="Escreva uma mensagem que a equipe de voluntariado possa ler…"
                                        />
                                        <InputError message={form.errors.leader_note} className="mt-1" />
                                    </div>
                                ) : null}

                                <div className="flex justify-end gap-2">
                                    <SecondaryButton type="button" onClick={closeEdit} disabled={form.processing}>
                                        Cancelar
                                    </SecondaryButton>
                                    <PrimaryButton
                                        type="button"
                                        onClick={submit}
                                        disabled={
                                            form.processing ||
                                            (form.data.leader_status === 'denied' && form.data.leader_note.trim().length < 5)
                                        }
                                    >
                                        Salvar
                                    </PrimaryButton>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                {historyLoading ? (
                                    <div className="text-sm text-zinc-500">Carregando histórico…</div>
                                ) : (history ?? []).length === 0 ? (
                                    <div className="text-sm text-zinc-500">Sem alterações registradas.</div>
                                ) : (
                                    <ul className="space-y-2 text-sm">
                                        {(history ?? []).map((h) => (
                                            <li
                                                key={h.id}
                                                className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/40"
                                            >
                                                <div className="text-xs text-zinc-500">
                                                    {(h.changedBy ?? 'Sistema') + ' · ' + (h.changedAt ? new Date(h.changedAt).toLocaleString('pt-BR') : '—')}
                                                </div>
                                                <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                                                    {statusLabel(h.fromStatus)} → {statusLabel(h.toStatus)}
                                                </div>
                                                {h.note ? (
                                                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                                                        {h.note}
                                                    </div>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </Modal>

            <Modal
                show={!!inviteHelpRow}
                onClose={closeInviteHelp}
                maxWidth="lg"
                footer={
                    inviteHelpRow ? (
                        <div className="flex w-full flex-col gap-3">
                            {invitePlainFullMessage ? (
                                <>
                                    <PrimaryButton
                                        type="button"
                                        onClick={() => void copyInvitePlainFullMessage()}
                                        className="!h-11 w-full !rounded-xl !normal-case !tracking-normal"
                                    >
                                        <ClipboardDocumentIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                                        Copiar mensagem
                                    </PrimaryButton>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {inviteHelpRow.inviteRegisterUrl ? (
                                            <SecondaryButton
                                                type="button"
                                                onClick={() => void copyInviteRegisterLink()}
                                                className="!h-11 w-full !rounded-xl !normal-case !tracking-normal"
                                            >
                                                <LinkIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                                                Copiar link de cadastro
                                            </SecondaryButton>
                                        ) : null}
                                        {whatsAppSendPhoneDigits(inviteHelpRow.volunteer.phone) ? (
                                            <SecondaryButton
                                                type="button"
                                                onClick={openWhatsAppWithInvite}
                                                className="!h-11 w-full !rounded-xl !normal-case !tracking-normal"
                                            >
                                                <ChatBubbleLeftEllipsisIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                                                WhatsApp
                                            </SecondaryButton>
                                        ) : null}
                                    </div>
                                    {inviteModalCopyFeedback ? (
                                        <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                            {inviteModalCopyFeedback}
                                        </p>
                                    ) : null}
                                </>
                            ) : null}
                            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700 sm:flex-row sm:justify-end">
                                <SecondaryButton
                                    type="button"
                                    onClick={closeInviteHelp}
                                    disabled={resendInviteForm.processing}
                                    className="!h-11 w-full !rounded-xl !normal-case !tracking-normal sm:w-auto"
                                >
                                    Cancelar
                                </SecondaryButton>
                                {inviteHelpRow.inviteResendEmailUrl ? (
                                    <PrimaryButton
                                        type="button"
                                        onClick={submitResendInviteEmail}
                                        disabled={resendInviteForm.processing}
                                        className="!h-11 w-full !rounded-xl !normal-case !tracking-normal sm:w-auto"
                                    >
                                        {resendInviteForm.processing ? 'Enviando…' : 'Reenviar e-mail'}
                                    </PrimaryButton>
                                ) : null}
                            </div>
                        </div>
                    ) : undefined
                }
            >
                {inviteHelpRow ? (
                    <div className="space-y-4 px-4 pb-2 pt-2 sm:px-6 sm:pb-4 sm:pt-4">
                        <div className="pr-8">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Convite ao voluntário
                            </p>
                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                {inviteHelpRow.volunteer.name?.trim() || 'Voluntário'}
                            </h2>
                            {inviteHelpRow.ministryName ? (
                                <p className="mt-1.5 inline-flex max-w-full rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    {inviteHelpRow.ministryName}
                                </p>
                            ) : null}
                        </div>
                        {invitePlainFullMessage ? (
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                                <p className="border-b border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                    Mensagem (igual ao e-mail e ao WhatsApp)
                                </p>
                                <div className="max-h-[min(40vh,20rem)] overflow-y-auto overscroll-y-contain whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
                                    {invitePlainFullMessage}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Mensagem do convite indisponível.</p>
                        )}
                    </div>
                ) : null}
            </Modal>

            <Modal show={!!profileRow} onClose={closeProfile} maxWidth="lg">
                {profileRow ? (
                    <div className="space-y-4 p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Dados do voluntário</h2>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                    {profileRow.volunteer.name ?? 'Voluntário'} — {profileRow.ministryName ?? 'Departamento'}
                                </p>
                            </div>
                            <SecondaryButton type="button" onClick={closeProfile}>
                                Fechar
                            </SecondaryButton>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">E-mail</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileRow.volunteer.email)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Telefone</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileRow.volunteer.phone)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Data de nascimento</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{dateLabel(profileRow.volunteer.birthDate)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Área profissional</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileRow.volunteer.professionalArea)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Este número tem WhatsApp?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileRow.volunteer.hasWhatsapp)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Redes Sociais (Instagram, Facebook ou TikTok)</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileRow.volunteer.hasSocialNetworks)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Há quanto tempo você frequenta a Nova Semente?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{attendanceLabel(profileRow.volunteer.attendanceDuration)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Você é membro oficial da igreja adventista?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileRow.volunteer.isOfficialMember)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Seu registro de membro está na Nova Semente?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileRow.volunteer.memberRecordAtNovaSemente)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Se não estiver, em qual igreja está?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileRow.volunteer.memberRecordChurch)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Você já foi voluntário em algum ministério da igreja?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">
                                    {boolLabel(profileRow.volunteer.hasPreviousMinistryVolunteerExperience)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Precisa de alguma orientação pastoral nesse momento?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileRow.volunteer.needsPastoralGuidance)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Consentimento LGPD</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileRow.volunteer.lgpdDataConsent)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Função/cargo informado</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileRow.volunteer.role)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Acesso somente app</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileRow.volunteer.appAccessOnly)}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Detalhes da experiência anterior</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileRow.volunteer.previousMinistryDetails)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Envolvimento em ministérios</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileRow.volunteer.ministryInvolvement)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Outros interesses ministeriais</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileRow.volunteer.otherMinistryInterest)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Dons a desenvolver</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileRow.volunteer.giftsToDevelop)}
                                </div>
                            </div>
                        </div>

                        {profileRow.removeFromMinistryUrl ? (
                            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                                <p className="text-sm font-semibold text-red-900 dark:text-red-200">Remover do departamento</p>
                                <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90">
                                    Ao confirmar, o voluntário deixa de aparecer na sua lista deste departamento. O cadastro na igreja não é apagado.
                                </p>
                                <button
                                    type="button"
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
                                    onClick={() => void handleRemoveFromMinistry(profileRow)}
                                >
                                    <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
                                    Remover do departamento…
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal>

            <Modal
                show={requestModalOpen}
                onClose={closeRequestModal}
                maxWidth="lg"
                footer={
                    <div className="flex flex-wrap justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeRequestModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="leader-request-form" disabled={requestForm.processing}>
                            Enviar pedido
                        </PrimaryButton>
                    </div>
                }
            >
                <form id="leader-request-form" onSubmit={submitRequest} className="space-y-5 p-6">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Solicitar voluntário</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Informe departamento, quantidade e observações. Se quiser, selecione a função na escala.
                        </p>
                    </div>

                    <div>
                        <InputLabel htmlFor="request_ministry_id" value="Departamento" />
                        <SelectInput
                            id="request_ministry_id"
                            name="ministry_id"
                            value={requestForm.data.ministry_id === '' ? '' : String(requestForm.data.ministry_id)}
                            className="mt-1 block w-full"
                            required
                            onChange={(e) => {
                                const v = e.target.value;
                                const id = v === '' ? '' : Number(v);
                                requestForm.setData('ministry_id', id === '' || Number.isNaN(id) ? '' : id);
                                requestForm.setData('schedule_role_id', '');
                            }}
                        >
                            <option value="">Selecione…</option>
                            {requestMinistries.map((m) => (
                                <option key={m.id} value={String(m.id)}>
                                    {m.name}
                                </option>
                            ))}
                        </SelectInput>
                        <InputError className="mt-2" message={requestForm.errors.ministry_id} />
                    </div>

                    <div>
                        <InputLabel htmlFor="request_schedule_role_id" value="Função (escala) — opcional" />
                        <SelectInput
                            id="request_schedule_role_id"
                            name="schedule_role_id"
                            value={requestForm.data.schedule_role_id === '' ? '' : String(requestForm.data.schedule_role_id)}
                            className="mt-1 block w-full"
                            disabled={requestForm.data.ministry_id === ''}
                            onChange={(e) => {
                                const v = e.target.value;
                                const id = v === '' ? '' : Number(v);
                                requestForm.setData('schedule_role_id', id === '' || Number.isNaN(id) ? '' : id);
                            }}
                        >
                            <option value="">
                                {requestForm.data.ministry_id === ''
                                    ? 'Escolha primeiro o departamento'
                                    : 'Sem função específica (opcional)'}
                            </option>
                            {requestRoleOptions.map((o) => (
                                <option key={o.value} value={String(o.value)}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                        <InputError className="mt-2" message={requestForm.errors.schedule_role_id} />
                    </div>

                    <div>
                        <InputLabel htmlFor="request_quantity" value="Quantidade" />
                        <TextInput
                            id="request_quantity"
                            name="quantity"
                            type="number"
                            min={1}
                            max={50}
                            step={1}
                            value={String(requestForm.data.quantity)}
                            className="mt-1 block w-full max-w-xs"
                            onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                requestForm.setData('quantity', Number.isNaN(n) || n < 1 ? 1 : Math.min(50, n));
                            }}
                        />
                        <InputError className="mt-2" message={requestForm.errors.quantity} />
                    </div>

                    <div>
                        <InputLabel htmlFor="request_message" value="Observações (opcional)" />
                        <Textarea
                            id="request_message"
                            name="message"
                            value={requestForm.data.message}
                            className="mt-1 block w-full"
                            rows={5}
                            placeholder="Datas, requisitos, disponibilidade, observações gerais..."
                            onChange={(e) => requestForm.setData('message', e.target.value)}
                        />
                        <InputError className="mt-2" message={requestForm.errors.message} />
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

