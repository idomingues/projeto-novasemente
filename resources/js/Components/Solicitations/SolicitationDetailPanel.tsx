import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import { confirmAction } from '@/utils/confirmDialog';

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
    preferredDate?: string | null;
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
    /** Após enviar mensagem no chat, o servidor redireciona para o hub ou para «Falar com líder». */
    messagePostReturnTo?: 'hub' | 'leader-contact';
    /** Após o membro salvar edição do pedido, redirecionamento (PATCH). */
    memberPatchReturnTo?: 'hub' | 'leader-contact';
    /** Membro ou líder pode encerrar conversa com líder (assunto finalizado). */
    canFinalizeLeaderChat?: boolean;
    finalizeLeaderChatUrl?: string | null;
    /** Membro remove o pedido/conversa da sua app (mantém-se na equipe). */
    memberHideConversationUrl?: string | null;
    /** Líder remove a conversa da sua lista na app. */
    leaderHideConversationUrl?: string | null;
    /** Corpo POST `return_to` ao ocultar como membro (batismo / hub / contacto líder). */
    hideConversationReturnTo?: 'hub' | 'leader_contact' | 'baptism_hub';
};

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatPreferredDate(ymd: string): string {
    const parts = ymd.split('-').map((x) => parseInt(x, 10));
    const [y, m, d] = parts;
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
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
    messagePostReturnTo,
    memberPatchReturnTo = 'hub',
    canFinalizeLeaderChat = false,
    finalizeLeaderChatUrl = null,
    memberHideConversationUrl = null,
    leaderHideConversationUrl = null,
    hideConversationReturnTo = 'hub',
}: SolicitationDetailPanelProps) {
    const inertiaScrollOpts = { preserveScroll: true };
    const isModal = variant === 'modal';
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sincronizar quando abrimos outro pedido
    }, [solicitation.id]);

    const memberPatchForm = useForm<MemberPatchFormData>({
        subject: isLeaderChat ? (solicitation.subject ?? '') : '',
        message: solicitation.message,
        preferred_date: solicitation.preferredDate ?? '',
        assigned_pastor_id:
            solicitation.assignedPastorId != null ? String(solicitation.assignedPastorId) : '',
        assigned_volunteer_id:
            solicitation.assignedVolunteerId != null ? String(solicitation.assignedVolunteerId) : '',
        return_to: memberPatchReturnTo === 'leader-contact' ? 'leader_contact' : 'hub',
    });

    useEffect(() => {
        const leader = solicitation.type === 'leader_chat';
        memberPatchForm.setData({
            subject: leader ? (solicitation.subject ?? '') : '',
            message: solicitation.message,
            preferred_date: solicitation.preferredDate ?? '',
            assigned_pastor_id:
                solicitation.assignedPastorId != null ? String(solicitation.assignedPastorId) : '',
            assigned_volunteer_id:
                solicitation.assignedVolunteerId != null ? String(solicitation.assignedVolunteerId) : '',
            return_to: memberPatchReturnTo === 'leader-contact' ? 'leader_contact' : 'hub',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solicitation.id, solicitation.subject, solicitation.message, solicitation.type, memberPatchReturnTo]);

    const sendMessage: FormEventHandler = (e) => {
        e.preventDefault();
        if (!msgForm.data.content.trim()) return;
        msgForm.post(messageStoreUrl, {
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
            },
            ...inertiaScrollOpts,
        });
    };

    const saveMemberDetails: FormEventHandler = (e) => {
        e.preventDefault();
        if (!memberUpdateUrl || !memberCanEditDetails) return;
        memberPatchForm.patch(memberUpdateUrl, inertiaScrollOpts);
    };

    const saveAdmin: FormEventHandler = (e) => {
        e.preventDefault();
        if (!updateUrl) return;
        adminForm.patch(updateUrl, inertiaScrollOpts);
    };

    const isStaffBubble = (senderType: string) => senderType === 'staff';

    return (
        <div className={`space-y-6 ${isModal ? 'pb-1' : ''}`}>
            {showDetails && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-3">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Pedido</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="inline-flex rounded-full border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            {solicitation.statusLabel}
                        </span>
                        <span>{solicitation.typeLabel}</span>
                        {solicitation.memberLabel && (
                            <>
                                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                <span>{solicitation.memberLabel}</span>
                            </>
                        )}
                    </div>
                    {isLeaderChat && (
                        <div className="text-sm text-zinc-800 dark:text-zinc-200">
                            <span className="font-semibold text-zinc-600 dark:text-zinc-400">Assunto: </span>
                            {solicitation.subject?.trim() ? solicitation.subject : '—'}
                        </div>
                    )}
                    <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{solicitation.message}</div>
                    {(solicitation.preferredDate ||
                        solicitation.assignedPastorName ||
                        solicitation.assignedVolunteerName) && (
                        <div className="mt-3 rounded-xl border border-zinc-100 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                            {solicitation.preferredDate && (
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
                                text: 'O assunto fica finalizado para si e para a outra parte. Não será possível enviar novas mensagens neste fio (mantém-se o histórico para consulta).',
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
                <form onSubmit={saveMemberDetails} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-4">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">Editar o seu pedido</div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isLeaderChat
                            ? 'Enquanto estiver pendente, pode alterar o assunto e a mensagem inicial.'
                            : 'Enquanto estiver pendente, pode alterar a mensagem, a data e o pastor opcional.'}
                    </p>
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
                    {!isLeaderChat && (
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
                    <div className="flex justify-end">
                        <PrimaryButton type="submit" disabled={memberPatchForm.processing}>
                            Salvar alterações
                        </PrimaryButton>
                    </div>
                </form>
            )}

            {showDetails && canManage && updateUrl && (
                <form onSubmit={saveAdmin} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-4">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">Gestão (equipe)</div>
                    <div>
                        <InputLabel htmlFor="sol_status" value="Estado" />
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
                    <div>
                        <InputLabel htmlFor="sol_internal" value="Notas internas (não visíveis ao membro)" />
                        <Textarea
                            id="sol_internal"
                            value={adminForm.data.internal_notes}
                            onChange={(e) => adminForm.setData('internal_notes', e.target.value)}
                            rows={4}
                            className="mt-1 block w-full"
                        />
                        <InputError message={adminForm.errors.internal_notes} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="sol_pref_date" value="Data (preferida ou agendada)" />
                        <input
                            id="sol_pref_date"
                            type="date"
                            value={adminForm.data.preferred_date}
                            onChange={(e) => adminForm.setData('preferred_date', e.target.value)}
                            className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20"
                        />
                        <InputError message={adminForm.errors.preferred_date} className="mt-1" />
                    </div>
                    <div className="flex justify-end">
                        <PrimaryButton type="submit" disabled={adminForm.processing}>
                            Enviar
                        </PrimaryButton>
                    </div>
                </form>
            )}

            {showChat && (
                <div
                    className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 shadow-sm ${
                        isModal
                            ? 'max-h-[min(58dvh,520px)]'
                            : 'min-h-[min(55dvh,560px)] max-h-[min(72dvh,680px)]'
                    }`}
                >
                    <div className="shrink-0 border-b border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-4 py-3 backdrop-blur-sm">
                        <div className="flex items-start gap-2">
                            <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Chat</h2>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    {canChat
                                        ? 'Estilo conversa — mensagens abaixo, caixa de texto em baixo.'
                                        : 'Pedido encerrado — só leitura.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3">
                        {messages.length === 0 ? (
                            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-8">
                                Ainda não há mensagens neste fio. O pedido inicial está no separador de detalhes.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {messages.map((m) => {
                                    const staff = isStaffBubble(m.senderType);
                                    return (
                                        <div key={m.id} className={`flex w-full ${staff ? 'justify-start' : 'justify-end'}`}>
                                            <div
                                                className={`max-w-[min(88%,28rem)] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                                                    staff
                                                        ? 'rounded-bl-md bg-white text-zinc-900 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700'
                                                        : 'rounded-br-md bg-emerald-600 text-white dark:bg-emerald-700'
                                                }`}
                                            >
                                                <div
                                                    className={`text-[11px] font-semibold mb-1 ${
                                                        staff ? 'text-zinc-500 dark:text-zinc-400' : 'text-emerald-100'
                                                    }`}
                                                >
                                                    {staff ? staffBubbleLabel : (m.senderName ?? memberBubbleLabel)}
                                                </div>
                                                <div className={staff ? '' : 'text-white'}>{m.content}</div>
                                                <div
                                                    className={`mt-1 text-[10px] tabular-nums ${
                                                        staff ? 'text-zinc-400 dark:text-zinc-500' : 'text-emerald-100/90'
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
                        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-4">
                            <form onSubmit={sendMessage} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                    <label className="sr-only" htmlFor="sol_chat_input">
                                        {composerRole === 'staff' ? 'Mensagem para o membro' : 'A sua mensagem'}
                                    </label>
                                    <Textarea
                                        id="sol_chat_input"
                                        value={msgForm.data.content}
                                        onChange={(e) => msgForm.setData('content', e.target.value)}
                                        rows={isModal ? 2 : 3}
                                        placeholder={
                                            composerRole === 'staff' ? 'Escreva a resposta…' : 'Escreva a sua mensagem…'
                                        }
                                        className="w-full rounded-xl border-zinc-300 dark:border-zinc-600"
                                    />
                                    <InputError message={msgForm.errors.content} className="mt-1" />
                                </div>
                                <PrimaryButton type="submit" disabled={msgForm.processing} className="shrink-0 sm:mb-0.5">
                                    Enviar
                                </PrimaryButton>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {(showDetails || showChat) &&
            !canManage &&
            (memberHideConversationUrl || leaderHideConversationUrl) ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 p-4 space-y-3">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">Confidencialidade</div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Se preferir não ver mais esta conversa na app, pode removê-la da sua conta. O registo pode manter-se
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
