import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { ChatBubbleLeftRightIcon, ChevronRightIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import ListViewModeToggle from '@/Components/ListViewModeToggle';
import SelectInput from '@/Components/SelectInput';
import SupportKanban from '@/Components/Support/SupportKanban';
import SupportTicketDetailPanel, { type SupportTicketDetailPanelProps } from '@/Components/Support/SupportTicketDetailPanel';
import { usePersistedViewMode } from '@/hooks/usePersistedViewMode';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

type TicketRow = {
    publicToken: string;
    typeLabel: string;
    demandCategory: string | null;
    demandCategoryLabel: string;
    priority: string;
    priorityLabel: string;
    status: string;
    statusLabel: string;
    message: string;
    solutionText: string | null;
    forecastAt: string | null;
    createdAt: string;
    updatedAt: string;
    ownerLabel: string;
};

type SelectOption = { value: string; label: string };

type StatusOption = {
    value: string;
    label: string;
    count: number;
};

type ModalPayload = Omit<SupportTicketDetailPanelProps, 'variant' | 'section'>;

interface Props {
    tickets: TicketRow[];
    kanbanTickets: TicketRow[];
    devItemStoreUrl: string;
    supportIndexUrl: string;
    modalDetail: ModalPayload | null;
    canCreateDevItem?: boolean;
    canManageTickets?: boolean;
    statusFilter: string;
    statusOptions: StatusOption[];
    demandCategoryOptions: SelectOption[];
    priorityOptions: SelectOption[];
    kanbanStatusColumns: SelectOption[];
}

export default function SupportIndex({
    tickets,
    kanbanTickets,
    devItemStoreUrl,
    supportIndexUrl,
    modalDetail,
    canCreateDevItem = false,
    canManageTickets = false,
    statusFilter,
    statusOptions,
    demandCategoryOptions,
    priorityOptions,
    kanbanStatusColumns,
}: Props) {
    const inertiaScrollOpts = inertiaListModalSave;
    const [viewMode, setViewMode] = usePersistedViewMode('support-admin-view-mode', 'list');
    const [modalTab, setModalTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [createOpen, setCreateOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        message: '',
        demand_category: 'internal',
        priority: 'medium',
        forecast_at: '',
    });

    const showModal = createOpen || modalDetail !== null;

    useEffect(() => {
        if (modalDetail) {
            setCreateOpen(false);
        }
    }, [modalDetail]);

    useEffect(() => {
        if (modalDetail?.ticket.publicToken) {
            setModalTab('detalhes');
        }
    }, [modalDetail?.ticket.publicToken]);

    const openCreateModal = () => {
        const startCreate = () => {
            reset();
            setModalTab('detalhes');
            setCreateOpen(true);
        };
        if (modalDetail) {
            router.get(supportIndexUrl, {}, {
                preserveScroll: true,
                onFinish: startCreate,
            });
        } else {
            startCreate();
        }
    };

    const closeSupportModal = () => {
        setCreateOpen(false);
        setModalTab('detalhes');
        router.get(supportIndexUrl, { status: statusFilter }, { preserveScroll: true, replace: true });
    };

    const openTicketModal = (token: string) => {
        router.get(supportIndexUrl, { status: statusFilter, modal: token }, { preserveScroll: true });
    };

    const applyStatusFilter = (nextStatus: string) => {
        const payload: Record<string, string> = { status: nextStatus };
        if (modalDetail?.ticket.publicToken) {
            payload.modal = modalDetail.ticket.publicToken;
        }
        router.get(supportIndexUrl, payload, { preserveScroll: true, replace: true });
    };

    const formatDateHighlight = (iso: string) => {
        const date = new Date(iso);
        return {
            day: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
            month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        };
    };

    const formatRequestDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        } catch {
            return '—';
        }
    };

    const formatForecastDate = (isoDate: string) => {
        const [y, m, d] = isoDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const priorityTone = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
            case 'low':
                return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
            default:
                return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
        }
    };

    const statusTone = (status: string) => {
        switch (status) {
            case 'waiting_user':
                return {
                    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
                    border: 'border-l-amber-500',
                };
            case 'resolved':
            case 'closed':
                return {
                    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
                    border: 'border-l-emerald-500',
                };
            case 'in_progress':
                return {
                    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
                    border: 'border-l-sky-500',
                };
            default:
                return {
                    chip: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
                    border: 'border-l-violet-500',
                };
        }
    };

    const statusFilterTone = (status: string) => {
        switch (status) {
            case 'waiting_user':
                return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
            case 'resolved':
            case 'closed':
                return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
            case 'in_progress':
                return 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200';
            case 'open':
                return 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-200';
            default:
                return 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200';
        }
    };

    const submitDevItem: FormEventHandler = (e) => {
        e.preventDefault();
        post(devItemStoreUrl, {
            ...inertiaScrollOpts,
            onSuccess: () => {
                reset();
                setData({
                    message: '',
                    demand_category: 'internal',
                    priority: 'medium',
                    forecast_at: '',
                });
            },
        });
    };

    const supportUpdateUrl = (token: string) => route('support.update', { token });

    return (
        <AdminLayout>
            <Head title="Suporte do app" />
            <div className="space-y-6">
                <PageHeader
                    title="Suporte do app"
                    subtitle="Demandas do app e backlog interno — triagem por tipo, prioridade e status."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <ListViewModeToggle value={viewMode} onChange={setViewMode} />
                            {canCreateDevItem ? (
                                <AddButton variant="label" onClick={openCreateModal} title="Nova demanda">
                                    Nova demanda
                                </AddButton>
                            ) : null}
                        </div>
                    }
                />

                {viewMode === 'list' ? (
                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((opt) => {
                        const active = statusFilter === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => applyStatusFilter(opt.value)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                    active
                                        ? `${statusFilterTone(opt.value)} ring-1 ring-current/20`
                                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <span>{opt.label}</span>
                                <span
                                    className={`inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                                        active
                                            ? 'bg-black/10 text-current dark:bg-white/15'
                                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                                    }`}
                                >
                                    {opt.count > 99 ? '99+' : opt.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
                ) : null}

                {viewMode === 'kanban' ? (
                    <SupportKanban
                        columns={kanbanStatusColumns}
                        tickets={kanbanTickets}
                        canManageTickets={canManageTickets}
                        supportUpdateUrlPattern={supportUpdateUrl}
                        onOpenTicket={openTicketModal}
                    />
                ) : tickets.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                        Nenhum chamado encontrado.
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="space-y-3">
                        {tickets.map((t) => {
                            const tone = statusTone(t.status);
                            return (
                                <button
                                    key={t.publicToken}
                                    type="button"
                                    onClick={() => openTicketModal(t.publicToken)}
                                    aria-label={`Abrir chamado: ${t.typeLabel}`}
                                    className={`group w-full cursor-pointer text-left rounded-2xl border border-zinc-200 dark:border-zinc-700 border-l-4 ${tone.border} bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40 active:scale-[0.998] touch-manipulation`}
                                >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary-500 shrink-0" />
                                            <span className="font-semibold text-zinc-900 dark:text-white">{t.typeLabel}</span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            <span>{t.ownerLabel}</span>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.chip}`}
                                            >
                                                {t.statusLabel}
                                            </span>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityTone(t.priority)}`}
                                            >
                                                {t.priorityLabel}
                                            </span>
                                            {t.demandCategoryLabel !== '—' ? (
                                                <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                                                    {t.demandCategoryLabel}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="text-sm text-zinc-700 dark:text-zinc-200 mt-2 whitespace-pre-wrap line-clamp-3">
                                            {t.message}
                                        </div>
                                        <div className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <p>
                                                <span className="font-medium text-zinc-600 dark:text-zinc-300">Data do pedido:</span>{' '}
                                                {formatRequestDate(t.createdAt)}
                                            </p>
                                            {t.forecastAt ? (
                                                <p>
                                                    <span className="font-medium text-zinc-600 dark:text-zinc-300">Previsão:</span>{' '}
                                                    {formatForecastDate(t.forecastAt)}
                                                </p>
                                            ) : null}
                                            {t.solutionText ? (
                                                <p className="text-sm text-zinc-700 dark:text-zinc-200">
                                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Solução:</span>{' '}
                                                    <span className="whitespace-pre-wrap line-clamp-2">{t.solutionText}</span>
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1 text-center dark:border-zinc-700 dark:bg-zinc-800/70">
                                            <div className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                                                {formatDateHighlight(t.createdAt).month}
                                            </div>
                                            <div className="text-sm font-bold leading-4 text-zinc-900 dark:text-zinc-100">
                                                {formatDateHighlight(t.createdAt).day}
                                            </div>
                                        </div>
                                        <ChevronRightIcon
                                            className="mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                                            aria-hidden
                                        />
                                    </div>
                                </div>
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            <Modal show={showModal} onClose={closeSupportModal} maxWidth="2xl">
                <div className="flex min-h-0 max-h-[min(88dvh,760px)] w-full flex-col overflow-hidden">
                    <div className="shrink-0 border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
                        <div className="flex items-center gap-2">
                            <WrenchScrewdriverIcon className="h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                            <h2 className="min-w-0 truncate text-lg font-semibold text-zinc-900 dark:text-white">
                                {modalDetail ? modalDetail.ticket.typeLabel : 'Nova demanda'}
                            </h2>
                        </div>
                        {modalDetail ? (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {modalDetail.ticket.ownerLabel} · {modalDetail.ticket.statusLabel ?? modalDetail.ticket.status}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Registe com clareza o contexto para facilitar triagem da equipe.
                            </p>
                        )}
                    </div>

                    <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-5 py-2 dark:border-zinc-800 dark:bg-zinc-900/70 sm:px-6">
                        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                            <button
                                type="button"
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                    modalTab === 'detalhes'
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                }`}
                                onClick={() => setModalTab('detalhes')}
                            >
                                Detalhes
                            </button>
                            <button
                                type="button"
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                    modalTab === 'chat'
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                } ${!modalDetail ? 'cursor-not-allowed opacity-50' : ''}`}
                                disabled={!modalDetail}
                                onClick={() => setModalTab('chat')}
                                title={!modalDetail ? 'Guarde o item na aba Detalhes para usar o chat' : undefined}
                            >
                                Chat
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-5 py-4 dark:bg-zinc-950 sm:px-6 sm:py-5">
                        {modalTab === 'detalhes' && createOpen && !modalDetail && (
                            <form onSubmit={submitDevItem} className="space-y-4">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Toda demanda nasce como <strong>Pendente</strong>. Descreva o contexto e, se quiser, informe uma
                                    previsão — o criador também verá essa data no app.
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor="support_dev_demand_category" value="Tipo" />
                                        <SelectInput
                                            id="support_dev_demand_category"
                                            value={data.demand_category}
                                            className="mt-1 block w-full"
                                            onChange={(e) => setData('demand_category', e.target.value)}
                                        >
                                            {demandCategoryOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </SelectInput>
                                        <InputError message={errors.demand_category} className="mt-1" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="support_dev_priority" value="Prioridade" />
                                        <SelectInput
                                            id="support_dev_priority"
                                            value={data.priority}
                                            className="mt-1 block w-full"
                                            onChange={(e) => setData('priority', e.target.value)}
                                        >
                                            {priorityOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </SelectInput>
                                        <InputError message={errors.priority} className="mt-1" />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel htmlFor="support_dev_forecast" value="Previsão (opcional)" />
                                    <input
                                        id="support_dev_forecast"
                                        type="date"
                                        value={data.forecast_at}
                                        onChange={(e) => setData('forecast_at', e.target.value)}
                                        className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                    />
                                    <InputError message={errors.forecast_at} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="support_dev_message" value="Descrição" />
                                    <Textarea
                                        id="support_dev_message"
                                        value={data.message}
                                        onChange={(e) => setData('message', e.target.value)}
                                        rows={8}
                                        className="mt-1 block w-full"
                                        placeholder="Ex.: Permitir exportar a lista de presenças em PDF…"
                                    />
                                    <InputError message={errors.message} className="mt-1" />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <SecondaryButton type="button" onClick={closeSupportModal}>
                                        Cancelar
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" disabled={processing}>
                                        Criar demanda
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}

                        {modalTab === 'detalhes' && modalDetail && (
                            <SupportTicketDetailPanel {...modalDetail} variant="modal" section="details" />
                        )}

                        {modalTab === 'chat' && modalDetail && (
                            <SupportTicketDetailPanel {...modalDetail} variant="modal" section="chat" />
                        )}

                        {modalTab === 'chat' && !modalDetail && (
                            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-8">
                                Crie o item na aba Detalhes para aceder ao chat deste chamado.
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
