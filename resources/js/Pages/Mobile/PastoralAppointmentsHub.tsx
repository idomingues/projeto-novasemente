import MobileLayout from '@/Layouts/MobileLayout';
import Modal from '@/Components/Modal';
import AddButton from '@/Components/AddButton';
import PastoralAppointmentForm, { type PastoralPastorOpt } from '@/Components/PastoralAppointment/PastoralAppointmentForm';
import PastoralAppointmentEditForm, {
    type PastoralAppointmentEditShape,
} from '@/Components/PastoralAppointment/PastoralAppointmentEditForm';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { activeInactivePillClass } from '@/lib/statusBadges';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';

interface AppointmentRow {
    id: number;
    status: string;
    subject: string | null;
    notesPreview: string | null;
    preferredStart: string | null;
    preferredModality: string | null;
    pastorName: string | null;
    createdAt: string | null;
}

type ChatMessage = {
    id: number;
    senderType: string;
    senderUserId: number | null;
    senderName?: string | null;
    content: string;
    createdAt: string | null;
};

type ModalDetail = {
    appointment: PastoralAppointmentEditShape & { pastorName?: string | null; updateUrl: string; createdAt: string | null };
    ticket: {
        publicToken: string;
        status: string;
        message: string;
        solutionText: string | null;
        createdAt: string | null;
        closedAt: string | null;
    } | null;
    messages: ChatMessage[];
    canChat: boolean;
    messageStoreUrl: string | null;
} | null;

interface Props {
    appointments: AppointmentRow[];
    pastors: PastoralPastorOpt[];
    editPastors?: PastoralPastorOpt[] | null;
    storeUrl: string;
    defaultRequesterName: string;
    modalDetail: ModalDetail;
}

function statusLabel(s: string): string {
    const m: Record<string, string> = {
        pending: 'Pendente',
        confirmed: 'Confirmado',
        cancelled: 'Cancelado',
        completed: 'Concluído',
    };
    return m[s] ?? s;
}

function formatWhen(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

function modalityLabel(m: string | null): string {
    if (m === 'presential') return 'Presencial';
    if (m === 'online') return 'Online';
    return '';
}

type DetailTab = 'detalhes' | 'chat';

function formatChatTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function PastoralAppointmentsHub({
    appointments,
    pastors,
    editPastors = null,
    storeUrl,
    defaultRequesterName,
    modalDetail,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [createKey, setCreateKey] = useState(0);

    const [detailTab, setDetailTab] = useState<DetailTab>('detalhes');
    const [editKey, setEditKey] = useState(0);
    const [chatContent, setChatContent] = useState('');
    const [chatError, setChatError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const hasAnyFreeSlot = pastors.some((p) => p.slots.length > 0);

    const openCreate = () => {
        setCreateKey((k) => k + 1);
        setCreateOpen(true);
    };

    const closeDetail = () => {
        setDetailTab('detalhes');
        setChatContent('');
        setChatError(null);
        router.get(route('mobile.pastoral-appointments.request'), {}, { preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (modalDetail?.appointment?.id) {
            const params = new URLSearchParams(window.location.search);
            const painel = params.get('painel');
            setDetailTab(painel === 'chat' ? 'chat' : 'detalhes');
            setEditKey((k) => k + 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalDetail?.appointment?.id]);

    const tabBtn = (active: boolean) =>
        `flex-1 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px text-center ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    return (
        <MobileLayout>
            <Head title="Agendamentos pastor" />
            <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <Link href={route('mobile.more')} className="text-sm text-zinc-500 underline">
                            ← Mais
                        </Link>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Agendamentos pastor</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Toque num pedido para ver ou editar. Use o separador «Chat» para falar com a equipe pastoral.
                        </p>
                        {!hasAnyFreeSlot ? (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Ainda não há horários livres publicados na agenda pastoral — pode abrir «Novo pedido» para ver os
                                pastores, mas só conseguirá enviar quando existir pelo menos um horário livre para escolher.
                            </p>
                        ) : null}
                    </div>
                    <AddButton
                        onClick={openCreate}
                        title="Novo pedido de agendamento pastoral"
                    >
                        Novo pedido
                    </AddButton>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Os meus pedidos</h2>
                    {appointments.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                            Ainda não tem pedidos. Toque em + para enviar o primeiro.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {appointments.map((a) => (
                                <div
                                    key={a.id}
                                    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.get(
                                                route('mobile.pastoral-appointments.request'),
                                                { appointment: String(a.id), painel: 'detalhes' },
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="block w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={activeInactivePillClass(
                                                            a.status === 'confirmed' || a.status === 'completed',
                                                        )}
                                                    >
                                                        {statusLabel(a.status)}
                                                    </span>
                                                    <span className="text-xs text-zinc-500">{formatWhen(a.createdAt)}</span>
                                                </div>
                                                {a.pastorName ? (
                                                    <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{a.pastorName}</p>
                                                ) : null}
                                                {a.subject ? (
                                                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">{a.subject}</p>
                                                ) : null}
                                                {a.preferredStart ? (
                                                    <p className="mt-1 text-xs text-zinc-500">
                                                        Preferência: {formatWhen(a.preferredStart)}
                                                        {a.preferredModality ? ` · ${modalityLabel(a.preferredModality)}` : ''}
                                                    </p>
                                                ) : null}
                                                {a.notesPreview ? (
                                                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{a.notesPreview}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </button>
                                    <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-900/80">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.get(
                                                    route('mobile.pastoral-appointments.request'),
                                                    { appointment: String(a.id), painel: 'chat' },
                                                    { preserveScroll: true },
                                                )
                                            }
                                            className="text-xs font-semibold text-primary-600 underline dark:text-primary-400"
                                        >
                                            Chat
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.get(
                                                    route('mobile.pastoral-appointments.request'),
                                                    { appointment: String(a.id), painel: 'detalhes' },
                                                    { preserveScroll: true },
                                                )
                                            }
                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80"
                                        >
                                            <PencilSquareIcon className="h-4 w-4" aria-hidden />
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal show={createOpen} onClose={() => setCreateOpen(false)} maxWidth="2xl">
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white pr-10">Novo pedido</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Só pode enviar o pedido se existir um horário livre na agenda do pastor — escolha um dos horários listados.
                    </p>
                    {createOpen ? (
                        <div className="mt-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 p-4">
                            <PastoralAppointmentForm
                                key={createKey}
                                pastors={pastors}
                                storeUrl={storeUrl}
                                defaultRequesterName={defaultRequesterName}
                                fieldIdPrefix="hub"
                            />
                        </div>
                    ) : null}
                </div>
            </Modal>

            <Modal show={modalDetail !== null} onClose={closeDetail} maxWidth="2xl">
                {modalDetail ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white pr-10">Pedido pastoral</h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {modalDetail.appointment.pastorName ?? '—'} · {statusLabel(modalDetail.appointment.status)}
                        </p>

                        <div className="mt-4 flex border-b border-zinc-200 dark:border-zinc-800">
                            <button type="button" className={tabBtn(detailTab === 'detalhes')} onClick={() => setDetailTab('detalhes')}>
                                Detalhes
                            </button>
                            <button type="button" className={tabBtn(detailTab === 'chat')} onClick={() => setDetailTab('chat')}>
                                Chat
                            </button>
                        </div>

                        <div className="mt-5">
                            {detailTab === 'detalhes' ? (
                                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 p-4">
                                    <PastoralAppointmentEditForm
                                        key={editKey}
                                        appointment={modalDetail.appointment}
                                        pastors={editPastors ?? pastors}
                                        updateUrl={modalDetail.appointment.updateUrl}
                                        fieldIdPrefix={`hub_edit_${modalDetail.appointment.id}`}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {modalDetail.ticket ? (
                                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                                            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                                Pedido original
                                            </div>
                                            <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                                                {modalDetail.ticket.message}
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Conversa</div>
                                        {modalDetail.messages.length === 0 ? (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
                                                Ainda não há mensagens.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {modalDetail.messages.map((m) => {
                                                    const isAdminMsg = m.senderType === 'admin';
                                                    return (
                                                        <div key={m.id} className={`flex ${isAdminMsg ? 'justify-start' : 'justify-end'}`}>
                                                            <div
                                                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                                                                    isAdminMsg
                                                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                                                        : 'bg-brand-50 dark:bg-brand-900/30 text-zinc-900 dark:text-brand-100'
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

                                    {modalDetail.canChat && modalDetail.ticket ? (
                                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    const trimmed = chatContent.trim();
                                                    if (!trimmed) return;
                                                    setSending(true);
                                                    setChatError(null);
                                                    router.post(
                                                        route('mobile.support.messages.store', { token: modalDetail.ticket!.publicToken }),
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
                                                }}
                                                className="space-y-3"
                                            >
                                                <div>
                                                    <InputLabel value="Responder" />
                                                    <Textarea
                                                        value={chatContent}
                                                        onChange={(e) => setChatContent(e.target.value)}
                                                        rows={3}
                                                        placeholder="Escreva a sua mensagem…"
                                                    />
                                                    <InputError message={chatError ?? undefined} className="mt-1" />
                                                </div>
                                                <PrimaryButton type="submit" disabled={sending} className="w-full justify-center">
                                                    Enviar
                                                </PrimaryButton>
                                            </form>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
                                onClick={closeDetail}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </MobileLayout>
    );
}
