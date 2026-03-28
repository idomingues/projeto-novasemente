import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import Textarea from '@/Components/Textarea';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export type SolicitationMessageRow = {
    id: number;
    senderType: string;
    senderName?: string | null;
    content: string;
    createdAt: string;
};

export type SolicitationDetailShape = {
    id: number;
    typeLabel: string;
    status: string;
    statusLabel: string;
    message: string;
    meta: Record<string, unknown> | null;
    internalNotes?: string | null;
    memberLabel?: string;
    preferredDate?: string | null;
    assignedPastorId?: number | null;
    assignedVolunteerId?: number | null;
    assignedPastorName?: string | null;
    assignedVolunteerName?: string | null;
    createdAt: string;
    completedAt: string | null;
};

export type AssignmentOptions = {
    pastors: Array<{ value: number; label: string }>;
    volunteers: Array<{ value: number; label: string }>;
};

export type SolicitationDetailPanelProps = {
    solicitation: SolicitationDetailShape;
    messages: SolicitationMessageRow[];
    updateUrl?: string;
    messageStoreUrl: string;
    canManage?: boolean;
    assignmentOptions?: AssignmentOptions | null;
    /** Staff com permissão de ver inbox pode responder no chat (não exige manage). */
    staffCanReply?: boolean;
    canChat: boolean;
    variant?: 'page' | 'modal';
    section?: 'full' | 'details' | 'chat';
    /** Quem envia mensagem neste formulário */
    composerRole: 'staff' | 'member';
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
    assignmentOptions = null,
}: SolicitationDetailPanelProps) {
    const inertiaScrollOpts = { preserveScroll: true };
    const isModal = variant === 'modal';
    const showDetails = sectionProp === 'full' || sectionProp === 'details';
    const showChat = sectionProp === 'full' || sectionProp === 'chat';

    const msgForm = useForm({ content: '' });
    const adminForm = useForm({
        status: solicitation.status,
        internal_notes: solicitation.internalNotes ?? '',
        preferred_date: solicitation.preferredDate ?? '',
        assigned_pastor_id:
            solicitation.assignedPastorId != null ? String(solicitation.assignedPastorId) : '',
        assigned_volunteer_id:
            solicitation.assignedVolunteerId != null ? String(solicitation.assignedVolunteerId) : '',
    });

    useEffect(() => {
        adminForm.setData({
            status: solicitation.status,
            internal_notes: solicitation.internalNotes ?? '',
            preferred_date: solicitation.preferredDate ?? '',
            assigned_pastor_id:
                solicitation.assignedPastorId != null ? String(solicitation.assignedPastorId) : '',
            assigned_volunteer_id:
                solicitation.assignedVolunteerId != null ? String(solicitation.assignedVolunteerId) : '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sincronizar quando abrimos outro pedido
    }, [solicitation.id]);

    const sendMessage: FormEventHandler = (e) => {
        e.preventDefault();
        if (!msgForm.data.content.trim()) return;
        msgForm.post(messageStoreUrl, {
            onSuccess: () => msgForm.reset('content'),
            ...inertiaScrollOpts,
        });
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

            {showDetails && canManage && updateUrl && (
                <form onSubmit={saveAdmin} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-4">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">Gestão (equipa)</div>
                    <div>
                        <InputLabel htmlFor="sol_status" value="Estado" />
                        <select
                            id="sol_status"
                            value={adminForm.data.status}
                            onChange={(e) => adminForm.setData('status', e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                        >
                            <option value="pending">Pendente</option>
                            <option value="in_progress">Em tratamento</option>
                            <option value="completed">Concluído</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
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
                    {assignmentOptions && (
                        <>
                            <div>
                                <InputLabel htmlFor="sol_pref_date" value="Data (preferida ou agendada)" />
                                <input
                                    id="sol_pref_date"
                                    type="date"
                                    value={adminForm.data.preferred_date}
                                    onChange={(e) => adminForm.setData('preferred_date', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                                />
                                <InputError message={adminForm.errors.preferred_date} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="sol_pastor" value="Pastor associado (opcional)" />
                                <select
                                    id="sol_pastor"
                                    value={adminForm.data.assigned_pastor_id}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        adminForm.setData((data) => ({
                                            ...data,
                                            assigned_pastor_id: v,
                                            assigned_volunteer_id: v ? '' : data.assigned_volunteer_id,
                                        }));
                                    }}
                                    className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                                >
                                    <option value="">— Nenhum —</option>
                                    {assignmentOptions.pastors.map((o) => (
                                        <option key={o.value} value={String(o.value)}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={adminForm.errors.assigned_pastor_id} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="sol_volunteer" value="Voluntário associado (opcional)" />
                                <select
                                    id="sol_volunteer"
                                    value={adminForm.data.assigned_volunteer_id}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        adminForm.setData((data) => ({
                                            ...data,
                                            assigned_volunteer_id: v,
                                            assigned_pastor_id: v ? '' : data.assigned_pastor_id,
                                        }));
                                    }}
                                    className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                                >
                                    <option value="">— Nenhum —</option>
                                    {assignmentOptions.volunteers.map((o) => (
                                        <option key={o.value} value={String(o.value)}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={adminForm.errors.assigned_volunteer_id} className="mt-1" />
                            </div>
                        </>
                    )}
                    <div className="flex justify-end">
                        <PrimaryButton type="submit" disabled={adminForm.processing}>
                            Guardar
                        </PrimaryButton>
                    </div>
                </form>
            )}

            {showChat && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start gap-3 bg-zinc-50/80 dark:bg-zinc-800/40">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 shrink-0 text-zinc-600 dark:text-zinc-300" aria-hidden />
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Conversa</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {canChat
                                    ? 'Mensagens entre a igreja e o membro sobre este pedido.'
                                    : 'Pedido encerrado — conversa só leitura.'}
                            </p>
                        </div>
                    </div>

                    <div className="p-4">
                        {messages.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                                Ainda não há mensagens nesta conversa.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {messages.map((m) => {
                                    const staff = isStaffBubble(m.senderType);
                                    return (
                                        <div key={m.id} className={`flex ${staff ? 'justify-start' : 'justify-end'}`}>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                                                    staff
                                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                                        : 'bg-brand-50 dark:bg-brand-900/30 text-zinc-900 dark:text-brand-100'
                                                }`}
                                            >
                                                {staff && (
                                                    <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                                                        Igreja
                                                    </div>
                                                )}
                                                {!staff && (
                                                    <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                                                        {m.senderName ?? 'Membro'}
                                                    </div>
                                                )}
                                                {m.content}
                                                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{formatTime(m.createdAt)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {canChat && (composerRole === 'member' || (composerRole === 'staff' && staffCanReply)) && (
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
                            <form onSubmit={sendMessage} className="space-y-3">
                                <div>
                                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                        {composerRole === 'staff' ? 'Responder como igreja' : 'A sua mensagem'}
                                    </div>
                                    <Textarea
                                        value={msgForm.data.content}
                                        onChange={(e) => msgForm.setData('content', e.target.value)}
                                        rows={isModal ? 3 : 4}
                                        placeholder={
                                            composerRole === 'staff'
                                                ? 'Escreva a resposta ao membro…'
                                                : 'Escreva a sua mensagem…'
                                        }
                                        className="w-full mt-2"
                                    />
                                    <InputError message={msgForm.errors.content} className="mt-1" />
                                </div>
                                <div className="flex justify-end">
                                    <PrimaryButton type="submit" disabled={msgForm.processing}>
                                        Enviar
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
