import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useState, FormEventHandler } from 'react';
import { CheckCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';

type ChatMessage = {
    id: number;
    senderType: 'admin' | 'user' | string;
    senderUserId: number | null;
    senderName?: string | null;
    content: string;
    createdAt: string;
};

interface Ticket {
    publicToken: string;
    typeLabel: string;
    status: string;
    message: string;
    solutionText: string | null;
    createdAt: string;
    closedAt: string | null;
}

interface Props {
    ticket: Ticket;
    messages: ChatMessage[];
    canChat: boolean;
    showMessages: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function MobileSupportTicket({ ticket, messages, canChat, showMessages, isAdmin }: Props) {
    const inertiaScrollOpts = { preserveScroll: true };

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        content: '',
        solution_text: '',
    });

    const [showCloseModal, setShowCloseModal] = useState(false);

    useEffect(() => {
        if (!showCloseModal) {
            setData('solution_text', '');
        }
    }, [showCloseModal]);

    const isClosed = ticket.status !== 'open';

    const sendMessage: FormEventHandler = (e) => {
        e.preventDefault();
        if (!data.content.trim()) return;
        post(route('mobile.support.messages.store', { token: ticket.publicToken }), {
            onSuccess: () => {
                reset('content');
            },
            ...inertiaScrollOpts,
        });
    };

    const closeTicket = () => {
        patch(route('mobile.support.close', { token: ticket.publicToken }), {
            onSuccess: () => setShowCloseModal(false),
            ...inertiaScrollOpts,
        });
    };

    return (
        <MobileLayout>
            <Head title={`Suporte do app — ${ticket.typeLabel}`} />
            <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-white">{ticket.typeLabel}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {isClosed ? 'Encerrado' : 'Em andamento'}
                                {ticket.closedAt ? ` · ${formatTime(ticket.closedAt)}` : ''}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            {isClosed ? <span className="inline-flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" /> Concluído</span> : 'Aberto'}
                        </div>
                    </div>

                    <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">
                        {ticket.message}
                    </div>
                </div>

                {showMessages && messages.length > 0 && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                            Conversa
                        </div>
                        <div className="space-y-3">
                            {messages.map((m) => {
                                const isAdminMsg = m.senderType === 'admin';
                                // No app mobile, o usuário é sempre "user" e o admin é "admin".
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

                {!showMessages && ticket.status !== 'open' && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Solução</div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">
                            {ticket.solutionText ?? 'Solução não informada.'}
                        </div>
                    </div>
                )}

                {!isClosed && !canChat && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
                        Este chamado está em andamento. Para enviar respostas, faça login na conta do voluntário.
                    </div>
                )}

                {ticket.status === 'closed' && ticket.solutionText && showMessages && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Solução</div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{ticket.solutionText}</div>
                    </div>
                )}

                {canChat && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                        <form onSubmit={sendMessage} className="space-y-3">
                            <div>
                                <InputLabel value="Responder" />
                                <Textarea
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    rows={3}
                                    placeholder={isAdmin ? 'Digite sua resposta...' : 'Digite sua resposta...'}
                                />
                                <InputError message={errors.content} className="mt-1" />
                            </div>
                            <div className="flex gap-2">
                                <PrimaryButton type="submit" disabled={processing} className="flex-1">
                                    Enviar
                                </PrimaryButton>
                                <SecondaryButton type="button" onClick={() => setShowCloseModal(true)}>
                                    Encerrar
                                </SecondaryButton>
                            </div>
                        </form>
                    </div>
                )}

                {showCloseModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
                        <div className="w-full max-w-xl rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4">
                            <div className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                                Encerrar chamado
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                {isAdmin ? 'Informe a solução para encerrar.' : 'Encerrar sem solução (se necessário, peça à equipe que detalhe).' }
                            </div>
                            {isAdmin && (
                                <div>
                                    <InputLabel value="Solução" />
                                    <Textarea
                                        value={data.solution_text}
                                        onChange={(e) => setData('solution_text', e.target.value)}
                                        rows={4}
                                        placeholder="Descreva a solução para o caso..."
                                    />
                                    <InputError message={errors.solution_text} className="mt-1" />
                                </div>
                            )}
                            {!isAdmin && (
                                <div>
                                    <InputLabel value="Observação (opcional)" />
                                    <Textarea
                                        value={data.solution_text}
                                        onChange={(e) => setData('solution_text', e.target.value)}
                                        rows={3}
                                        placeholder="Se quiser, deixe uma observação..."
                                    />
                                </div>
                            )}
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
        </MobileLayout>
    );
}

