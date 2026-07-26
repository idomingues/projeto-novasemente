import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import Textarea from '@/Components/Textarea';
import InputLabel from '@/Components/InputLabel';
import { FormEventHandler, useEffect, useState } from 'react';

type Conversation = {
    id: number;
    headerTitle: string;
    headerSubtitle: string;
    statusLabel: string;
    ministryName?: string | null;
    assigneeName?: string | null;
    lastPreview: string;
    lastActivityAt?: string | null;
    messages?: { id: number; body: string; kind: string; authorName?: string | null; isInternal?: boolean; isSystem?: boolean }[];
    events?: { id: number; type: string; actorName?: string | null; createdAt?: string | null }[];
    canClaim?: boolean;
    canReply?: boolean;
    canChat?: boolean;
};

interface Props {
    kpis: Record<string, number>;
    ministries: { id: number; name: string; openCount: number }[];
    conversations: Conversation[];
    filters: { status: string; ministry_id: number | null };
    modal: Conversation | null;
    settings: { fallback_ministry_id: number | null };
    ministryOptions: { id: number; name: string }[];
}

export default function ConversationsIndex({
    kpis,
    ministries,
    conversations,
    filters,
    modal,
    settings,
    ministryOptions,
}: Props) {
    const [open, setOpen] = useState(!!modal);
    const settingsForm = useForm({
        conversation_fallback_ministry_id: settings.fallback_ministry_id ?? '',
    });
    const msgForm = useForm({ content: '' });

    useEffect(() => {
        setOpen(!!modal);
    }, [modal?.id]);

    const closeModal = () => {
        setOpen(false);
        router.get(route('conversations.index'), { ...filters }, { preserveState: true });
    };

    const saveSettings: FormEventHandler = (e) => {
        e.preventDefault();
        settingsForm.patch(route('conversations.settings'));
    };

    return (
        <AdminLayout>
            <Head title="NS Conecta" />
            <PageHeader title="NS Conecta" subtitle="Conversas entre membros e departamentos" />

            <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                    ['Abertas', kpis.open],
                    ['Novas', kpis.new],
                    ['Sem responsável', kpis.unassigned],
                    ['Aguardando', kpis.awaiting],
                    ['Encaminhamentos', kpis.forwards],
                ].map(([label, value]) => (
                    <div key={label as string} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-xs font-medium text-zinc-500">{label}</div>
                        <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
                    </div>
                ))}
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <form onSubmit={saveSettings} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-1">
                    <h2 className="font-semibold text-zinc-900 dark:text-white">Configurações</h2>
                    <div className="mt-3 space-y-3">
                        <div>
                            <InputLabel value="Fila «Não sei com quem falar»" />
                            <SelectInput
                                className="mt-1"
                                value={settingsForm.data.conversation_fallback_ministry_id}
                                onChange={(e) => settingsForm.setData('conversation_fallback_ministry_id', e.target.value)}
                            >
                                <option value="">—</option>
                                {ministryOptions.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        <PrimaryButton type="submit" disabled={settingsForm.processing}>
                            Salvar
                        </PrimaryButton>
                    </div>
                </form>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
                    <h2 className="font-semibold">Por departamento (abertas)</h2>
                    <ul className="mt-3 space-y-1 text-sm">
                        {ministries.map((m) => (
                            <li key={m.id} className="flex justify-between">
                                <span>{m.name}</span>
                                <span className="font-semibold">{m.openCount}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
                <SelectInput
                    value={filters.status}
                    onChange={(e) =>
                        router.get(route('conversations.index'), { status: e.target.value || undefined, ministry_id: filters.ministry_id || undefined })
                    }
                >
                    <option value="">Todos os status</option>
                    <option value="new">Nova</option>
                    <option value="in_service">Em atendimento</option>
                    <option value="awaiting_member">Aguardando membro</option>
                    <option value="awaiting_department">Aguardando departamento</option>
                    <option value="forwarded">Encaminhada</option>
                </SelectInput>
                <SelectInput
                    value={filters.ministry_id ?? ''}
                    onChange={(e) =>
                        router.get(route('conversations.index'), {
                            status: filters.status || undefined,
                            ministry_id: e.target.value || undefined,
                        })
                    }
                >
                    <option value="">Todos os departamentos</option>
                    {ministryOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </SelectInput>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-800/60">
                        <tr>
                            <th className="px-4 py-3">Membro</th>
                            <th className="px-4 py-3">Assunto</th>
                            <th className="px-4 py-3">Departamento</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Responsável</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {conversations.map((c) => (
                            <tr
                                key={c.id}
                                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                onClick={() => router.get(route('conversations.index'), { ...filters, modal: c.id })}
                            >
                                <td className="px-4 py-3 font-medium">{c.headerTitle}</td>
                                <td className="px-4 py-3 max-w-xs truncate">{c.lastPreview}</td>
                                <td className="px-4 py-3">{c.ministryName}</td>
                                <td className="px-4 py-3">{c.statusLabel}</td>
                                <td className="px-4 py-3">{c.assigneeName ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal show={open && !!modal} onClose={closeModal} maxWidth="2xl" disableBodyScroll>
                {modal ? (
                    <div className="flex max-h-[80dvh] flex-col p-6">
                        <h2 className="text-lg font-semibold">{modal.headerTitle}</h2>
                        <p className="text-sm text-zinc-500">
                            {modal.headerSubtitle} · {modal.statusLabel}
                        </p>
                        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
                            {(modal.messages ?? []).map((m) => (
                                <div
                                    key={m.id}
                                    className={`rounded-lg px-3 py-2 text-sm ${
                                        m.isInternal
                                            ? 'border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                                            : m.isSystem
                                              ? 'bg-white text-center text-xs text-zinc-500 dark:bg-zinc-800'
                                              : 'bg-white dark:bg-zinc-800'
                                    }`}
                                >
                                    {m.authorName ? <div className="text-[11px] font-semibold opacity-70">{m.authorName}</div> : null}
                                    <div className="whitespace-pre-wrap">{m.body}</div>
                                </div>
                            ))}
                        </div>
                        {modal.events && modal.events.length > 0 ? (
                            <div className="mt-3 max-h-28 overflow-y-auto text-xs text-zinc-500">
                                {modal.events.map((e) => (
                                    <div key={e.id}>
                                        {e.type}
                                        {e.actorName ? ` · ${e.actorName}` : ''}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {modal.canClaim ? (
                                <PrimaryButton type="button" onClick={() => router.post(route('conversations.claim', modal.id))}>
                                    Assumir
                                </PrimaryButton>
                            ) : null}
                            <SecondaryButton type="button" onClick={closeModal}>
                                Fechar
                            </SecondaryButton>
                        </div>
                        {modal.canReply ? (
                            <form
                                className="mt-3 flex gap-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    msgForm.post(route('conversations.messages.store', modal.id), {
                                        onSuccess: () => msgForm.reset('content'),
                                    });
                                }}
                            >
                                <Textarea
                                    className="flex-1"
                                    rows={2}
                                    value={msgForm.data.content}
                                    onChange={(e) => msgForm.setData('content', e.target.value)}
                                    placeholder="Responder…"
                                />
                                <PrimaryButton type="submit" disabled={msgForm.processing}>
                                    Enviar
                                </PrimaryButton>
                            </form>
                        ) : null}
                    </div>
                ) : null}
            </Modal>
        </AdminLayout>
    );
}
