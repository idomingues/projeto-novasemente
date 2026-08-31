import PastoralAppointmentEditForm, {
    type PastoralAppointmentEditShape,
} from '@/Components/PastoralAppointment/PastoralAppointmentEditForm';
import type { PastoralPastorOpt } from '@/Components/PastoralAppointment/PastoralAppointmentForm';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import Textarea from '@/Components/Textarea';
import { router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export type PastoralAppointmentChatMessage = {
    id: number;
    senderType: string;
    senderUserId: number | null;
    senderName?: string | null;
    content: string;
    createdAt: string | null;
};

export type PastoralAppointmentHubRow = PastoralAppointmentEditShape & {
    statusLabel: string;
    typeLabel: string;
    pastorName?: string | null;
    notesPreview?: string | null;
    updateUrl: string;
    createdAt: string | null;
    ticket: {
        publicToken: string;
        status: string;
        message: string;
        solutionText: string | null;
        createdAt: string | null;
        closedAt: string | null;
    } | null;
    messages: PastoralAppointmentChatMessage[];
    canChat: boolean;
    messageStoreUrl: string | null;
    editPastors: PastoralPastorOpt[];
};

function formatChatTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type Props = {
    row: PastoralAppointmentHubRow;
    fallbackPastors: PastoralPastorOpt[];
    section: 'details' | 'chat';
};

export default function PastoralAppointmentMemberPanel({ row, fallbackPastors, section }: Props) {
    const [chatContent, setChatContent] = useState('');
    const [chatError, setChatError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const submitChat: FormEventHandler = (e) => {
        e.preventDefault();
        const trimmed = chatContent.trim();
        if (!trimmed || !row.ticket) return;
        setSending(true);
        setChatError(null);
        router.post(
            route('mobile.support.messages.store', { token: row.ticket.publicToken }),
            { content: trimmed, return_to: 'pastoral_hub' },
            {
                preserveScroll: true,
                onFinish: () => setSending(false),
                onSuccess: () => setChatContent(''),
                onError: (errs) => {
                    const c = errs.content;
                    setChatError(typeof c === 'string' ? c : 'Não foi possível enviar.');
                },
            },
        );
    };

    if (section === 'details') {
        return (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <PastoralAppointmentEditForm
                    appointment={row}
                    pastors={row.editPastors.length > 0 ? row.editPastors : fallbackPastors}
                    updateUrl={row.updateUrl}
                    fieldIdPrefix={`hub_edit_${row.id}`}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {row.ticket ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Pedido original
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{row.ticket.message}</div>
                </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Conversa</div>
                {row.messages.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Ainda não há mensagens.</p>
                ) : (
                    <div className="space-y-3">
                        {row.messages.map((m) => {
                            const isAdminMsg = m.senderType === 'admin';
                            return (
                                <div key={m.id} className={`flex ${isAdminMsg ? 'justify-start' : 'justify-end'}`}>
                                    <div
                                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                            isAdminMsg
                                                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                                : 'bg-brand-50 text-zinc-900 dark:bg-brand-900/30 dark:text-brand-100'
                                        }`}
                                    >
                                        {m.content}
                                        <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {formatChatTime(m.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {row.canChat && row.ticket ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <form onSubmit={submitChat} className="space-y-3">
                        <div>
                            <InputLabel value="Responder" />
                            <Textarea
                                value={chatContent}
                                onChange={(e) => setChatContent(e.target.value)}
                                rows={3}
                                placeholder="Escreva sua mensagem…"
                            />
                            <InputError message={chatError ?? undefined} className="mt-1" />
                        </div>
                        <PrimaryButton type="submit" disabled={sending} className="w-full cursor-pointer justify-center">
                            Enviar
                        </PrimaryButton>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
