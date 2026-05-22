import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import Textarea from '@/Components/Textarea';
import { volunteerLeaderStatusLabel } from '@/lib/volunteerLeaderStatusLabels';
import { router, useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export type MinistryStatusHistoryRow = {
    id: number;
    fromStatus: string | null;
    toStatus: string | null;
    fromStatusLabel?: string;
    toStatusLabel?: string;
    note: string | null;
    changedAt: string | null;
    changedBy: string | null;
};

export type MinistryLeaderStatusSectionData = {
    ministryId: number;
    ministryName: string;
    isAttached?: boolean;
    canEdit?: boolean;
    currentLeaderStatus: string | null;
    currentLeaderNote?: string | null;
    currentLeaderStatusLabel?: string;
    updateLeaderStatusUrl?: string | null;
    history: MinistryStatusHistoryRow[];
};

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

export default function MinistryLeaderStatusSection({
    section,
    onSaved,
}: {
    section: MinistryLeaderStatusSectionData;
    onSaved: () => void;
}) {
    const form = useForm({
        leader_status: (section.currentLeaderStatus as '' | 'denied' | 'training' | 'active' | null) ?? '',
        leader_note: section.currentLeaderNote ?? '',
    });

    useEffect(() => {
        form.setData({
            leader_status: (section.currentLeaderStatus as '' | 'denied' | 'training' | 'active' | null) ?? '',
            leader_note: section.currentLeaderNote ?? '',
        });
        form.clearErrors();
    }, [section.ministryId, section.currentLeaderStatus, section.currentLeaderNote]);

    const submit = () => {
        if (!section.updateLeaderStatusUrl) return;
        form.patch(section.updateLeaderStatusUrl, {
            preserveScroll: true,
            onSuccess: () => {
                form.clearErrors();
                onSaved();
            },
        });
    };

    return (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{section.ministryName}</h3>
                <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        section.currentLeaderStatus === 'denied'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                            : section.currentLeaderStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                              : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                    }`}
                >
                    {section.currentLeaderStatusLabel ?? volunteerLeaderStatusLabel(section.currentLeaderStatus)}
                </span>
            </div>

            <div className="space-y-4 p-3">
                {section.canEdit && section.updateLeaderStatusUrl ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                            Status do líder neste departamento (treinamento, atuante ou recusa).
                        </p>
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
                                <option value="denied">Recusado pelo líder</option>
                                <option value="training">Treinamento</option>
                                <option value="active">Atuante</option>
                            </select>
                            <InputError message={form.errors.leader_status} className="mt-1" />
                        </div>

                        {form.data.leader_status === 'denied' ? (
                            <div className="mt-3">
                                <InputLabel value="Mensagem (obrigatória para recusar)" />
                                <Textarea
                                    value={form.data.leader_note}
                                    onChange={(e) => form.setData('leader_note', e.target.value)}
                                    rows={3}
                                    className="mt-1 w-full"
                                    placeholder="Motivo da recusa…"
                                />
                                <InputError message={form.errors.leader_note} className="mt-1" />
                            </div>
                        ) : null}

                        <div className="mt-3 flex justify-end">
                            <PrimaryButton
                                type="button"
                                disabled={
                                    form.processing ||
                                    (form.data.leader_status === 'denied' && form.data.leader_note.trim().length < 5)
                                }
                                onClick={submit}
                            >
                                {form.processing ? 'Salvando…' : 'Salvar status'}
                            </PrimaryButton>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {section.isAttached === false
                            ? 'Sem vínculo ativo neste departamento — apenas histórico.'
                            : 'Sem permissão para alterar o status neste departamento.'}
                    </p>
                )}

                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Histórico de alterações
                    </p>
                    <ul className="max-h-[min(28vh,200px)] space-y-2 overflow-y-auto text-sm">
                        {section.history.length === 0 ? (
                            <li className="text-zinc-500">Sem alterações registradas.</li>
                        ) : (
                            section.history.map((h) => (
                                <li
                                    key={h.id}
                                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                                >
                                    <div className="text-xs text-zinc-500">
                                        {(h.changedBy ?? 'Sistema') + ' · ' + formatDateTime(h.changedAt)}
                                    </div>
                                    <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                                        {(h.fromStatusLabel ?? volunteerLeaderStatusLabel(h.fromStatus)) +
                                            ' → ' +
                                            (h.toStatusLabel ?? volunteerLeaderStatusLabel(h.toStatus))}
                                    </div>
                                    {h.note ? (
                                        <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                                            {h.note}
                                        </div>
                                    ) : null}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </section>
    );
}
