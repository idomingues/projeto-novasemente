import { router } from '@inertiajs/react';
import axios from 'axios';
import { FormEventHandler, useCallback, useEffect, useState } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import { confirmAction } from '@/utils/confirmDialog';

export type SupportTicketChatMessage = {
    id: number;
    senderType: string;
    senderUserId: number | null;
    senderName?: string | null;
    content: string;
    createdAt: string | null;
};

type TicketSummary = {
    publicToken: string;
    typeLabel: string;
    status: string;
    message: string;
    solutionText: string | null;
    createdAt: string | null;
    closedAt: string | null;
};

interface Props {
    publicToken: string;
    /** Após enviar mensagem, o servidor redireciona para o hub pastoral com o painel de chat. */
    returnTo?: 'pastoral_hub';
    /** Esconde o texto inicial do ticket e o botão encerrar (uso em modais). */
    compact?: boolean;
}

function formatTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function SupportTicketChatPanel({ publicToken, returnTo, compact = false }: Props) {
    const [ticket, setTicket] = useState<TicketSummary | null>(null);
    const [messages, setMessages] = useState<SupportTicketChatMessage[]>([]);
    const [canChat, setCanChat] = useState(false);
    const [showMessages, setShowMessages] = useState(false);
    const [hideFromMyAppUrl, setHideFromMyAppUrl] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const { data } = await axios.get<{
                ticket: TicketSummary & { pastoralAppointmentId?: number | null };
                messages: SupportTicketChatMessage[];
                canChat: boolean;
                showMessages: boolean;
                hideFromMyAppUrl?: string | null;
            }>(route('mobile.support.ticket.messages', { token: publicToken }));
            setTicket(data.ticket);
            setMessages(data.messages);
            setCanChat(data.canChat);
            setShowMessages(data.showMessages);
            setHideFromMyAppUrl(data.hideFromMyAppUrl ?? null);
        } catch {
            setLoadError('Não foi possível carregar a conversa.');
        } finally {
            setLoading(false);
        }
    }, [publicToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const sendMessage: FormEventHandler = (e) => {
        e.preventDefault();
        const trimmed = content.trim();
        if (!trimmed) return;
        setSending(true);
        setSendError(null);
        router.post(
            route('mobile.support.messages.store', { token: publicToken }),
            {
                content: trimmed,
                return_to: returnTo ?? '',
            },
            {
                preserveScroll: true,
                onFinish: () => setSending(false),
                onSuccess: () => {
                    setContent('');
                    void load();
                },
                onError: (errs) => {
                    const c = errs.content;
                    setSendError(typeof c === 'string' ? c : 'Não foi possível enviar.');
                },
            },
        );
    };

    const isClosed = ticket && ticket.status !== 'open';

    if (loading && !ticket) {
        return <p className="text-sm text-zinc-500 py-6 text-center">A carregar conversa…</p>;
    }

    if (loadError) {
        return <p className="text-sm text-red-600 py-4 text-center">{loadError}</p>;
    }

    if (!ticket) {
        return null;
    }

    return (
        <div className="space-y-4">
            {!compact && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">{ticket.typeLabel}</div>
                    <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{ticket.message}</div>
                    {hideFromMyAppUrl ? (
                        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Pode remover este chamado da sua lista na app; a equipe mantém o registro.
                            </p>
                            <SecondaryButton
                                type="button"
                                className="mt-2 w-full justify-center border-red-200 text-red-800 hover:bg-red-50 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/30"
                                onClick={async () => {
                                    const ok = await confirmAction({
                                        title: 'Remover este chamado da sua app?',
                                        text: 'Deixa de aparecer nos seus chamados. A equipe continua a poder ver o histórico.',
                                        icon: 'warning',
                                        danger: true,
                                        confirmButtonText: 'Sim, remover da minha app',
                                        cancelButtonText: 'Cancelar',
                                    });
                                    if (!ok || !hideFromMyAppUrl) return;
                                    router.post(hideFromMyAppUrl, {}, { preserveScroll: true });
                                }}
                            >
                                Excluir conversa da minha app
                            </SecondaryButton>
                        </div>
                    ) : null}
                </div>
            )}

            {showMessages && messages.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Mensagens</div>
                    <div className="space-y-3">
                        {messages.map((m) => {
                            const isAdminMsg = m.senderType === 'admin';
                            return (
                                <div key={m.id} className={`flex ${isAdminMsg ? 'justify-start' : 'justify-end'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                            isAdminMsg
                                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                                : 'bg-brand-50 dark:bg-brand-900/30 text-zinc-900 dark:text-brand-100'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                        <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{formatTime(m.createdAt)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isClosed && ticket.solutionText && showMessages ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Resumo</div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{ticket.solutionText}</div>
                </div>
            ) : null}

            {canChat && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-start gap-2 mb-3">
                        <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Responder</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">A sua mensagem chega à equipe pastoral neste pedido.</p>
                        </div>
                    </div>
                    <form onSubmit={sendMessage} className="space-y-3">
                        <div>
                            <InputLabel value="Mensagem" />
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={compact ? 2 : 3}
                                placeholder="Escreva a sua mensagem…"
                            />
                            <InputError message={sendError ?? undefined} className="mt-1" />
                        </div>
                        <PrimaryButton type="submit" disabled={sending} className="w-full justify-center">
                            Enviar
                        </PrimaryButton>
                    </form>
                </div>
            )}
        </div>
    );
}
