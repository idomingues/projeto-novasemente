import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import { Head, router, useForm } from '@inertiajs/react';
import { BanknotesIcon, MagnifyingGlassIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useState } from 'react';

interface DonationRow {
    id: number;
    donor_name: string;
    donor_real_name: string | null;
    campaign_title: string | null;
    campaign_id: number;
    amount: number;
    ocr_suggested_amount: number | null;
    amount_before_adjustment: number | null;
    adjustment_note: string | null;
    adjusted_at: string | null;
    adjusted_by_name: string | null;
    adjustment_history: AdjustmentHistoryEntry[];
    is_anonymous: boolean;
    confirmed_at: string;
    receipt_url: string | null;
    dispute_status: string | null;
    dispute_message: string | null;
    disputed_at: string | null;
    dispute_resolution_note: string | null;
}

interface CampaignOption {
    id: number;
    title: string;
}

interface AdjustmentHistoryEntry {
    id: number;
    amount_before: number;
    amount_after: number;
    adjustment_note: string;
    adjusted_by_name: string | null;
    created_at: string;
}

interface PaginatedDonations {
    data: DonationRow[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
}

interface Props {
    donations: PaginatedDonations;
    campaigns: CampaignOption[];
    filters: {
        search: string;
        month: string;
        campaign_id: number | null;
        disputes_only: boolean;
    };
    monthTotal: number;
    previousMonthTotal: number;
    pendingDisputesCount: number;
    canManageDonations: boolean;
}

function formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function TreasurerDashboard({
    donations,
    campaigns,
    filters,
    monthTotal,
    previousMonthTotal,
    pendingDisputesCount,
    canManageDonations,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [month, setMonth] = useState(filters.month);
    const [campaignId, setCampaignId] = useState(filters.campaign_id ? String(filters.campaign_id) : '');
    const [disputesOnly, setDisputesOnly] = useState(filters.disputes_only);

    const [adjustDonation, setAdjustDonation] = useState<DonationRow | null>(null);
    const [resolveDonation, setResolveDonation] = useState<DonationRow | null>(null);

    const adjustForm = useForm({
        amount: '',
        adjustment_note: '',
        dispute_resolution_note: '',
        resolve_dispute: true,
    });

    const resolveForm = useForm({
        dispute_resolution_note: '',
    });

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(
            route('finance.treasurer'),
            {
                search: search.trim() || undefined,
                month: month || undefined,
                campaign_id: campaignId || undefined,
                disputes_only: disputesOnly || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const openAdjust = (d: DonationRow) => {
        setAdjustDonation(d);
        adjustForm.setData({
            amount: String(d.amount),
            adjustment_note: '',
            dispute_resolution_note: '',
            resolve_dispute: d.dispute_status === 'pending',
        });
        adjustForm.clearErrors();
    };

    const submitAdjust: FormEventHandler = (e) => {
        e.preventDefault();
        if (!adjustDonation) return;
        adjustForm.patch(route('finance.donations.update', adjustDonation.id), {
            onSuccess: () => {
                setAdjustDonation(null);
                adjustForm.reset();
            },
        });
    };

    const openResolve = (d: DonationRow) => {
        setResolveDonation(d);
        resolveForm.setData({ dispute_resolution_note: '' });
        resolveForm.clearErrors();
    };

    const submitResolve: FormEventHandler = (e) => {
        e.preventDefault();
        if (!resolveDonation) return;
        resolveForm.post(route('finance.donations.resolve-dispute', resolveDonation.id), {
            onSuccess: () => {
                setResolveDonation(null);
                resolveForm.reset();
            },
        });
    };

    const monthDiff = monthTotal - previousMonthTotal;
    const monthDiffLabel =
        monthDiff >= 0
            ? `+${formatBrl(monthDiff)} em relação ao mês anterior`
            : `${formatBrl(monthDiff)} em relação ao mês anterior`;

    return (
        <AdminLayout>
            <Head title="Painel do tesoureiro" />
            <PageHeader
                title="Painel do tesoureiro"
                subtitle="Histórico de doações, ajuste de valores e reclamações dos doadores."
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Total do mês</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatBrl(monthTotal)}</p>
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{monthDiffLabel}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Mês anterior</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{formatBrl(previousMonthTotal)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Reclamações pendentes</p>
                    <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingDisputesCount}</p>
                </div>
            </div>

            <form onSubmit={applyFilters} className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <InputLabel htmlFor="search" value="Buscar por nome ou campanha" />
                        <div className="relative mt-1">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                            <TextInput
                                id="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Nome do doador, campanha..."
                                className="w-full pl-10"
                            />
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="month" value="Mês" />
                        <TextInput
                            id="month"
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="mt-1 w-full"
                        />
                    </div>
                    <div>
                        <InputLabel htmlFor="campaign_id" value="Campanha" />
                        <select
                            id="campaign_id"
                            value={campaignId}
                            onChange={(e) => setCampaignId(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="">Todas</option>
                            {campaigns.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input
                            type="checkbox"
                            checked={disputesOnly}
                            onChange={(e) => setDisputesOnly(e.target.checked)}
                        />
                        Somente reclamações pendentes
                    </label>
                    <SecondaryButton type="submit">Filtrar</SecondaryButton>
                </div>
            </form>

            {donations.data.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <BanknotesIcon className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhuma doação encontrada com os filtros atuais.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Doador</th>
                                    <th className="px-4 py-3">Campanha</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Reclamação</th>
                                    <th className="px-4 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {donations.data.map((d) => (
                                    <tr
                                        key={d.id}
                                        className={`border-b border-zinc-100 dark:border-zinc-800 ${
                                            d.dispute_status === 'pending' ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                                        }`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {new Date(d.confirmed_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.donor_name}
                                            {d.is_anonymous && d.donor_real_name && (
                                                <span className="block text-xs text-zinc-500">({d.donor_real_name})</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{d.campaign_title}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium">{formatBrl(d.amount)}</span>
                                            {d.amount_before_adjustment !== null && (
                                                <span className="block text-xs text-zinc-500">
                                                    Antes: {formatBrl(d.amount_before_adjustment)}
                                                    {d.adjusted_at && d.adjusted_by_name && (
                                                        <> · Ajustado por {d.adjusted_by_name}</>
                                                    )}
                                                </span>
                                            )}
                                            {d.adjustment_note && (
                                                <span className="block text-xs text-zinc-500 line-clamp-2" title={d.adjustment_note}>
                                                    Motivo: {d.adjustment_note}
                                                </span>
                                            )}
                                            {d.ocr_suggested_amount !== null && (
                                                <span className="block text-xs text-zinc-500">
                                                    OCR: {formatBrl(d.ocr_suggested_amount)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 max-w-xs">
                                            {d.dispute_status === 'pending' ? (
                                                <div className="space-y-1">
                                                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                                        Pendente
                                                    </span>
                                                    {d.dispute_message && (
                                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
                                                            {d.dispute_message}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : d.dispute_status === 'resolved' ? (
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400">Resolvida</span>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                {d.receipt_url && (
                                                    <a
                                                        href={d.receipt_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-brand-600 hover:underline"
                                                    >
                                                        Comprovante
                                                    </a>
                                                )}
                                                {canManageDonations && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => openAdjust(d)}
                                                            className="inline-flex items-center text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                                                        >
                                                            <PencilSquareIcon className="mr-1 h-3.5 w-3.5" />
                                                            Ajustar valor
                                                        </button>
                                                        {d.dispute_status === 'pending' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openResolve(d)}
                                                                className="text-left text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
                                                            >
                                                                Resolver reclamação
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {donations.last_page > 1 && (
                        <div className="flex flex-wrap gap-2 border-t border-zinc-200 p-4 dark:border-zinc-700">
                            {donations.links.map((link, i) =>
                                link.url ? (
                                    <button
                                        key={`${link.label}-${i}`}
                                        type="button"
                                        onClick={() => router.get(link.url!)}
                                        className={`rounded-lg px-3 py-1 text-sm ${
                                            link.active
                                                ? 'bg-brand-600 text-white'
                                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={`${link.label}-${i}`}
                                        className="rounded-lg px-3 py-1 text-sm text-zinc-400"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </div>
                    )}
                </div>
            )}

            <Modal show={adjustDonation !== null} onClose={() => setAdjustDonation(null)} maxWidth="md">
                <form onSubmit={submitAdjust} className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Ajustar valor da doação</h3>
                    {adjustDonation && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {adjustDonation.donor_name} · {adjustDonation.campaign_title} · Atual:{' '}
                            {formatBrl(adjustDonation.amount)}
                        </p>
                    )}
                    <div>
                        <InputLabel htmlFor="adjust_amount" value="Novo valor (R$)" />
                        <TextInput
                            id="adjust_amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={adjustForm.data.amount}
                            onChange={(e) => adjustForm.setData('amount', e.target.value)}
                            className="mt-1 w-full"
                            required
                        />
                    </div>
                    <div>
                        <InputLabel htmlFor="adjustment_note" value="Motivo do ajuste (obrigatório)" />
                        <textarea
                            id="adjustment_note"
                            value={adjustForm.data.adjustment_note}
                            onChange={(e) => adjustForm.setData('adjustment_note', e.target.value)}
                            rows={3}
                            minLength={10}
                            placeholder="Descreva o erro encontrado e como o valor foi conferido (mínimo 10 caracteres)."
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            required
                        />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            A justificativa fica registrada no histórico e o doador pode ver a observação em Minhas doações.
                        </p>
                        {adjustForm.errors.adjustment_note && (
                            <p className="mt-1 text-sm text-red-600">{adjustForm.errors.adjustment_note}</p>
                        )}
                    </div>
                    {adjustDonation && adjustDonation.adjustment_history.length > 0 && (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Histórico de ajustes</p>
                            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-400">
                                {adjustDonation.adjustment_history.map((entry) => (
                                    <li key={entry.id} className="border-b border-zinc-200 pb-2 last:border-0 dark:border-zinc-700">
                                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                            {formatBrl(entry.amount_before)} → {formatBrl(entry.amount_after)}
                                        </span>
                                        <span className="block text-zinc-500">
                                            {new Date(entry.created_at).toLocaleString('pt-BR')}
                                            {entry.adjusted_by_name ? ` · ${entry.adjusted_by_name}` : ''}
                                        </span>
                                        <span className="block">{entry.adjustment_note}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {adjustDonation?.dispute_status === 'pending' && (
                        <>
                            <div>
                                <InputLabel htmlFor="dispute_resolution_note" value="Resposta ao doador (opcional)" />
                                <textarea
                                    id="dispute_resolution_note"
                                    value={adjustForm.data.dispute_resolution_note}
                                    onChange={(e) => adjustForm.setData('dispute_resolution_note', e.target.value)}
                                    rows={2}
                                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={adjustForm.data.resolve_dispute}
                                    onChange={(e) => adjustForm.setData('resolve_dispute', e.target.checked)}
                                />
                                Marcar reclamação como resolvida
                            </label>
                        </>
                    )}
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setAdjustDonation(null)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={adjustForm.processing}>Salvar ajuste</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={resolveDonation !== null} onClose={() => setResolveDonation(null)} maxWidth="md">
                <form onSubmit={submitResolve} className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Resolver reclamação</h3>
                    {resolveDonation?.dispute_message && (
                        <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {resolveDonation.dispute_message}
                        </p>
                    )}
                    <div>
                        <InputLabel htmlFor="resolve_note" value="Resposta ao doador" />
                        <textarea
                            id="resolve_note"
                            value={resolveForm.data.dispute_resolution_note}
                            onChange={(e) => resolveForm.setData('dispute_resolution_note', e.target.value)}
                            rows={4}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            required
                        />
                        {resolveForm.errors.dispute_resolution_note && (
                            <p className="mt-1 text-sm text-red-600">{resolveForm.errors.dispute_resolution_note}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setResolveDonation(null)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={resolveForm.processing}>Marcar como resolvida</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
