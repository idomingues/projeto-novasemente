import { router, useForm } from '@inertiajs/react';
import { useEffect, useState, FormEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { CheckCircleIcon, ChatBubbleLeftRightIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import { CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE } from '@/constants/chatEmailNotice';

export type SupportMessageRow = {
    id: number;
    senderType: string;
    senderUserId: number | null;
    senderName?: string | null;
    content: string;
    createdAt: string;
};

export type SupportTicketShape = {
    publicToken: string;
    type?: string;
    typeLabel: string;
    status: string;
    statusLabel?: string;
    message: string;
    screenshotUrl?: string | null;
    screenshotExternalUrl?: string | null;
    solutionText: string | null;
    forecastAt?: string | null;
    createdAt: string;
    closedAt: string | null;
    ownerLabel: string;
    isGuest: boolean;
    /** Agendamento pastoral sem conta na app: equipe pode usar o chat no backoffice. */
    allowStaffInternalChat?: boolean;
};

export type SupportTicketDetailPanelProps = {
    ticket: SupportTicketShape;
    messages: SupportMessageRow[];
    supportUpdateUrl: string;
    supportDestroyUrl: string;
    supportCloseUrl: string;
    supportMessageStoreUrl: string;
    statusOptions?: Array<{ value: string; label: string }>;
    /** Responder, editar, excluir e encerrar (painel admin). Por omissão: true. */
    canManageTickets?: boolean;
    variant?: 'page' | 'modal';
    /** `details` / `chat`: só uma parte (modais com abas). `full`: página completa. */
    section?: 'full' | 'details' | 'chat';
};

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatForecastDate(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function statusVisual(status: string): string {
    switch (status) {
        case 'waiting_user':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
        case 'resolved':
        case 'closed':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
        case 'in_progress':
            return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
        default:
            return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
    }
}

export default function SupportTicketDetailPanel({
    ticket,
    messages,
    supportUpdateUrl,
    supportDestroyUrl,
    supportCloseUrl,
    supportMessageStoreUrl,
    statusOptions = [],
    canManageTickets = true,
    variant = 'page',
    section: sectionProp = 'full',
}: SupportTicketDetailPanelProps) {
    const inertiaScrollOpts = { preserveScroll: true };
    const isOpen = ['open', 'in_progress', 'waiting_user'].includes(ticket.status);
    const internalCoordination = ticket.allowStaffInternalChat === true;
    const guestNoAppUser = ticket.isGuest && !internalCoordination;
    const isModal = variant === 'modal';
    const showDetails = sectionProp === 'full' || sectionProp === 'details';
    const showChat = sectionProp === 'full' || sectionProp === 'chat';

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        content: '',
        solution_text: '',
    });

    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editMessage, setEditMessage] = useState(ticket.message);
    const [statusValue, setStatusValue] = useState(ticket.status);
    const [statusSolution, setStatusSolution] = useState(ticket.solutionText ?? '');
    const [forecastValue, setForecastValue] = useState(ticket.forecastAt ?? '');

    useEffect(() => {
        setEditMessage(ticket.message);
    }, [ticket.message]);

    useEffect(() => {
        setStatusValue(ticket.status);
    }, [ticket.status]);

    useEffect(() => {
        setStatusSolution(ticket.solutionText ?? '');
    }, [ticket.solutionText]);

    useEffect(() => {
        setForecastValue(ticket.forecastAt ?? '');
    }, [ticket.forecastAt]);

    useEffect(() => {
        if (!showCloseModal) {
            setData('solution_text', '');
        }
    }, [showCloseModal]);

    const sendMessage: FormEventHandler = (e) => {
        e.preventDefault();
        if (!data.content.trim()) return;
        post(supportMessageStoreUrl, {
            onSuccess: () => reset('content'),
            ...inertiaScrollOpts,
        });
    };

    const closeTicket = () => {
        patch(supportCloseUrl, {
            onSuccess: () => setShowCloseModal(false),
            ...inertiaScrollOpts,
        });
    };

    const reopenTicket = async () => {
        const ok = await confirmAction({
            title: 'Reabrir chamado?',
            text: 'O texto de solução será limpo.',
            confirmButtonText: 'Reabrir',
            icon: 'question',
        });
        if (!ok) return;
        router.patch(supportUpdateUrl, { status: 'open' }, inertiaScrollOpts);
    };

    const saveEdit = () => {
        const trimmed = editMessage.trim();
        if (!trimmed) return;
        router.patch(supportUpdateUrl, { message: trimmed }, {
            ...inertiaScrollOpts,
            onSuccess: () => setShowEditModal(false),
        });
    };

    const saveStatus = () => {
        if (!statusValue || statusValue === ticket.status) return;
        router.patch(
            supportUpdateUrl,
            { status: statusValue, solution_text: statusSolution },
            inertiaScrollOpts,
        );
    };

    const saveForecast = () => {
        const normalized = forecastValue.trim();
        const current = ticket.forecastAt ?? '';
        if (normalized === current) return;
        router.patch(
            supportUpdateUrl,
            { forecast_at: normalized !== '' ? normalized : null },
            inertiaScrollOpts,
        );
    };

    const saveSolutionDraft = () => {
        const trimmed = statusSolution.trim();
        const current = (ticket.solutionText ?? '').trim();
        if (trimmed === current) return;
        router.patch(supportUpdateUrl, { solution_text: trimmed }, inertiaScrollOpts);
    };

    const statusWillFinalize = ['resolved', 'closed'].includes(statusValue);
    const forecastDirty = forecastValue.trim() !== (ticket.forecastAt ?? '');

    const deleteTicket = async () => {
        const ok = await confirmAction({
            title: 'Excluir chamado?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (!ok) return;
        router.delete(supportDestroyUrl);
    };

    const isDevItem = ticket.type === 'development';

    const overlayZ = isModal ? 'z-[200]' : 'z-[100]';

    return (
        <div className={`space-y-6 ${isModal ? 'pb-1' : ''}`}>
            {showDetails && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <ChatBubbleLeftRightIcon
                            className={`shrink-0 text-zinc-400 dark:text-zinc-500 ${isModal ? 'w-6 h-6' : 'w-7 h-7'}`}
                            aria-hidden
                        />
                        <h1
                            className={`font-bold text-zinc-900 dark:text-white truncate ${isModal ? 'text-lg sm:text-xl' : 'text-2xl'}`}
                        >
                            {isModal ? ticket.typeLabel : 'Suporte do app'}
                        </h1>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusVisual(ticket.status)}`}>
                            {ticket.statusLabel ?? (ticket.status === 'open' ? 'Em andamento' : 'Encerrado')}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">{ticket.ownerLabel}</span>
                        {isModal ? null : (
                            <>
                                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                <span>{ticket.typeLabel}</span>
                            </>
                        )}
                    </div>
                </div>
                {canManageTickets && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <SecondaryButton
                            type="button"
                            className={`inline-flex items-center gap-1.5 ${isModal ? 'h-10 px-4 text-xs uppercase tracking-wide' : ''}`}
                            onClick={() => {
                                setEditMessage(ticket.message);
                                setShowEditModal(true);
                            }}
                        >
                            <PencilIcon className="w-4 h-4" />
                            Editar
                        </SecondaryButton>
                        {!isOpen && (
                            <SecondaryButton
                                type="button"
                                className={isModal ? 'h-10 px-4 text-xs uppercase tracking-wide' : ''}
                                onClick={() => void reopenTicket()}
                            >
                                Reabrir
                            </SecondaryButton>
                        )}
                        <SecondaryButton
                            type="button"
                            className={`inline-flex items-center gap-1.5 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 ${isModal ? 'h-10 px-4 text-xs uppercase tracking-wide' : ''}`}
                            onClick={() => void deleteTicket()}
                        >
                            <TrashIcon className="w-4 h-4" />
                            Excluir
                        </SecondaryButton>
                    </div>
                )}
            </div>
            )}

            {showDetails && (
            <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:grid-cols-2">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tipo</div>
                    <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{ticket.typeLabel}</div>
                </div>
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Usuário</div>
                    <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{ticket.ownerLabel}</div>
                </div>
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Criado em</div>
                    <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDate(ticket.createdAt)}</div>
                </div>
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Status</div>
                    <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {ticket.statusLabel ?? (ticket.status === 'open' ? 'Em andamento' : 'Encerrado')}
                    </div>
                </div>
                {ticket.forecastAt ? (
                    <div className="sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Previsão</div>
                        <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {formatForecastDate(ticket.forecastAt)}
                        </div>
                    </div>
                ) : null}
            </div>
            )}

            {showDetails && canManageTickets && isOpen && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <InputLabel value="Previsão de atendimento (opcional)" />
                            <input
                                type="date"
                                value={forecastValue}
                                onChange={(e) => setForecastValue(e.target.value)}
                                className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Ao salvar uma data, o usuário recebe aviso na caixa de entrada.
                            </p>
                        </div>
                        <PrimaryButton type="button" onClick={saveForecast} disabled={!forecastDirty}>
                            Salvar previsão
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {showDetails && canManageTickets && isOpen && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <InputLabel value="Solução" />
                    <Textarea
                        value={statusSolution}
                        onChange={(e) => setStatusSolution(e.target.value)}
                        rows={4}
                        className="mt-1 w-full"
                        placeholder="Descreva a solução (obrigatória ao finalizar o chamado)..."
                    />
                    <div className="mt-3 flex justify-end">
                        <PrimaryButton
                            type="button"
                            onClick={saveSolutionDraft}
                            disabled={statusSolution.trim() === (ticket.solutionText ?? '').trim()}
                        >
                            Salvar solução
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {showDetails && canManageTickets && statusOptions.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <InputLabel value="Alterar status" />
                            <select
                                value={statusValue}
                                onChange={(e) => setStatusValue(e.target.value)}
                                className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            >
                                {statusOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {statusWillFinalize ? (
                                <div className="mt-3">
                                    <InputLabel value="Solução da demanda *" />
                                    <Textarea
                                        value={statusSolution}
                                        onChange={(e) => setStatusSolution(e.target.value)}
                                        rows={4}
                                        className="mt-1 w-full"
                                        placeholder="Descreva a solução aplicada para o usuário..."
                                    />
                                    <InputError message={errors.solution_text} className="mt-1" />
                                </div>
                            ) : null}
                        </div>
                        <PrimaryButton
                            type="button"
                            onClick={saveStatus}
                            disabled={statusValue === ticket.status || (statusWillFinalize && statusSolution.trim() === '')}
                        >
                            Salvar status
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {showDetails && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {isDevItem ? 'Item a desenvolver' : 'Chamado original'}
                    </div>
                    <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{ticket.message}</div>
                </div>
            </div>
            )}

            {showDetails && (ticket.screenshotUrl || ticket.screenshotExternalUrl) && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Print anexado</div>
                    {ticket.screenshotUrl ? (
                        <a href={ticket.screenshotUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                            <img
                                src={ticket.screenshotUrl}
                                alt="Print anexado ao chamado"
                                className="max-h-72 w-auto rounded-xl border border-zinc-200 object-contain dark:border-zinc-700"
                            />
                        </a>
                    ) : null}
                    {ticket.screenshotExternalUrl ? (
                        <a
                            href={ticket.screenshotExternalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-sm font-medium text-brand-700 underline dark:text-brand-300"
                        >
                            Abrir link do print
                        </a>
                    ) : null}
                </div>
            )}

            {showChat && messages.length > 0 && (guestNoAppUser || !isOpen) && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start gap-3 bg-zinc-50/80 dark:bg-zinc-800/40">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 shrink-0 text-zinc-500 dark:text-zinc-400 mt-0.5" aria-hidden />
                        <div>
                            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Conversa</div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {isOpen ? 'Histórico registrado no chamado.' : 'Histórico do chamado (encerrado — só leitura).'}
                            </p>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {messages.map((m) => {
                            const isAdmin = m.senderType === 'admin';
                            return (
                                <div key={m.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                                            isAdmin
                                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                                : 'bg-brand-50 dark:bg-brand-900/30 text-zinc-900 dark:text-brand-100'
                                        }`}
                                    >
                                        {m.content}
                                        <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {formatTime(m.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showDetails && ['resolved', 'closed'].includes(ticket.status) && ticket.solutionText && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Solução
                    </div>
                    <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{ticket.solutionText}</div>
                </div>
            )}

            {showChat && isOpen && (!ticket.isGuest || internalCoordination) && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start gap-3 bg-zinc-50/80 dark:bg-zinc-800/40">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 shrink-0 text-zinc-600 dark:text-zinc-300" aria-hidden />
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                                {internalCoordination ? 'Coordenação interna' : 'Conversa com o usuário'}
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {internalCoordination
                                    ? 'O pedido não tem conta na app; use este espaço para alinhar entre a equipe pastoral e secretaria.'
                                    : `Respostas enviadas aqui aparecem no histórico deste chamado na app (usuário com sessão iniciada). ${CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE}`}
                            </p>
                        </div>
                    </div>

                    <div className="p-4">
                        {messages.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-4 text-center">
                                Ainda não há mensagens. Escreva na caixa abaixo para enviar a primeira resposta.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {messages.map((m) => {
                                    const isAdmin = m.senderType === 'admin';
                                    return (
                                        <div key={m.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                                                    isAdmin
                                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                                        : 'bg-brand-50 dark:bg-brand-900/30 text-zinc-900 dark:text-brand-100'
                                                }`}
                                            >
                                                {m.content}
                                                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                    {formatTime(m.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {canManageTickets && (
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
                            <form onSubmit={sendMessage} className="space-y-3">
                                <div>
                                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Escrever resposta</div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-2">
                                        A mensagem segue para o histórico do chamado; use «Encerrar» quando o assunto estiver tratado.
                                    </p>
                                    <Textarea
                                        value={data.content}
                                        onChange={(e) => setData('content', e.target.value)}
                                        rows={isModal ? 3 : 4}
                                        placeholder={
                                            internalCoordination
                                                ? 'Escreva uma nota à equipe…'
                                                : 'Escreva a sua mensagem ao usuário…'
                                        }
                                        className="w-full"
                                    />
                                    <InputError message={errors.content} className="mt-1" />
                                </div>
                                <div className="flex flex-row flex-nowrap items-center justify-end gap-2 pt-1">
                                    <SecondaryButton
                                        type="button"
                                        className="h-9 shrink-0 px-3 text-xs tracking-wide"
                                        onClick={() => setShowCloseModal(true)}
                                    >
                                        Encerrar chamado
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" disabled={processing} className="h-9 shrink-0 px-4 text-xs tracking-wide">
                                        Enviar resposta
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {showDetails && isOpen && guestNoAppUser && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Chamado sem usuário logado</div>
                    <div className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
                        O chat fica indisponível. Descreva a solução e encerre o chamado.
                    </div>
                    {canManageTickets && (
                        <div className="mt-4 flex justify-end">
                            <SecondaryButton type="button" onClick={() => setShowCloseModal(true)}>
                                Encerrar
                            </SecondaryButton>
                        </div>
                    )}
                </div>
            )}

            {sectionProp === 'chat' && isOpen && guestNoAppUser && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Chat indisponível</div>
                    <div className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
                        Este chamado não tem usuário com sessão na app. Use a aba Detalhes para encerrar com a solução.
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className={`fixed inset-0 ${overlayZ} flex items-end justify-center bg-black/40 sm:items-center sm:p-4`}>
                    <div className="w-full max-w-xl rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-xl">
                        <div className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Editar descrição</div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Altere o texto do chamado ou do item interno.</p>
                        <Textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={8} className="w-full" />
                        <div className="mt-4 flex gap-2">
                            <SecondaryButton type="button" className="flex-1" onClick={() => setShowEditModal(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="button" className="flex-1" onClick={saveEdit}>
                                Salvar
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            )}

            {showCloseModal && (
                <div className={`fixed inset-0 ${overlayZ} flex items-end justify-center bg-black/30`}>
                    <div className="w-full max-w-xl rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4">
                        <div className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Encerrar chamado</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                            {isDevItem
                                ? 'Descreva o que foi feito ou como ficou resolvido. Isso encerra o registro.'
                                : 'Informe a solução para o usuário. Isso encerra o chat.'}
                        </div>

                        <div>
                            <InputLabel value="Solução" />
                            <Textarea
                                value={data.solution_text}
                                onChange={(e) => setData('solution_text', e.target.value)}
                                rows={6}
                                placeholder="Descreva como resolver..."
                            />
                            <InputError message={errors.solution_text} className="mt-1" />
                        </div>

                        <div className="mt-4 flex gap-2">
                            <SecondaryButton type="button" className="flex-1" onClick={() => setShowCloseModal(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="button" className="flex-1" onClick={closeTicket} disabled={processing}>
                                Encerrar
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
