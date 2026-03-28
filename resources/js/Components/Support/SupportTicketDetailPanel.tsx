import { router, useForm } from '@inertiajs/react';
import { useEffect, useState, FormEventHandler } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { CheckCircleIcon, ChatBubbleLeftRightIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';

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
    message: string;
    solutionText: string | null;
    createdAt: string;
    closedAt: string | null;
    ownerLabel: string;
    isGuest: boolean;
};

export type SupportTicketDetailPanelProps = {
    ticket: SupportTicketShape;
    messages: SupportMessageRow[];
    supportUpdateUrl: string;
    supportDestroyUrl: string;
    supportCloseUrl: string;
    supportMessageStoreUrl: string;
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

export default function SupportTicketDetailPanel({
    ticket,
    messages,
    supportUpdateUrl,
    supportDestroyUrl,
    supportCloseUrl,
    supportMessageStoreUrl,
    canManageTickets = true,
    variant = 'page',
    section: sectionProp = 'full',
}: SupportTicketDetailPanelProps) {
    const inertiaScrollOpts = { preserveScroll: true };
    const isOpen = ticket.status === 'open';
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

    useEffect(() => {
        setEditMessage(ticket.message);
    }, [ticket.message]);

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
                            Suporte do app
                        </h1>
                    </div>
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            {ticket.status === 'open' ? 'Em andamento' : 'Encerrado'}
                        </span>
                        <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                        {ticket.typeLabel}
                        <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                        {ticket.ownerLabel}
                    </div>
                </div>
                {canManageTickets && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <SecondaryButton
                            type="button"
                            className="inline-flex items-center gap-1.5"
                            onClick={() => {
                                setEditMessage(ticket.message);
                                setShowEditModal(true);
                            }}
                        >
                            <PencilIcon className="w-4 h-4" />
                            Editar
                        </SecondaryButton>
                        {!isOpen && (
                            <SecondaryButton type="button" onClick={reopenTicket}>
                                Reabrir
                            </SecondaryButton>
                        )}
                        <SecondaryButton
                            type="button"
                            className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40"
                            onClick={deleteTicket}
                        >
                            <TrashIcon className="w-4 h-4" />
                            Excluir
                        </SecondaryButton>
                    </div>
                )}
            </div>
            )}

            {showDetails && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {isDevItem ? 'Item a desenvolver' : 'Chamado original'}
                    </div>
                    <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{ticket.message}</div>
                </div>
            </div>
            )}

            {showChat && messages.length > 0 && (ticket.isGuest || !isOpen) && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start gap-3 bg-zinc-50/80 dark:bg-zinc-800/40">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 shrink-0 text-zinc-500 dark:text-zinc-400 mt-0.5" aria-hidden />
                        <div>
                            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Conversa</div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {isOpen ? 'Histórico registado no chamado.' : 'Histórico do chamado (encerrado — só leitura).'}
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

            {showDetails && ticket.status === 'closed' && ticket.solutionText && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Solução
                    </div>
                    <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{ticket.solutionText}</div>
                </div>
            )}

            {showChat && isOpen && !ticket.isGuest && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start gap-3 bg-zinc-50/80 dark:bg-zinc-800/40">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 shrink-0 text-zinc-600 dark:text-zinc-300" aria-hidden />
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Conversa com o utilizador</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                Respostas enviadas aqui aparecem no histórico deste chamado na app (utilizador com sessão iniciada).
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
                                        A mensagem segue para o histórico do chamado; use &quot;Encerrar&quot; quando o assunto estiver tratado.
                                    </p>
                                    <Textarea
                                        value={data.content}
                                        onChange={(e) => setData('content', e.target.value)}
                                        rows={isModal ? 3 : 4}
                                        placeholder="Escreva a sua mensagem ao utilizador…"
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

            {showDetails && isOpen && ticket.isGuest && (
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

            {sectionProp === 'chat' && isOpen && ticket.isGuest && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Chat indisponível</div>
                    <div className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
                        Este chamado não tem utilizador com sessão na app. Use a aba Detalhes para encerrar com a solução.
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
                                Guardar
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
                                ? 'Descreva o que foi feito ou como ficou resolvido. Isso encerra o registo.'
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
