import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Card';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type InvitationRow = {
    id: number;
    createdAt: string | null;
    ministryName: string | null;
    volunteer: { id: number; name: string | null; email: string | null; phone: string | null };
    inviteStatus: string;
    leaderStatus: string | null;
    leaderNote: string | null;
    updateUrl: string;
};

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

type HistoryRow = {
    id: number;
    fromStatus: string | null;
    toStatus: string | null;
    note: string | null;
    changedAt: string | null;
    changedBy: string | null;
};

export default function MyVolunteers() {
    const { invitations } = usePage().props as unknown as { invitations: Paginated<InvitationRow> };

    const [editingId, setEditingId] = useState<number | null>(null);
    const row = useMemo(() => invitations.data.find((x) => x.id === editingId) ?? null, [editingId, invitations.data]);
    const [tab, setTab] = useState<'status' | 'history'>('status');
    const [history, setHistory] = useState<HistoryRow[] | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const form = useForm({
        leader_status: '' as '' | 'denied' | 'training' | 'active',
        leader_note: '',
    });

    const openEdit = (r: InvitationRow) => {
        setEditingId(r.id);
        setTab('status');
        setHistory(null);
        setHistoryLoading(false);
        form.setData({
            leader_status: (r.leaderStatus as 'denied' | 'training' | 'active' | null) ?? '',
            leader_note: r.leaderNote ?? '',
        });
        form.clearErrors();
    };

    const closeEdit = () => {
        setEditingId(null);
        setTab('status');
        setHistory(null);
        setHistoryLoading(false);
        form.reset();
        form.clearErrors();
    };

    const submit = () => {
        if (!row) return;
        form.patch(row.updateUrl, { preserveScroll: true, onSuccess: () => closeEdit() });
    };

    const loadHistory = async () => {
        if (!row || historyLoading) return;
        setHistoryLoading(true);
        try {
            const r = await fetch(route('ministry-lead.my-volunteers.history', row.id), {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (!r.ok) {
                setHistory([]);
                return;
            }
            const j = (await r.json()) as { history?: HistoryRow[] };
            setHistory(Array.isArray(j.history) ? j.history : []);
        } catch {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const statusLabel = (s: string | null) => {
        if (s === 'denied') return 'Recusar';
        if (s === 'training') return 'Treinamento';
        if (s === 'active') return 'Atuante';
        return '—';
    };

    const inviteLabel = (s: string) => {
        if (s === 'accepted') return 'Aceito no link';
        if (s === 'declined') return 'Recusado no link';
        if (s === 'pending') return 'Aguardando resposta';
        return s || '—';
    };

    return (
        <AdminLayout>
            <Head title="Meus voluntários" />
            <FlashMessages />
            <PageHeader
                title="Meus voluntários"
                subtitle="Voluntários encaminhados para os seus departamentos. Atualize o status interno (Recusar/Treinamento/Atuante)."
            />

            <Card className="p-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                <th className="pb-2 pr-3 font-semibold">Voluntário</th>
                                <th className="pb-2 pr-3 font-semibold">Departamento</th>
                                <th className="pb-2 pr-3 font-semibold">Status do convite</th>
                                <th className="pb-2 pr-3 font-semibold">Status (líder)</th>
                                <th className="pb-2 font-semibold" />
                            </tr>
                        </thead>
                        <tbody>
                            {invitations.data.map((r) => (
                                <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                                    <td className="py-2 pr-3">
                                        <div className="font-medium text-zinc-900 dark:text-white">{r.volunteer.name ?? '—'}</div>
                                        <div className="text-xs text-zinc-500">{r.volunteer.email ?? ''}</div>
                                    </td>
                                    <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{r.ministryName ?? '—'}</td>
                                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">{inviteLabel(r.inviteStatus)}</td>
                                    <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{statusLabel(r.leaderStatus)}</td>
                                    <td className="py-2 text-right">
                                        <SecondaryButton type="button" onClick={() => openEdit(r)}>
                                            Alterar status
                                        </SecondaryButton>
                                    </td>
                                </tr>
                            ))}
                            {invitations.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-sm text-zinc-500">
                                        Nenhum voluntário encaminhado para os seus departamentos.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal show={!!row} onClose={closeEdit} maxWidth="lg">
                {row ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Alterar status</h2>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                    {row.volunteer.name ?? 'Voluntário'} — {row.ministryName ?? 'Departamento'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="flex gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                            <button
                                type="button"
                                onClick={() => setTab('status')}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    tab === 'status'
                                        ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                            >
                                Status
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTab('history');
                                    void loadHistory();
                                }}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    tab === 'history'
                                        ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                            >
                                Histórico
                            </button>
                        </div>

                        {tab === 'status' ? (
                            <>
                                <div>
                                    <InputLabel value="Status (líder)" />
                                    <select
                                        value={form.data.leader_status}
                                        onChange={(e) =>
                                            form.setData('leader_status', e.target.value as '' | 'denied' | 'training' | 'active')
                                        }
                                        className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                    >
                                        <option value="">—</option>
                                        <option value="denied">Recusar</option>
                                        <option value="training">Treinamento</option>
                                        <option value="active">Atuante</option>
                                    </select>
                                    <InputError message={form.errors.leader_status} className="mt-1" />
                                </div>

                                {form.data.leader_status === 'denied' ? (
                                    <div>
                                        <InputLabel value="Mensagem (obrigatória para Recusar)" />
                                        <Textarea
                                            value={form.data.leader_note}
                                            onChange={(e) => form.setData('leader_note', e.target.value)}
                                            rows={4}
                                            className="mt-2 w-full"
                                            placeholder="Escreva uma mensagem que a equipe de voluntariado possa ler…"
                                        />
                                        <InputError message={form.errors.leader_note} className="mt-1" />
                                    </div>
                                ) : null}

                                <div className="flex justify-end gap-2">
                                    <SecondaryButton type="button" onClick={closeEdit} disabled={form.processing}>
                                        Cancelar
                                    </SecondaryButton>
                                    <PrimaryButton
                                        type="button"
                                        onClick={submit}
                                        disabled={
                                            form.processing ||
                                            (form.data.leader_status === 'denied' && form.data.leader_note.trim().length < 5)
                                        }
                                    >
                                        Salvar
                                    </PrimaryButton>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                {historyLoading ? (
                                    <div className="text-sm text-zinc-500">Carregando histórico…</div>
                                ) : (history ?? []).length === 0 ? (
                                    <div className="text-sm text-zinc-500">Sem alterações registradas.</div>
                                ) : (
                                    <ul className="space-y-2 text-sm">
                                        {(history ?? []).map((h) => (
                                            <li
                                                key={h.id}
                                                className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/40"
                                            >
                                                <div className="text-xs text-zinc-500">
                                                    {(h.changedBy ?? 'Sistema') + ' · ' + (h.changedAt ? new Date(h.changedAt).toLocaleString('pt-BR') : '—')}
                                                </div>
                                                <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                                                    {statusLabel(h.fromStatus)} → {statusLabel(h.toStatus)}
                                                </div>
                                                {h.note ? (
                                                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                                                        {h.note}
                                                    </div>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </Modal>
        </AdminLayout>
    );
}

