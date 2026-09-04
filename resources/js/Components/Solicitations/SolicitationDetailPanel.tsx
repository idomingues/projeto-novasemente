import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, type ReactNode } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import PastorVisitScheduleSection from '@/Components/Solicitations/PastorVisitScheduleSection';
import type { PastoralPastorOpt } from '@/Components/PastoralAppointment/PastoralAppointmentForm';
import { CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE } from '@/constants/chatEmailNotice';

/** Mesmo formato que `PastoralBookingInertiaProps` (agenda pastoral). */
export type MemberPastoralBookingPayload = {
    pastors: PastoralPastorOpt[];
    storeUrl: string;
    defaultRequesterName: string;
};

export type SolicitationMessageRow = {
    id: number;
    senderType: string;
    senderName?: string | null;
    content: string;
    createdAt: string;
};

export type SolicitationDetailShape = {
    id: number;
    type?: string;
    typeLabel: string;
    status: string;
    statusLabel: string;
    message: string;
    meta: Record<string, unknown> | null;
    internalNotes?: string | null;
    memberLabel?: string;
    memberEmail?: string | null;
    memberPhone?: string | null;
    memberPhotoUrl?: string | null;
    preferredDate?: string | null;
    /** ISO8601 — horário escolhido em «Visita aos pastores». */
    preferredPastoralStart?: string | null;
    preferredPastoralModality?: string | null;
    /** Presente quando o payload inclui ids (edição membro / equipe). */
    assignedPastorId?: number | null;
    assignedVolunteerId?: number | null;
    assignedPastorName?: string | null;
    assignedVolunteerName?: string | null;
    /** Conversa com líder — título curto do assunto. */
    subject?: string | null;
    createdAt: string;
    completedAt: string | null;
};

export type MemberPastorOption = { value: number; label: string };

type MemberPatchFormData = {
    subject: string;
    message: string;
    preferred_date: string;
    assigned_pastor_id: string;
    assigned_volunteer_id: string;
    preferred_start: string;
    preferred_modality: '' | 'presential' | 'online';
    return_to: 'hub' | 'leader_contact';
};

export type SolicitationDetailPanelProps = {
    solicitation: SolicitationDetailShape;
    messages: SolicitationMessageRow[];
    updateUrl?: string;
    messageStoreUrl: string;
    canManage?: boolean;
    /** Staff com permissão de ver inbox pode responder no chat (não exige manage). */
    staffCanReply?: boolean;
    canChat: boolean;
    variant?: 'page' | 'modal';
    section?: 'full' | 'details' | 'chat';
    /** Quem envia mensagem neste formulário */
    composerRole: 'staff' | 'member';
    /** Rótulo da bolha do lado equipe/líder (ex.: «Igreja» ou «Eu (líder)»). */
    staffBubbleLabel?: string;
    /** Rótulo da bolha do membro. */
    memberBubbleLabel?: string;
    /** PATCH do membro (só com `memberCanEditDetails`). */
    memberUpdateUrl?: string;
    memberCanEditDetails?: boolean;
    memberPastorOptions?: MemberPastorOption[];
    /** Horários para reagendar «Visita aos pastores» (pedido pendente). */
    memberPastoralBooking?: MemberPastoralBookingPayload | null;
    pastoralAgendaUrl?: string;
    /** Após enviar mensagem no chat, o servidor redireciona para o hub ou para «Falar com líder». */
    messagePostReturnTo?: 'hub' | 'leader-contact';
    /** Após o membro salvar edição do pedido, redirecionamento (PATCH). */
    memberPatchReturnTo?: 'hub' | 'leader-contact';
    /** Membro ou líder pode encerrar conversa com líder (assunto finalizado). */
    canFinalizeLeaderChat?: boolean;
    finalizeLeaderChatUrl?: string | null;
    /** Membro remove o pedido/conversa da sua app (permanece na equipe). */
    memberHideConversationUrl?: string | null;
    /** Líder remove a conversa da sua lista na app. */
    leaderHideConversationUrl?: string | null;
    /** Corpo POST `return_to` ao ocultar como membro (batismo / hub / contato líder). */
    hideConversationReturnTo?: 'hub' | 'leader_contact' | 'baptism_hub';
    /**
     * Quando true, POST do chat e PATCH administrativo preservam o estado React do tela pai
     * (ex.: modal «Detalhes / Chat» em Pedidos de voluntário).
     */
    preserveStateOnPanelActions?: boolean;
    /** Chamado após enviar chat ou salvar alterações administrativas com sucesso. */
    onPanelActionSuccess?: () => void;
    /**
     * Conteúdo extra no aba Detalhes, imediatamente antes de «Gestão interna»
     * (ex.: alterar pedido + anexar voluntário no fluxo unificado de voluntários).
     */
    detailsBeforeAdminFooter?: ReactNode;
    archiveStaffUrl?: string | null;
    unarchiveStaffUrl?: string | null;
    staffArchivedAt?: string | null;
    /** Botões de estado (ex.: batismo) em vez do select genérico. */
    statusChangeOptions?: { value: string; label: string; description: string }[];
    /**
     * `embedded`: chat sem cabeçalho interno, ocupa a altura do pai (layout tipo WhatsApp).
     */
    chatChrome?: 'default' | 'embedded';
};

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatPedidoWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

function formatPreferredDate(ymd: string): string {
    const parts = ymd.split('-').map((x) => parseInt(x, 10));
    const [y, m, d] = parts;
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPastoralSlot(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-PT', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function modalityShort(m: string | null | undefined): string {
    if (m === 'presential') return 'Presencial';
    if (m === 'online') return 'Online';
    return '';
}

function solicitationStatusButtonClass(value: string, active: boolean): string {
    const base =
        'flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ';
    if (!active) {
        return `${base}border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600`;
    }
    const activeByValue: Record<string, string> = {
        pending:
            'border-amber-400 bg-amber-50 ring-2 ring-amber-400/25 dark:border-amber-600 dark:bg-amber-950/40 dark:ring-amber-500/30',
        waiting:
            'border-sky-400 bg-sky-50 ring-2 ring-sky-400/25 dark:border-sky-600 dark:bg-sky-950/40 dark:ring-sky-500/30',
        baptized:
            'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/25 dark:border-emerald-600 dark:bg-emerald-950/40 dark:ring-emerald-500/30',
        completed:
            'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/25 dark:border-emerald-600 dark:bg-emerald-950/40 dark:ring-emerald-500/30',
        cancelled:
            'border-rose-400 bg-rose-50 ring-2 ring-rose-400/25 dark:border-rose-600 dark:bg-rose-950/40 dark:ring-rose-500/30',
        archived:
            'border-zinc-400 bg-zinc-100 ring-2 ring-zinc-400/20 dark:border-zinc-500 dark:bg-zinc-800/80 dark:ring-zinc-500/25',
    };

    return base + (activeByValue[value] ?? activeByValue.archived);
}

export default function SolicitationDetailPanel({
    solicitation,
    messages,
    updateUrl,
    messageStoreUrl,
    canManage = false,
    staffCanReply = false,
    canChat,
    variant = 'page',
    section: sectionProp = 'full',
    composerRole,
    staffBubbleLabel = 'Igreja',
    memberBubbleLabel = 'Membro',
    memberUpdateUrl,
    memberCanEditDetails = false,
    memberPastorOptions = [],
    memberPastoralBooking = null,
    pastoralAgendaUrl,
    messagePostReturnTo,
    memberPatchReturnTo = 'hub',
    canFinalizeLeaderChat = false,
    finalizeLeaderChatUrl = null,
    memberHideConversationUrl = null,
    leaderHideConversationUrl = null,
    hideConversationReturnTo = 'hub',
    preserveStateOnPanelActions = false,
    onPanelActionSuccess,
    detailsBeforeAdminFooter,
    statusChangeOptions,
    chatChrome = 'default',
}: SolicitationDetailPanelProps) {
    const inertiaScrollOpts = { preserveScroll: true };
    const panelSaveOpts = preserveStateOnPanelActions ? inertiaListModalSave : inertiaScrollOpts;
    const isModal = variant === 'modal';
    const chatEmbedded = chatChrome === 'embedded';
    const showDetails = sectionProp === 'full' || sectionProp === 'details';
    const showChat = sectionProp === 'full' || sectionProp === 'chat';
    const isLeaderChat = solicitation.type === 'leader_chat';

    const msgForm = useForm({
        content: '',
        return_to: (messagePostReturnTo === 'hub'
            ? 'hub'
            : messagePostReturnTo === 'leader-contact'
              ? 'leader_contact'
              : '') as '' | 'hub' | 'leader_contact',
    });
    const adminForm = useForm({
        status: solicitation.status,
        internal_notes: solicitation.internalNotes ?? '',
        preferred_date: solicitation.preferredDate ?? '',
    });

    useEffect(() => {
        adminForm.setData({
            status: solicitation.status,
            internal_notes: solicitation.internalNotes ?? '',
            preferred_date: solicitation.preferredDate ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao trocar de pedido (evita apagar seleção local de situação)
    }, [solicitation.id]);

    const pvMod = solicitation.preferredPastoralModality;
    const memberPatchForm = useForm<MemberPatchFormData>({
        subject: isLeaderChat ? (solicitation.subject ?? '') : '',
        message: solicitation.message,
        preferred_date: solicitation.preferredDate ?? '',
        assigned_pastor_id:
            solicitation.assignedPastorId != null ? String(solicitation.assignedPastorId) : '',
        assigned_volunteer_id:
            solicitation.assignedVolunteerId != null ? String(solicitation.assignedVolunteerId) : '',
        preferred_start: solicitation.preferredPastoralStart ?? '',
        preferred_modality:
            pvMod === 'presential' || pvMod === 'online' ? pvMod : ('' as '' | 'presential' | 'online'),
        return_to: memberPatchReturnTo === 'leader-contact' ? 'leader_contact' : 'hub',
    });

    useEffect(() => {
        const leader = solicitation.type === 'leader_chat';
        const m = solicitation.preferredPastoralModality;
        memberPatchForm.setData({
            subject: leader ? (solicitation.subject ?? '') : '',
            message: solicitation.message,
            preferred_date: solicitation.preferredDate ?? '',
            assigned_pastor_id:
                solicitation.assignedPastorId != null ? String(solicitation.assignedPastorId) : '',
            assigned_volunteer_id:
                solicitation.assignedVolunteerId != null ? String(solicitation.assignedVolunteerId) : '',
            preferred_start: solicitation.preferredPastoralStart ?? '',
            preferred_modality:
                m === 'presential' || m === 'online' ? m : ('' as '' | 'presential' | 'online'),
            return_to: memberPatchReturnTo === 'leader-contact' ? 'leader_contact' : 'hub',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        solicitation.id,
        solicitation.subject,
        solicitation.message,
        solicitation.type,
        solicitation.preferredPastoralStart,
        solicitation.preferredPastoralModality,
        memberPatchReturnTo,
    ]);

    const sendMessage: FormEventHandler = (e) => {
        e.preventDefault();
        if (!msgForm.data.content.trim()) return;
        msgForm.post(messageStoreUrl, {
            ...panelSaveOpts,
            onSuccess: () => {
                msgForm.reset('content');
                msgForm.setData(
                    'return_to',
                    messagePostReturnTo === 'hub'
                        ? 'hub'
                        : messagePostReturnTo === 'leader-contact'
                          ? 'leader_contact'
                          : '',
                );
                onPanelActionSuccess?.();
            },
        });
    };

    const saveMemberDetails: FormEventHandler = (e) => {
        e.preventDefault();
        if (!memberUpdateUrl || !memberCanEditDetails) return;
        memberPatchForm.patch(memberUpdateUrl, panelSaveOpts);
    };

    const isPastorVisitFlow =
        !isLeaderChat && solicitation.type === 'pastor_visit' && memberPastoralBooking !== null;

    const editPastorVisitPastor = useMemo(() => {
        if (!isPastorVisitFlow || !memberPastoralBooking) return null;
        const pid =
            memberPatchForm.data.assigned_pastor_id === ''
                ? null
                : Number(memberPatchForm.data.assigned_pastor_id);
        if (pid === null || Number.isNaN(pid)) return null;
        return memberPastoralBooking.pastors.find((p) => p.id === pid) ?? null;
    }, [isPastorVisitFlow, memberPastoralBooking, memberPatchForm.data.assigned_pastor_id]);

    const editPastorVisitReady = useMemo(() => {
        if (!editPastorVisitPastor || !memberPatchForm.data.preferred_start) return false;
        const slot = editPastorVisitPastor.slots.find((s) => s.value === memberPatchForm.data.preferred_start);
        if (!slot) return false;
        if (slot.modality === 'both') {
            return (
                memberPatchForm.data.preferred_modality === 'presential' ||
                memberPatchForm.data.preferred_modality === 'online'
            );
        }
        return true;
    }, [
        editPastorVisitPastor,
        memberPatchForm.data.preferred_start,
        memberPatchForm.data.preferred_modality,
    ]);

    const saveAdmin: FormEventHandler = (e) => {
        e.preventDefault();
        if (!updateUrl) return;
        adminForm.patch(updateUrl, {
            ...panelSaveOpts,
            onSuccess: () => {
                onPanelActionSuccess?.();
            },
        });
    };

    const selectStatusFromButtons = (next: string) => {
        if (adminForm.processing) return;
        adminForm.setData('status', next);
    };

    const isStaffBubble = (senderType: string) => senderType === 'staff';

    const isModalChatOnly = isModal && sectionProp === 'chat';
    const isVolunteerRequest = solicitation.type === 'volunteer_request';
    /** Equipe: cabeçalho do modal + gestão + formulário de alteração tornam o cartão redundante. Líder: permanece para ler o pedido quando não edita. */
    const hideVolunteerRequestPedidoCard =
        isVolunteerRequest && isModal && composerRole === 'staff';

    /** Membro a editar pedido pendente: o cartão «Pedido» repete mensagem/data — mostramos só o formulário com cabeçalho compacto. */
    const memberEditsOwnPending =
        Boolean(memberUpdateUrl && memberCanEditDetails && composerRole === 'member');

    return (
        <div
            className={
                chatEmbedded || isModalChatOnly
                    ? 'flex min-h-0 flex-1 flex-col'
                    : `${isModal ? 'space-y-5 pb-1' : 'space-y-6'}`
            }
        >
            {showDetails && !memberEditsOwnPending && !hideVolunteerRequestPedidoCard && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Pedido
                        </div>
                        {composerRole === 'staff' ? (
                            <span className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                #{solicitation.id}
                            </span>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="inline-flex rounded-full border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            {solicitation.statusLabel}
                        </span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{solicitation.typeLabel}</span>
                        {solicitation.memberLabel && composerRole !== 'staff' ? (
                            <>
                                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                <span>{solicitation.memberLabel}</span>
                            </>
                        ) : null}
                    </div>
                    {solicitation.createdAt ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Enviado em{' '}
                            <time dateTime={solicitation.createdAt}>{formatPedidoWhen(solicitation.createdAt)}</time>
                        </p>
                    ) : null}
                    {isLeaderChat && (
                        <div className="text-sm text-zinc-800 dark:text-zinc-200">
                            <span className="font-semibold text-zinc-600 dark:text-zinc-400">Assunto: </span>
                            {solicitation.subject?.trim() ? solicitation.subject : '—'}
                        </div>
                    )}
                    {composerRole === 'staff' ? (
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    E-mail
                                </dt>
                                <dd className="mt-0.5 break-all text-zinc-800 dark:text-zinc-100">
                                    {solicitation.memberEmail?.trim() ? solicitation.memberEmail : '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Telefone
                                </dt>
                                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-100">
                                    {solicitation.memberPhone?.trim() ? solicitation.memberPhone : '—'}
                                </dd>
                            </div>
                        </dl>
                    ) : null}
                    <div>
                        <p className="sr-only">Mensagem inicial do pedido</p>
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50/90 px-3.5 py-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700/80 dark:bg-zinc-950/50 dark:text-zinc-100 whitespace-pre-wrap">
                            {solicitation.message}
                        </div>
                    </div>
                    {(solicitation.preferredPastoralStart ||
                        solicitation.preferredDate ||
                        solicitation.assignedPastorName ||
                        solicitation.assignedVolunteerName) && (
                        <div className="mt-3 rounded-xl border border-zinc-100 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                            {solicitation.preferredPastoralStart && (
                                <div>
                                    <span className="font-medium text-zinc-600 dark:text-zinc-400">Horário: </span>
                                    {formatPastoralSlot(solicitation.preferredPastoralStart)}
                                    {solicitation.preferredPastoralModality ? (
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            {' '}
                                            · {modalityShort(solicitation.preferredPastoralModality)}
                                        </span>
                                    ) : null}
                                </div>
                            )}
                            {solicitation.preferredDate && !solicitation.preferredPastoralStart && (
                                <div>
                                    <span className="font-medium text-zinc-600 dark:text-zinc-400">Data: </span>
                                    {formatPreferredDate(solicitation.preferredDate)}
                                </div>
                            )}
                            {solicitation.assignedPastorName && (
                                <div>
                                    <span className="font-medium text-zinc-600 dark:text-zinc-400">Pastor: </span>
                                    {solicitation.assignedPastorName}
                                </div>
                            )}
                            {solicitation.assignedVolunteerName && (
                                <div>
                                    <span className="font-medium text-zinc-600 dark:text-zinc-400">Voluntário: </span>
                                    {solicitation.assignedVolunteerName}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showDetails && canFinalizeLeaderChat && finalizeLeaderChatUrl && (
                <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-3">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">Finalizar o assunto</div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Quando o assunto estiver tratado, confirme abaixo. A conversa fica encerrada para si e para a outra parte — não
                        serão aceites novas mensagens (só consulta do histórico).
                    </p>
                    <SecondaryButton
                        type="button"
                        className="w-full justify-center border-amber-300 bg-white text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-100 dark:hover:bg-zinc-800"
                        onClick={async () => {
                            if (!finalizeLeaderChatUrl) return;
                            const ok = await confirmAction({
                                title: 'Encerrar esta conversa?',
                                text: 'O assunto fica finalizado para si e para a outra parte. Não será possível enviar novas mensagens neste fio (permanece o histórico para consulta).',
                                icon: 'warning',
                                danger: true,
                                confirmButtonText: 'Sim, encerrar',
                                cancelButtonText: 'Cancelar',
                            });
                            if (!ok) return;
                            router.post(finalizeLeaderChatUrl, {}, inertiaScrollOpts);
                        }}
                    >
                        Finalizar assunto e encerrar conversa
                    </SecondaryButton>
                </div>
            )}

            {showDetails && memberUpdateUrl && memberCanEditDetails && (
                <form
                    onSubmit={saveMemberDetails}
                    className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-4 sm:p-5"
                >
                    {memberEditsOwnPending ? (
                        <div className="-mx-4 -mt-4 mb-1 border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-transparent px-4 pb-4 pt-3 dark:border-zinc-800 dark:from-zinc-800/50 sm:-mx-5 sm:-mt-5 sm:mb-2 sm:px-5 sm:pb-4 sm:pt-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
                                    {solicitation.statusLabel}
                                </span>
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{solicitation.typeLabel}</span>
                            </div>
                            <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
                                Alterar o seu pedido
                            </h2>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {isLeaderChat
                                    ? 'Pode mudar o assunto e a mensagem inicial. Para a conversa em tempo real, use o aba Chat.'
                                    : solicitation.type === 'pastor_visit'
                                      ? 'Escolha pastor e horário na lista abaixo; as notas são opcionais. Mensagens à igreja ficam no aba Chat.'
                                      : 'Atualize a mensagem, a data ou o pastor abaixo. Para falar com a igreja, use o aba Chat.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-white">Editar o seu pedido</div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {isLeaderChat
                                    ? 'Enquanto estiver pendente, pode alterar o assunto e a mensagem inicial.'
                                    : solicitation.type === 'pastor_visit'
                                      ? 'Enquanto estiver pendente, pode alterar o horário (lista abaixo), o pastor e as notas.'
                                      : 'Enquanto estiver pendente, pode alterar a mensagem, a data e o pastor opcional.'}
                            </p>
                        </>
                    )}
                    {isLeaderChat && (
                        <div>
                            <InputLabel htmlFor="member_sol_subject" value="Assunto" />
                            <TextInput
                                id="member_sol_subject"
                                value={memberPatchForm.data.subject}
                                onChange={(e) => memberPatchForm.setData('subject', e.target.value)}
                                className="mt-1"
                                maxLength={150}
                                required
                            />
                            <InputError message={memberPatchForm.errors.subject} className="mt-1" />
                        </div>
                    )}
                    <div>
                        <InputLabel htmlFor="member_sol_message" value={isLeaderChat ? 'Mensagem inicial' : 'Mensagem'} />
                        <Textarea
                            id="member_sol_message"
                            value={memberPatchForm.data.message}
                            onChange={(e) => memberPatchForm.setData('message', e.target.value)}
                            rows={6}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={memberPatchForm.errors.message} className="mt-1" />
                    </div>
                    {!isLeaderChat && isPastorVisitFlow && memberPastoralBooking ? (
                        <PastorVisitScheduleSection
                            pastors={memberPastoralBooking.pastors}
                            value={{
                                assigned_pastor_id: memberPatchForm.data.assigned_pastor_id,
                                preferred_start: memberPatchForm.data.preferred_start,
                                preferred_modality: memberPatchForm.data.preferred_modality,
                            }}
                            onChange={(patch) => {
                                memberPatchForm.setData((data) => ({ ...data, ...patch }));
                            }}
                            errors={memberPatchForm.errors}
                            fieldIdPrefix="member_pv"
                            pastoralAgendaUrl={pastoralAgendaUrl}
                        />
                    ) : null}
                    {!isLeaderChat && !isPastorVisitFlow && (
                        <>
                            <div>
                                <InputLabel htmlFor="member_sol_pref_date" value="Data pretendida ou relevante (opcional)" />
                                <input
                                    id="member_sol_pref_date"
                                    type="date"
                                    value={memberPatchForm.data.preferred_date}
                                    onChange={(e) => memberPatchForm.setData('preferred_date', e.target.value)}
                                    className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20"
                                />
                                <InputError message={memberPatchForm.errors.preferred_date} className="mt-1" />
                            </div>
                            {memberPastorOptions.length > 0 && (
                                <div>
                                    <InputLabel htmlFor="member_sol_pastor" value="Pastor (opcional)" />
                                    <SelectInput
                                        id="member_sol_pastor"
                                        className="mt-1"
                                        value={memberPatchForm.data.assigned_pastor_id}
                                        onChange={(e) =>
                                            memberPatchForm.setData((data) => ({
                                                ...data,
                                                assigned_pastor_id: e.target.value,
                                                assigned_volunteer_id: e.target.value ? '' : data.assigned_volunteer_id,
                                            }))
                                        }
                                    >
                                        <option value="">— Nenhum —</option>
                                        {memberPastorOptions.map((o) => (
                                            <option key={o.value} value={String(o.value)}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </SelectInput>
                                    <InputError message={memberPatchForm.errors.assigned_pastor_id} className="mt-1" />
                                </div>
                            )}
                        </>
                    )}
                    {!isLeaderChat && solicitation.type === 'pastor_visit' && !memberPastoralBooking ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            Não foi possível carregar a lista de horários. Pode alterar a mensagem; para mudar data ou pastor,
                            contacte a igreja ou use Solicitações e escolha «Horário com pastor».
                        </p>
                    ) : null}
                    <div className="flex justify-end">
                        <PrimaryButton
                            type="submit"
                            disabled={
                                memberPatchForm.processing ||
                                (isPastorVisitFlow && memberPastoralBooking ? !editPastorVisitReady : false)
                            }
                        >
                            Salvar alterações
                        </PrimaryButton>
                    </div>
                </form>
            )}

            {showDetails && detailsBeforeAdminFooter ? (
                <div className="space-y-8">{detailsBeforeAdminFooter}</div>
            ) : null}

            {showDetails && canManage && updateUrl && (
                <form
                    onSubmit={saveAdmin}
                    className="space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/90 to-white p-4 shadow-sm dark:border-indigo-900/45 dark:from-indigo-950/35 dark:to-zinc-900 sm:p-5"
                >
                    <div>
                        <div className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">Gestão interna</div>
                        <p className="mt-1 text-xs leading-relaxed text-indigo-900/75 dark:text-indigo-200/75">
                            Estado e notas só para a equipe. Responda ao membro no aba <strong className="font-semibold">Chat</strong>.
                        </p>
                    </div>
                    {statusChangeOptions && statusChangeOptions.length > 0 ? (
                        <div className="space-y-2">
                            <InputLabel
                                value={
                                    solicitation.type === 'baptism' ? 'Situação do batismo' : 'Situação do pedido'
                                }
                            />
                            <p className="text-xs text-indigo-900/70 dark:text-indigo-200/70">
                                Selecione a situação desejada e confirme em{' '}
                                <strong className="font-semibold">Salvar gestão</strong>. Notas e data são salvas no mesmo
                                envio.
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {statusChangeOptions.map((opt) => {
                                    const active = adminForm.data.status === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            disabled={adminForm.processing}
                                            aria-pressed={active}
                                            onClick={() => selectStatusFromButtons(opt.value)}
                                            className={solicitationStatusButtonClass(opt.value, active)}
                                        >
                                            <span
                                                className={`text-sm font-semibold ${
                                                    active
                                                        ? 'text-zinc-900 dark:text-white'
                                                        : 'text-zinc-800 dark:text-zinc-100'
                                                }`}
                                            >
                                                {opt.label}
                                                {active ? (
                                                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                                                        Atual
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
                                                {opt.description}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <InputError message={adminForm.errors.status} className="mt-1" />
                        </div>
                    ) : (
                        <div className={isVolunteerRequest ? '' : 'sm:max-w-xs'}>
                            <InputLabel htmlFor="sol_status" value="Estado do pedido" />
                            <SelectInput
                                id="sol_status"
                                className="mt-1"
                                value={adminForm.data.status}
                                onChange={(e) => adminForm.setData('status', e.target.value)}
                            >
                                <option value="pending">Pendente</option>
                                <option value="in_progress">Em tratamento</option>
                                <option value="completed">Concluído</option>
                                <option value="cancelled">Cancelado</option>
                            </SelectInput>
                            <InputError message={adminForm.errors.status} className="mt-1" />
                        </div>
                    )}
                    {!isVolunteerRequest ? (
                        <div className={statusChangeOptions ? 'max-w-sm' : ''}>
                            <InputLabel htmlFor="sol_pref_date" value="Data preferida ou agendada" />
                            <input
                                id="sol_pref_date"
                                type="date"
                                value={adminForm.data.preferred_date}
                                onChange={(e) => adminForm.setData('preferred_date', e.target.value)}
                                className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30"
                            />
                            <InputError message={adminForm.errors.preferred_date} className="mt-1" />
                        </div>
                    ) : null}
                    {!isVolunteerRequest ? (
                        <div>
                            <InputLabel htmlFor="sol_internal" value="Notas internas (confidenciais)" />
                            <Textarea
                                id="sol_internal"
                                value={adminForm.data.internal_notes}
                                onChange={(e) => adminForm.setData('internal_notes', e.target.value)}
                                rows={isModal ? 3 : 4}
                                placeholder="Lembretes para a equipe, acordos telefónicos, etc."
                                className="mt-1 block w-full rounded-xl border-zinc-200 dark:border-zinc-700"
                            />
                            <InputError message={adminForm.errors.internal_notes} className="mt-1" />
                        </div>
                    ) : null}
                    <div className="flex justify-end pt-1">
                        <PrimaryButton type="submit" disabled={adminForm.processing} className="min-w-[10rem] justify-center">
                            Salvar gestão
                        </PrimaryButton>
                    </div>
                </form>
            )}

            {showChat && (
                <div
                    className={`flex flex-col overflow-hidden ${
                        chatEmbedded
                            ? 'min-h-0 flex-1 border-0 bg-[#efeae2] dark:bg-zinc-950 rounded-none shadow-none'
                            : `rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 shadow-sm ${
                                  isModalChatOnly
                                      ? 'min-h-0 flex-1'
                                      : isModal
                                        ? 'max-h-[min(58dvh,520px)]'
                                        : 'min-h-[min(55dvh,560px)] max-h-[min(72dvh,680px)]'
                              }`
                    }`}
                >
                    {!chatEmbedded ? (
                        <div className="shrink-0 border-b border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-4 py-3 backdrop-blur-sm sm:px-4">
                            <div className="flex items-start gap-2">
                                <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                <div className="min-w-0">
                                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                                        {composerRole === 'staff'
                                            ? 'Conversa com o membro'
                                            : isLeaderChat
                                              ? 'Conversa com o líder'
                                              : 'Conversa com a igreja'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        {!canChat
                                            ? 'Este pedido está encerrado — histórico só para consulta.'
                                            : composerRole === 'staff'
                                              ? `Histórico abaixo — escreva a resposta no fim. ${CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE}`
                                              : 'Histórico abaixo — escreva a sua mensagem no fim do chat.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div
                        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3 sm:px-3 ${
                            isModalChatOnly && !chatEmbedded ? 'min-h-[12rem]' : ''
                        }`}
                    >
                        {messages.length === 0 ? (
                            <p className="px-2 py-10 text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {composerRole === 'staff'
                                    ? 'Ainda não há mensagens nesta conversa. O texto inicial do pedido está no aba «Detalhes» — pode enviar aqui a primeira resposta ao membro.'
                                    : 'Ainda não há mensagens neste fio. O pedido inicial está no aba de detalhes.'}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {messages.map((m) => {
                                    const staff = isStaffBubble(m.senderType);
                                    // No chat embutido (estilo WhatsApp), as suas mensagens ficam à direita.
                                    // Nos demais painéis, staff à esquerda e membro à direita (visão histórica).
                                    const alignEnd = chatEmbedded
                                        ? composerRole === 'member'
                                            ? !staff
                                            : staff
                                        : !staff;
                                    return (
                                        <div key={m.id} className={`flex w-full ${alignEnd ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[min(88%,28rem)] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                                                    alignEnd
                                                        ? 'rounded-br-md bg-emerald-600 text-white dark:bg-emerald-700'
                                                        : 'rounded-bl-md bg-white text-zinc-900 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700'
                                                }`}
                                            >
                                                {(!alignEnd || !chatEmbedded) && (
                                                    <div
                                                        className={`mb-1 text-[11px] font-semibold ${
                                                            alignEnd ? 'text-emerald-100' : 'text-zinc-500 dark:text-zinc-400'
                                                        }`}
                                                    >
                                                        {staff ? staffBubbleLabel : (m.senderName ?? memberBubbleLabel)}
                                                    </div>
                                                )}
                                                <div className={alignEnd ? 'text-white' : ''}>{m.content}</div>
                                                <div
                                                    className={`mt-1 text-right text-[10px] tabular-nums ${
                                                        alignEnd ? 'text-emerald-100/90' : 'text-zinc-400 dark:text-zinc-500'
                                                    }`}
                                                >
                                                    {formatTime(m.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {canChat && (composerRole === 'member' || (composerRole === 'staff' && staffCanReply)) && (
                        <div
                            className={`shrink-0 border-t border-zinc-200/80 bg-[#f0f2f5] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] dark:border-zinc-800 dark:bg-zinc-900 sm:p-3 ${
                                chatEmbedded ? '' : 'bg-white/95 dark:bg-zinc-900/95 p-3 sm:p-4'
                            }`}
                        >
                            <form onSubmit={sendMessage} className="flex items-end gap-2">
                                <div className="min-w-0 flex-1">
                                    <label className="sr-only" htmlFor="sol_chat_input">
                                        {composerRole === 'staff' ? 'Mensagem para o membro' : 'A sua mensagem'}
                                    </label>
                                    <Textarea
                                        id="sol_chat_input"
                                        value={msgForm.data.content}
                                        onChange={(e) => msgForm.setData('content', e.target.value)}
                                        rows={chatEmbedded ? 1 : isModalChatOnly ? 3 : isModal ? 2 : 3}
                                        placeholder={
                                            composerRole === 'staff'
                                                ? 'Mensagem…'
                                                : 'Mensagem…'
                                        }
                                        className={`w-full shadow-sm dark:border-zinc-600 ${
                                            chatEmbedded
                                                ? 'min-h-[42px] max-h-32 rounded-3xl border-0 bg-white px-4 py-2.5 dark:bg-zinc-800'
                                                : 'rounded-xl border-zinc-300'
                                        }`}
                                    />
                                    <InputError message={msgForm.errors.content} className="mt-1" />
                                </div>
                                <PrimaryButton
                                    type="submit"
                                    disabled={msgForm.processing}
                                    className={`h-11 shrink-0 justify-center ${chatEmbedded ? 'rounded-full px-4' : 'px-6 sm:mb-0.5'}`}
                                >
                                    Enviar
                                </PrimaryButton>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {(showDetails || showChat) &&
            !canManage &&
            !chatEmbedded &&
            (memberHideConversationUrl || leaderHideConversationUrl) ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 p-4 space-y-3">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">Confidencialidade</div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Se preferir não ver mais esta conversa na app, pode removê-la da sua conta. O registro pode manter-se
                        disponível para a igreja no atendimento (suporte interno e obrigações legais).
                    </p>
                    <SecondaryButton
                        type="button"
                        className="w-full justify-center border-red-200 bg-white text-red-800 hover:bg-red-50 dark:border-red-900/60 dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-red-950/40"
                        onClick={async () => {
                            const url = memberHideConversationUrl ?? leaderHideConversationUrl;
                            if (!url) return;
                            const ok = await confirmAction({
                                title: 'Remover esta conversa da sua app?',
                                text: 'Deixa de aparecer nos seus pedidos e listas. A igreja pode continuar a aceder ao histórico no painel de atendimento.',
                                icon: 'warning',
                                danger: true,
                                confirmButtonText: 'Sim, remover da minha app',
                                cancelButtonText: 'Cancelar',
                            });
                            if (!ok) return;
                            if (memberHideConversationUrl) {
                                router.post(
                                    url,
                                    { return_to: hideConversationReturnTo },
                                    { preserveScroll: true },
                                );
                            } else {
                                router.post(url, {}, { preserveScroll: true });
                            }
                        }}
                    >
                        Excluir conversa da minha app
                    </SecondaryButton>
                </div>
            ) : null}
        </div>
    );
}
