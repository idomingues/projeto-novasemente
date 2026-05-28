import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import CommunicationRequestsKanban, {
    type CommunicationKanbanRow,
} from '@/Components/CommunicationRequests/CommunicationRequestsKanban';
import CommunicationRequestDetailsBlock, {
    type CommunicationDetailsPayload,
} from '@/Components/CommunicationRequests/CommunicationRequestDetailsBlock';
import CommunicationRequestFormFields, {
    type CommunicationRequestFormData,
} from '@/Components/CommunicationRequests/CommunicationRequestFormFields';
import FlashMessages from '@/Components/FlashMessages';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import PersonListIdentity from '@/Components/PersonListIdentity';
import PersonModalHeader from '@/Components/PersonModalHeader';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import TextInput from '@/Components/TextInput';
import ListViewModeToggle from '@/Components/ListViewModeToggle';
import AdminLayout from '@/Layouts/AdminLayout';
import { confirmAction } from '@/utils/confirmDialog';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArchiveBoxIcon, ChatBubbleLeftRightIcon, ChevronRightIcon, FunnelIcon, InboxIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useCallback, useMemo, useRef, useState } from 'react';
import ListSearchHint from '@/Components/ListSearchHint';
import { useDebouncedServerSearch } from '@/hooks/useDebouncedServerSearch';
import { usePersistedViewMode } from '@/hooks/usePersistedViewMode';
import type { ListKanbanViewMode } from '@/utils/persistedViewMode';

type CommunicationRow = {
    id: number;
    subject: string;
    message_preview: string;
    status: string;
    status_label: string;
    created_at: string | null;
    preferred_date: string | null;
    event_date: string | null;
    ministry_name: string | null;
    demand_type: string;
    demand_type_label: string;
    priority: string;
    priority_label: string;
    requester_name: string | null;
    requester_photo_url?: string | null;
    can_edit: boolean;
    panel_json_url: string;
};

type CommunicationPanelPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'> & {
    communicationDetails?: CommunicationDetailsPayload;
};

interface Props {
    mode: 'leader' | 'staff';
    rows: CommunicationRow[];
    storeUrl: string;
    indexUrl: string;
    demandTypeOptions: Array<{ value: string; label: string }>;
    priorityOptions: Array<{ value: string; label: string }>;
    artChannelOptions: Array<{ value: string; label: string }>;
    coverageSupportOptions: Array<{ value: string; label: string }>;
    maxAttachments: number;
    ministryOptions: Array<{ value: number; label: string }>;
    filters: {
        status: string;
        demand_type: string;
        priority: string;
        q: string;
        arquivados: boolean;
    };
}

function listTabClass(active: boolean): string {
    return [
        'flex-1 min-w-[8rem] px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px text-center',
        active
            ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
            : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
    ].join(' ');
}

function dateLabel(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-BR');
    } catch {
        return iso;
    }
}

export default function CommunicationRequestsIndex({
    mode,
    rows,
    storeUrl,
    indexUrl,
    demandTypeOptions,
    priorityOptions,
    artChannelOptions,
    coverageSupportOptions,
    maxAttachments,
    ministryOptions,
    filters,
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';

    const [viewMode, setViewMode] = usePersistedViewMode('ns-communication-requests-view', 'list');
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelRow, setPanelRow] = useState<CommunicationRow | null>(null);
    const [panelPayload, setPanelPayload] = useState<CommunicationPanelPayload | null>(null);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelTab, setPanelTab] = useState<'detalhes' | 'chat'>('detalhes');

    const emptyForm: CommunicationRequestFormData = {
        demand_type: '',
        priority: '',
        event_date: '',
        ministry_id: '',
        preferred_date: '',
        message: '',
        art_channels: [],
        coverage_event: '',
        coverage_support: [],
        technical_event: '',
        technical_support: [],
        attachment_files: [],
    };

    const form = useForm<CommunicationRequestFormData>(emptyForm);

    const canManage = mode === 'staff';
    const pageTitle = 'Solicitações de Comunicação';
    const subtitle =
        mode === 'staff'
            ? 'Fila central da Comunicação: organize demandas por tipo, prioridade e status.'
            : 'Abra e acompanhe seus pedidos para a equipe de Comunicação.';

    const effectiveViewMode: ListKanbanViewMode = canManage && filters.arquivados ? 'list' : (viewMode as ListKanbanViewMode);

    const statusOptions = useMemo(
        () => [
            { value: '', label: 'Todos os status' },
            { value: 'pending', label: 'Pendente' },
            { value: 'in_progress', label: 'Em andamento' },
            { value: 'completed', label: 'Concluído' },
            { value: 'cancelled', label: 'Cancelado' },
        ],
        [],
    );

    const kanbanColumns = useMemo(
        () => statusOptions.filter((o) => o.value !== '').map((o) => ({ value: o.value, label: o.label })),
        [statusOptions],
    );

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const applyFilters = useCallback((next: Partial<Props['filters']>) => {
        const merged = { ...filtersRef.current, ...next };
        router.get(
            indexUrl,
            {
                status: merged.status || undefined,
                demand_type: merged.demand_type || undefined,
                priority: merged.priority || undefined,
                q: merged.q.trim() || undefined,
                arquivados: merged.arquivados ? '1' : undefined,
            },
            { preserveScroll: true, replace: true },
        );
    }, [indexUrl]);

    const {
        value: qDraft,
        setValue: setQDraft,
        isBelowMinimum: qBelowMinimum,
    } = useDebouncedServerSearch({
        serverValue: filters.q,
        onApply: useCallback(
            (term) => {
                applyFilters({ q: term ?? '' });
            },
            [applyFilters],
        ),
    });

    const goToListTab = (arquivados: boolean) => {
        applyFilters({ arquivados });
    };

    const openPanelById = (id: number) => {
        const row = rows.find((r) => r.id === id);
        if (!row) return;
        void openPanel(row);
    };

    const updateUrl = useCallback((id: number) => route('communication-requests.update', { solicitation: id }), []);

    const kanbanRows: CommunicationKanbanRow[] = useMemo(
        () =>
            rows.map((r) => ({
                id: r.id,
                subject: r.subject,
                message_preview: r.message_preview,
                status: r.status,
                status_label: r.status_label,
                demand_type_label: r.demand_type_label,
                priority_label: r.priority_label,
                requester_name: r.requester_name,
                can_edit: r.can_edit,
            })),
        [rows],
    );

    const openRequestModal = () => {
        form.reset();
        form.clearErrors();
        form.setData({ ...emptyForm });
        setRequestModalOpen(true);
    };

    const closeRequestModal = () => {
        setRequestModalOpen(false);
        form.reset();
        form.clearErrors();
    };

    const closePanel = () => {
        setPanelOpen(false);
        setPanelRow(null);
        setPanelPayload(null);
        setPanelTab('detalhes');
        setPanelLoading(false);
    };

    const refetchPanelPayload = async () => {
        if (!panelRow) return;
        try {
            const response = await fetch(panelRow.panel_json_url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            if (!response.ok) return;
            setPanelPayload((await response.json()) as CommunicationPanelPayload);
        } catch {
            /* keep previous payload */
        }
    };

    const openPanel = async (row: CommunicationRow, tab: 'detalhes' | 'chat' = 'detalhes') => {
        setPanelRow(row);
        setPanelTab(tab);
        setPanelOpen(true);
        setPanelPayload(null);
        setPanelLoading(true);

        try {
            const response = await fetch(row.panel_json_url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error('failed');
            setPanelPayload((await response.json()) as CommunicationPanelPayload);
        } catch {
            closePanel();
        } finally {
            setPanelLoading(false);
        }
    };

    const submitRequest: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(storeUrl, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => closeRequestModal(),
        });
    };

    const handleArchiveStaff = async () => {
        const url = panelPayload?.archiveStaffUrl;
        if (!url) return;
        const ok = await confirmAction({
            title: 'Arquivar solicitação?',
            text: 'A solicitação deixa de aparecer na lista ativa. Você pode consultá-la em «Arquivados».',
            confirmButtonText: 'Arquivar',
            icon: 'question',
        });
        if (ok) {
            router.post(url, {}, { preserveScroll: true, onSuccess: () => closePanel() });
        }
    };

    const handleUnarchiveStaff = async () => {
        const url = panelPayload?.unarchiveStaffUrl;
        if (!url) return;
        const ok = await confirmAction({
            title: 'Restaurar solicitação?',
            text: 'A solicitação voltará à lista ativa de comunicação.',
            confirmButtonText: 'Restaurar',
            icon: 'question',
        });
        if (ok) {
            router.post(url, {}, { preserveScroll: true, onSuccess: () => closePanel() });
        }
    };

    const tabBtn = (active: boolean) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`;

    return (
        <AdminLayout>
            <Head title={pageTitle} />
            <FlashMessages />
            <PageHeader
                title={pageTitle}
                subtitle={subtitle}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {canManage && !filters.arquivados ? (
                            <ListViewModeToggle value={viewMode as ListKanbanViewMode} onChange={setViewMode} />
                        ) : null}
                        <AddButton variant="icon" onClick={openRequestModal}>
                            Nova solicitação
                        </AddButton>
                    </div>
                }
            />

            {canManage ? (
                <div className="mb-4 flex border-b border-zinc-200 dark:border-zinc-800">
                    <button type="button" className={listTabClass(!filters.arquivados)} onClick={() => goToListTab(false)}>
                        Ativos
                    </button>
                    <button type="button" className={listTabClass(filters.arquivados)} onClick={() => goToListTab(true)}>
                        <span className="inline-flex items-center justify-center gap-2">
                            <ArchiveBoxIcon className="h-4 w-4 shrink-0" aria-hidden />
                            Arquivados
                        </span>
                    </button>
                </div>
            ) : null}

            <Card className="mb-4 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                    <div>
                        <InputLabel value="Status" />
                        <SelectInput
                            className="mt-1 block w-full"
                            value={filters.status}
                            onChange={(e) => applyFilters({ status: e.target.value })}
                        >
                            {statusOptions.map((o) => (
                                <option key={o.value || 'all-status'} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <InputLabel value="Tipo de demanda" />
                        <SelectInput
                            className="mt-1 block w-full"
                            value={filters.demand_type}
                            onChange={(e) => applyFilters({ demand_type: e.target.value })}
                        >
                            <option value="">Todos os tipos</option>
                            {demandTypeOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <InputLabel value="Prioridade" />
                        <SelectInput
                            className="mt-1 block w-full"
                            value={filters.priority}
                            onChange={(e) => applyFilters({ priority: e.target.value })}
                        >
                            <option value="">Todas as prioridades</option>
                            {priorityOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <InputLabel value="Pesquisar" />
                        <div className="mt-1 flex gap-2">
                            <TextInput
                                className="w-full"
                                value={qDraft}
                                onChange={(e) => setQDraft(e.target.value)}
                                placeholder="Assunto ou mensagem"
                            />
                            <span className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-3 text-zinc-500 dark:border-zinc-700 dark:text-zinc-300">
                                <FunnelIcon className="h-4 w-4" />
                            </span>
                        </div>
                        <ListSearchHint show={qBelowMinimum} className="mt-1" />
                    </div>
                </div>
            </Card>

            {effectiveViewMode === 'kanban' ? (
                <CommunicationRequestsKanban
                    columns={kanbanColumns}
                    rows={kanbanRows}
                    canManage={canManage}
                    updateUrl={updateUrl}
                    onOpenRow={openPanelById}
                />
            ) : (
                <div className="space-y-3">
                    {rows.length === 0 ? (
                        <Card className="p-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                            Ainda não há solicitações de comunicação.
                        </Card>
                    ) : (
                        rows.map((row) => (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() => void openPanel(row)}
                                aria-label={`Abrir solicitação: ${row.subject}`}
                                className="group w-full cursor-pointer touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.998] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40 sm:p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        {row.requester_name ? (
                                            <div className="mb-3">
                                                <PersonListIdentity
                                                    name={row.requester_name}
                                                    photoUrl={row.requester_photo_url}
                                                    nameClassName="font-semibold text-zinc-900 dark:text-white"
                                                />
                                            </div>
                                        ) : null}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <ChatBubbleLeftRightIcon
                                                className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                                                aria-hidden
                                            />
                                            <span className="text-base font-semibold text-zinc-900 dark:text-white">
                                                {row.subject}
                                            </span>
                                            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                                                {row.status_label}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            <span>{row.demand_type_label}</span>
                                            <span>Prioridade: {row.priority_label}</span>
                                            {row.event_date ? <span>Evento: {row.event_date}</span> : null}
                                            {row.ministry_name ? <span>{row.ministry_name}</span> : null}
                                            {row.preferred_date ? <span>Prazo: {row.preferred_date}</span> : null}
                                        </div>
                                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                                            {row.message_preview}
                                        </p>
                                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            Criado em: {dateLabel(row.created_at)}
                                        </p>
                                    </div>
                                    <ChevronRightIcon
                                        className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                                        aria-hidden
                                    />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            <Modal
                show={requestModalOpen}
                onClose={closeRequestModal}
                maxWidth="lg"
                footer={
                    <div className="flex flex-wrap justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeRequestModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="communication-request-form" disabled={form.processing}>
                            Enviar solicitação
                        </PrimaryButton>
                    </div>
                }
            >
                <form id="communication-request-form" onSubmit={submitRequest} className="space-y-5 p-6">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Nova solicitação de comunicação</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Descreva a demanda com contexto, data do evento e materiais para facilitar a priorização da equipe.
                        </p>
                    </div>

                    <CommunicationRequestFormFields
                        form={form}
                        demandTypeOptions={demandTypeOptions}
                        priorityOptions={priorityOptions}
                        artChannelOptions={artChannelOptions}
                        coverageSupportOptions={coverageSupportOptions}
                        maxAttachments={maxAttachments}
                        ministryOptions={ministryOptions.map((o) => ({
                            value: String(o.value),
                            label: o.label,
                        }))}
                    />
                    
                </form>
            </Modal>

            <Modal show={panelOpen} onClose={closePanel} disableBodyScroll maxWidth="2xl">
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    <div className="shrink-0 border-b border-zinc-200 px-5 pb-3 pt-4 dark:border-zinc-800 sm:px-6 sm:pb-4 sm:pt-5">
                        {panelPayload?.solicitation ? (
                            <PersonModalHeader
                                person={{
                                    name: panelPayload.solicitation.memberLabel ?? null,
                                    photoUrl: panelPayload.solicitation.memberPhotoUrl,
                                }}
                                subtitle={panelPayload.solicitation.typeLabel ?? 'Solicitação de comunicação'}
                                badge={`#${panelPayload.solicitation.id}`}
                                onClose={closePanel}
                            />
                        ) : (
                            <h2 className="pr-10 text-lg font-semibold text-zinc-900 dark:text-white">Solicitação de comunicação</h2>
                        )}
                    </div>

                    {panelOpen && (
                        <>
                            <div className="shrink-0 border-b border-zinc-200 px-5 py-2 dark:border-zinc-800 sm:px-6">
                                <div className="inline-flex w-full max-w-md rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                                    <button type="button" className={`flex-1 ${tabBtn(panelTab === 'detalhes')}`} onClick={() => setPanelTab('detalhes')}>
                                        Detalhes
                                    </button>
                                    <button type="button" className={`flex-1 ${tabBtn(panelTab === 'chat')}`} onClick={() => setPanelTab('chat')}>
                                        Chat
                                    </button>
                                </div>
                            </div>

                            <div
                                className={
                                    panelTab === 'chat'
                                        ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 sm:px-6 sm:py-4'
                                        : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 sm:py-5'
                                }
                            >
                                {panelLoading ? (
                                    <p className="text-sm text-zinc-500">A carregar…</p>
                                ) : panelPayload ? (
                                    <SolicitationDetailPanel
                                        {...panelPayload}
                                        variant="modal"
                                        section={panelTab === 'chat' ? 'chat' : 'details'}
                                        composerRole={canManage ? 'staff' : 'member'}
                                        preserveStateOnPanelActions
                                        onPanelActionSuccess={refetchPanelPayload}
                                        canManage={canManage && panelPayload.canManage}
                                        memberBubbleLabel="Solicitante"
                                        staffBubbleLabel="Equipe de comunicação"
                                        detailsBeforeAdminFooter={
                                            panelPayload.communicationDetails ? (
                                                <CommunicationRequestDetailsBlock details={panelPayload.communicationDetails} />
                                            ) : null
                                        }
                                    />
                                ) : (
                                    <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar o painel.</p>
                                )}
                            </div>

                            {canManage && panelPayload && !panelLoading ? (
                                <div className="shrink-0 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800 sm:px-6">
                                    {panelPayload.archiveStaffUrl ? (
                                        <SecondaryButton
                                            type="button"
                                            className="w-full justify-center sm:w-auto"
                                            onClick={() => void handleArchiveStaff()}
                                        >
                                            <ArchiveBoxIcon className="mr-2 h-4 w-4" aria-hidden />
                                            Arquivar solicitação
                                        </SecondaryButton>
                                    ) : null}
                                    {panelPayload.unarchiveStaffUrl ? (
                                        <SecondaryButton
                                            type="button"
                                            className="w-full justify-center sm:w-auto"
                                            onClick={() => void handleUnarchiveStaff()}
                                        >
                                            Restaurar na lista ativa
                                        </SecondaryButton>
                                    ) : null}
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
