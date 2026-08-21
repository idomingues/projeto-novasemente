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
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

interface DonationRow {
    id: number;
    entry_type: 'money' | 'item';
    donor_name: string;
    donor_real_name: string | null;
    campaign_title: string | null;
    campaign_id: number;
    amount?: number;
    ocr_suggested_amount?: number | null;
    amount_before_adjustment?: number | null;
    adjustment_note?: string | null;
    adjusted_at?: string | null;
    adjusted_by_name?: string | null;
    adjustment_history: AdjustmentHistoryEntry[];
    is_anonymous: boolean;
    confirmed_at: string;
    receipt_url: string | null;
    dispute_status: string | null;
    dispute_message: string | null;
    disputed_at: string | null;
    dispute_resolution_note: string | null;
    item_description?: string;
    quantity?: number;
    quantity_before_adjustment?: number | null;
    unit_label?: string | null;
    status?: string | null;
    notes?: string | null;
    staff_note?: string | null;
    pledged_at?: string | null;
    received_at?: string | null;
    received_by_name?: string | null;
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
        campaign_type: 'money' | 'items';
    };
    monthTotal: number;
    previousMonthTotal: number;
    pendingDisputesCount: number;
    summaryMode: 'currency' | 'quantity';
    canManageDonations: boolean;
}

function formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatQuantity(value: number, unitLabel?: string | null): string {
    return unitLabel ? `${value} ${unitLabel}` : `${value}`;
}

export default function DonationTreasurerDashboard({
    donations,
    campaigns,
    filters,
    monthTotal,
    previousMonthTotal,
    pendingDisputesCount,
    summaryMode,
    canManageDonations,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [month, setMonth] = useState(filters.month);
    const [campaignId, setCampaignId] = useState(filters.campaign_id ? String(filters.campaign_id) : '');
    const [disputesOnly, setDisputesOnly] = useState(filters.disputes_only);
    const [campaignType, setCampaignType] = useState<'money' | 'items'>(filters.campaign_type);

    const [adjustDonation, setAdjustDonation] = useState<DonationRow | null>(null);
    const [resolveDonation, setResolveDonation] = useState<DonationRow | null>(null);
    const [adjustItemDonation, setAdjustItemDonation] = useState<DonationRow | null>(null);

    const adjustForm = useForm({
        amount: '',
        adjustment_note: '',
        dispute_resolution_note: '',
        resolve_dispute: true,
    });

    const resolveForm = useForm({
        dispute_resolution_note: '',
    });

    const adjustItemForm = useForm({
        item_description: '',
        quantity: '',
        staff_note: '',
        adjustment_note: '',
    });

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(
            route('finance.charity-donations.index'),
            {
                search: search.trim() || undefined,
                month: month || undefined,
                campaign_id: campaignId || undefined,
                disputes_only: disputesOnly || undefined,
                campaign_type: campaignType || undefined,
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
        adjustForm.patch(route('finance.charity-donations.update', adjustDonation.id), {
            ...inertiaListModalSave,
            onSuccess: () => {
                adjustForm.reset();
            },
        });
    };

    const openResolve = (d: DonationRow) => {
        setResolveDonation(d);
        resolveForm.setData({ dispute_resolution_note: '' });
        resolveForm.clearErrors();
    };

    const openAdjustItem = (d: DonationRow) => {
        setAdjustItemDonation(d);
        adjustItemForm.setData({
            item_description: d.item_description ?? '',
            quantity: String(d.quantity ?? 1),
            staff_note: d.staff_note ?? '',
            adjustment_note: '',
        });
        adjustItemForm.clearErrors();
    };

    const submitAdjustItem: FormEventHandler = (e) => {
        e.preventDefault();
        if (!adjustItemDonation) return;
        adjustItemForm.patch(route('charity-campaigns.items.update', adjustItemDonation.id), inertiaListModalSave);
    };

    const receiveItem = (d: DonationRow) => {
        router.post(route('charity-campaigns.items.receive', d.id), {}, inertiaListModalSave);
    };

    const cancelItem = (d: DonationRow) => {
        if (!window.confirm('Cancelar este compromisso de doação?')) return;
        router.post(route('charity-campaigns.items.cancel', d.id), {}, inertiaListModalSave);
    };

    const submitResolve: FormEventHandler = (e) => {
        e.preventDefault();
        if (!resolveDonation) return;
        resolveForm.post(route('finance.charity-donations.resolve-dispute', resolveDonation.id), {
            ...inertiaListModalSave,
            onSuccess: () => {
                resolveForm.reset();
            },
        });
    };

    const monthDiff = monthTotal - previousMonthTotal;
    const formatSummaryValue = (value: number) =>
        summaryMode === 'quantity' ? formatQuantity(value) : formatBrl(value);

    const monthDiffLabel =
        monthDiff >= 0
            ? `+${formatSummaryValue(monthDiff)} em relação ao mês anterior`
            : `${formatSummaryValue(monthDiff)} em relação ao mês anterior`;

    return (
        <AdminLayout>
            <Head title="Tesouraria - Doação" />
            <PageHeader
                title="Tesouraria - Doação"
                subtitle={
                    campaignType === 'items'
                        ? 'Compromissos e recebimentos de objetos, com conferência logística e ajustes de quantidade.'
                        : 'Histórico de doações, ajuste de valores e reclamações dos doadores.'
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        {campaignType === 'items' ? 'Itens comprometidos no mês' : 'Total do mês'}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatSummaryValue(monthTotal)}</p>
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{monthDiffLabel}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Mês anterior</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{formatSummaryValue(previousMonthTotal)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {campaignType === 'items' ? 'Compromissos pendentes' : 'Reclamações pendentes'}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingDisputesCount}</p>
                </div>
            </div>

            <form onSubmit={applyFilters} className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="grid gap-4 md:grid-cols-5">
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
                        <InputLabel htmlFor="campaign_type" value="Tipo" />
                        <select
                            id="campaign_type"
                            value={campaignType}
                            onChange={(e) => {
                                setCampaignType(e.target.value as 'money' | 'items');
                                setCampaignId('');
                            }}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="money">Financeira</option>
                            <option value="items">Objetos</option>
                        </select>
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
                        {campaignType === 'items' ? 'Somente compromissos pendentes' : 'Somente reclamações pendentes'}
                    </label>
                    <SecondaryButton type="submit">Filtrar</SecondaryButton>
                </div>
            </form>

            {donations.data.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <BanknotesIcon className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {campaignType === 'items'
                            ? 'Nenhum compromisso de item encontrado com os filtros atuais.'
                            : 'Nenhuma doação encontrada com os filtros atuais.'}
                    </p>
                </div>
            ) : (
                <>
                    <ul className="space-y-3 md:hidden">
                        {donations.data.map((d) => (
                            <li
                                key={d.id}
                                className={`rounded-2xl border p-4 shadow-sm ${
                                    (campaignType === 'items' ? d.status === 'pledged' : d.dispute_status === 'pending')
                                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
                                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                                }`}
                            >
                                <p className="text-xs text-zinc-500">
                                    {new Date((d.received_at ?? d.pledged_at ?? d.confirmed_at) as string).toLocaleString('pt-BR')}
                                </p>
                                <p className="mt-1 font-semibold text-zinc-900 dark:text-white">{d.donor_name}</p>
                                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{d.campaign_title}</p>
                                {campaignType === 'items' ? (
                                    <>
                                        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{d.item_description}</p>
                                        <p className="mt-1 font-medium">
                                            {formatQuantity(d.quantity ?? 0, d.unit_label)}
                                        </p>
                                        <span className="mt-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                            {d.status === 'received'
                                                ? 'Recebido'
                                                : d.status === 'cancelled'
                                                  ? 'Cancelado'
                                                  : 'Pendente'}
                                        </span>
                                        {canManageDonations ? (
                                            <div className="mt-3 flex flex-col items-start gap-2">
                                                {d.status === 'pledged' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => receiveItem(d)}
                                                        className="cursor-pointer text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                                                    >
                                                        Confirmar recebimento
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => openAdjustItem(d)}
                                                    className="inline-flex cursor-pointer items-center text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                                                >
                                                    <PencilSquareIcon className="mr-1 h-3.5 w-3.5" />
                                                    Ajustar compromisso
                                                </button>
                                                {d.status === 'pledged' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => cancelItem(d)}
                                                        className="cursor-pointer text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
                                                    >
                                                        Cancelar compromisso
                                                    </button>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <p className="mt-2 font-medium text-zinc-900 dark:text-white">
                                            {formatBrl(d.amount ?? 0)}
                                        </p>
                                        {d.dispute_status === 'pending' ? (
                                            <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                                Reclamação pendente
                                            </span>
                                        ) : null}
                                        <div className="mt-3 flex flex-wrap gap-3">
                                            {d.receipt_url ? (
                                                <a
                                                    href={d.receipt_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="cursor-pointer text-xs font-medium text-brand-600 hover:underline"
                                                >
                                                    Comprovante
                                                </a>
                                            ) : null}
                                            {canManageDonations ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAdjust(d)}
                                                        className="inline-flex cursor-pointer items-center text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                                                    >
                                                        <PencilSquareIcon className="mr-1 h-3.5 w-3.5" />
                                                        Ajustar valor
                                                    </button>
                                                    {d.dispute_status === 'pending' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openResolve(d)}
                                                            className="cursor-pointer text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
                                                        >
                                                            Resolver reclamação
                                                        </button>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50">
                                {campaignType === 'items' ? (
                                    <tr>
                                        <th className="px-4 py-3">Data</th>
                                        <th className="px-4 py-3">Doador</th>
                                        <th className="px-4 py-3">Campanha</th>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Quantidade</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Ações</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-4 py-3">Data</th>
                                        <th className="px-4 py-3">Doador</th>
                                        <th className="px-4 py-3">Campanha</th>
                                        <th className="px-4 py-3">Valor</th>
                                        <th className="px-4 py-3">Reclamação</th>
                                        <th className="px-4 py-3">Ações</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {campaignType === 'items'
                                    ? donations.data.map((d) => (
                                          <tr
                                              key={d.id}
                                              className={`border-b border-zinc-100 dark:border-zinc-800 ${
                                                  d.status === 'pledged' ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                                              }`}
                                          >
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                  {new Date((d.received_at ?? d.pledged_at ?? d.confirmed_at) as string).toLocaleString('pt-BR')}
                                              </td>
                                              <td className="px-4 py-3">
                                                  {d.donor_name}
                                                  {d.is_anonymous && d.donor_real_name && (
                                                      <span className="block text-xs text-zinc-500">({d.donor_real_name})</span>
                                                  )}
                                                  {d.notes && (
                                                      <span className="mt-1 block text-xs text-zinc-500 line-clamp-2">{d.notes}</span>
                                                  )}
                                              </td>
                                              <td className="px-4 py-3">{d.campaign_title}</td>
                                              <td className="px-4 py-3">{d.item_description}</td>
                                              <td className="px-4 py-3">
                                                  <span className="font-medium">{formatQuantity(d.quantity ?? 0, d.unit_label)}</span>
                                                  {d.quantity_before_adjustment !== null && d.quantity_before_adjustment !== undefined && (
                                                      <span className="block text-xs text-zinc-500">
                                                          Antes: {formatQuantity(d.quantity_before_adjustment, d.unit_label)}
                                                          {d.adjusted_at && d.adjusted_by_name ? ` · ${d.adjusted_by_name}` : ''}
                                                      </span>
                                                  )}
                                                  {d.adjustment_note && (
                                                      <span className="block text-xs text-zinc-500 line-clamp-2">{d.adjustment_note}</span>
                                                  )}
                                              </td>
                                              <td className="px-4 py-3">
                                                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                      {d.status === 'received'
                                                          ? 'Recebido'
                                                          : d.status === 'cancelled'
                                                            ? 'Cancelado'
                                                            : 'Pendente'}
                                                  </span>
                                                  {d.received_by_name && (
                                                      <span className="mt-1 block text-xs text-zinc-500">
                                                          Recebido por {d.received_by_name}
                                                      </span>
                                                  )}
                                                  {d.staff_note && (
                                                      <span className="mt-1 block text-xs text-zinc-500 line-clamp-2">{d.staff_note}</span>
                                                  )}
                                              </td>
                                              <td className="px-4 py-3">
                                                  <div className="flex flex-col gap-1">
                                                      {canManageDonations && (
                                                          <>
                                                              {d.status === 'pledged' && (
                                                                  <button
                                                                      type="button"
                                                                      onClick={() => receiveItem(d)}
                                                                      className="text-left text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                                                                  >
                                                                      Confirmar recebimento
                                                                  </button>
                                                              )}
                                                              <button
                                                                  type="button"
                                                                  onClick={() => openAdjustItem(d)}
                                                                  className="inline-flex items-center text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                                                              >
                                                                  <PencilSquareIcon className="mr-1 h-3.5 w-3.5" />
                                                                  Ajustar compromisso
                                                              </button>
                                                              {d.status === 'pledged' && (
                                                                  <button
                                                                      type="button"
                                                                      onClick={() => cancelItem(d)}
                                                                      className="text-left text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
                                                                  >
                                                                      Cancelar compromisso
                                                                  </button>
                                                              )}
                                                          </>
                                                      )}
                                                  </div>
                                              </td>
                                          </tr>
                                      ))
                                    : donations.data.map((d) => (
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
                                                  <span className="font-medium">{formatBrl(d.amount ?? 0)}</span>
                                                  {d.amount_before_adjustment !== null && d.amount_before_adjustment !== undefined && (
                                                      <span className="block text-xs text-zinc-500">
                                                          Antes: {formatBrl(d.amount_before_adjustment)}
                                                          {d.adjusted_at && d.adjusted_by_name && <> · Ajustado por {d.adjusted_by_name}</>}
                                                      </span>
                                                  )}
                                                  {d.adjustment_note && (
                                                      <span className="block text-xs text-zinc-500 line-clamp-2" title={d.adjustment_note}>
                                                          Motivo: {d.adjustment_note}
                                                      </span>
                                                  )}
                                                  {d.ocr_suggested_amount !== null && d.ocr_suggested_amount !== undefined && (
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
                {donations.last_page > 1 ? (
                    <div className="mt-4 flex flex-wrap gap-2 md:hidden">
                        {donations.links.map((link, i) =>
                            link.url ? (
                                <button
                                    key={`m-${link.label}-${i}`}
                                    type="button"
                                    onClick={() => router.get(link.url!)}
                                    className={`cursor-pointer rounded-lg px-3 py-1 text-sm ${
                                        link.active
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={`m-${link.label}-${i}`}
                                    className="rounded-lg px-3 py-1 text-sm text-zinc-400"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ),
                        )}
                    </div>
                ) : null}
                </>
            )}

            <Modal show={adjustDonation !== null} onClose={() => setAdjustDonation(null)} maxWidth="md">
                <form onSubmit={submitAdjust} className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Ajustar valor da doação</h3>
                    {adjustDonation && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {adjustDonation.donor_name} · {adjustDonation.campaign_title} · Atual:{' '}
                            {formatBrl(adjustDonation.amount ?? 0)}
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

            <Modal show={adjustItemDonation !== null} onClose={() => setAdjustItemDonation(null)} maxWidth="md">
                <form onSubmit={submitAdjustItem} className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Ajustar compromisso de item</h3>
                    {adjustItemDonation && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {adjustItemDonation.donor_name} · {adjustItemDonation.campaign_title}
                        </p>
                    )}
                    <div>
                        <InputLabel htmlFor="item_description_adjust" value="Item" />
                        <TextInput
                            id="item_description_adjust"
                            value={adjustItemForm.data.item_description}
                            onChange={(e) => adjustItemForm.setData('item_description', e.target.value)}
                            className="mt-1 w-full"
                            required
                        />
                        {adjustItemForm.errors.item_description && (
                            <p className="mt-1 text-sm text-red-600">{adjustItemForm.errors.item_description}</p>
                        )}
                    </div>
                    <div>
                        <InputLabel htmlFor="item_quantity_adjust" value="Quantidade" />
                        <TextInput
                            id="item_quantity_adjust"
                            type="number"
                            min="1"
                            step="1"
                            value={adjustItemForm.data.quantity}
                            onChange={(e) => adjustItemForm.setData('quantity', e.target.value)}
                            className="mt-1 w-full"
                            required
                        />
                        {adjustItemForm.errors.quantity && (
                            <p className="mt-1 text-sm text-red-600">{adjustItemForm.errors.quantity}</p>
                        )}
                    </div>
                    <div>
                        <InputLabel htmlFor="item_adjustment_note" value="Motivo do ajuste" />
                        <textarea
                            id="item_adjustment_note"
                            value={adjustItemForm.data.adjustment_note}
                            onChange={(e) => adjustItemForm.setData('adjustment_note', e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            required
                        />
                        {adjustItemForm.errors.adjustment_note && (
                            <p className="mt-1 text-sm text-red-600">{adjustItemForm.errors.adjustment_note}</p>
                        )}
                    </div>
                    <div>
                        <InputLabel htmlFor="item_staff_note" value="Observação interna (opcional)" />
                        <textarea
                            id="item_staff_note"
                            value={adjustItemForm.data.staff_note}
                            onChange={(e) => adjustItemForm.setData('staff_note', e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setAdjustItemDonation(null)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={adjustItemForm.processing}>Salvar ajuste</PrimaryButton>
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
