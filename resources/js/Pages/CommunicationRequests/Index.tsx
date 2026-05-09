import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import FlashMessages from '@/Components/FlashMessages';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import AdminLayout from '@/Layouts/AdminLayout';
import { confirmAction } from '@/utils/confirmDialog';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FunnelIcon, InboxIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useMemo, useState } from 'react';

type CommunicationRow = {
    id: number;
    subject: string;
    message_preview: string;
    status: string;
    status_label: string;
    created_at: string | null;
    preferred_date: string | null;
    demand_type: string;
    demand_type_label: string;
    priority: string;
    priority_label: string;
    requester_name: string | null;
    can_edit: boolean;
    can_delete: boolean;
    destroy_url: string | null;
    panel_json_url: string;
};

type CommunicationPanelPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'>;

interface Props {
    mode: 'leader' | 'staff';
    rows: CommunicationRow[];
    storeUrl: string;
    indexUrl: string;
    demandTypeOptions: Array<{ value: string; label: string }>;
    priorityOptions: Array<{ value: string; label: string }>;
    filters: {
        status: string;
        demand_type: string;
        priority: string;
        q: string;
    };
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
    filters,
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';

    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelRow, setPanelRow] = useState<CommunicationRow | null>(null);
    const [panelPayload, setPanelPayload] = useState<CommunicationPanelPayload | null>(null);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelTab, setPanelTab] = useState<'detalhes' | 'chat'>('detalhes');

    const form = useForm({
        demand_type: '' as '' | string,
        priority: '' as '' | string,
        preferred_date: '',
        message: '',
    });

    const canManage = mode === 'staff';
    const pageTitle = 'Solicitações de Comunicação';
    const subtitle =
        mode === 'staff'
            ? 'Fila central da Comunicação: organize demandas por tipo, prioridade e status.'
            : 'Abra e acompanhe seus pedidos para a equipe de Comunicação.';

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

    const applyFilters = (next: Partial<Props['filters']>) => {
        const merged = { ...filters, ...next };
        router.get(
            indexUrl,
            {
                status: merged.status || undefined,
                demand_type: merged.demand_type || undefined,
                priority: merged.priority || undefined,
                q: merged.q.trim() || undefined,
            },
            { preserveScroll: true, replace: true },
        );
    };

    const openRequestModal = () => {
        form.reset();
        form.clearErrors();
        form.setData({
            demand_type: '',
            priority: '',
            preferred_date: '',
            message: '',
        });
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
            onSuccess: () => closeRequestModal(),
        });
    };

    const handleDelete = async (row: CommunicationRow) => {
        if (!row.destroy_url) return;
        const ok = await confirmAction({
            title: 'Excluir solicitação?',
            text: 'A solicitação será removida permanentemente.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(row.destroy_url, { preserveScroll: true });
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
                    <AddButton variant="icon" onClick={openRequestModal}>
                        Nova solicitação
                    </AddButton>
                }
            />

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
                                value={filters.q}
                                onChange={(e) => applyFilters({ q: e.target.value })}
                                placeholder="Assunto ou mensagem"
                            />
                            <span className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-3 text-zinc-500 dark:border-zinc-700 dark:text-zinc-300">
                                <FunnelIcon className="h-4 w-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="space-y-3">
                {rows.length === 0 ? (
                    <Card className="p-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                        Ainda não há solicitações de comunicação.
                    </Card>
                ) : (
                    rows.map((row) => (
                        <Card key={row.id} className="p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => void openPanel(row)}
                                    className="min-w-0 flex-1 rounded-lg text-left"
                                >
                                    <div className="text-base font-semibold text-zinc-900 dark:text-white">{row.subject}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        {mode === 'staff' && row.requester_name ? <span>Por {row.requester_name}</span> : null}
                                        <span>{row.demand_type_label}</span>
                                        <span>Prioridade: {row.priority_label}</span>
                                        {row.preferred_date ? <span>Prazo: {row.preferred_date}</span> : null}
                                    </div>
                                </button>
                                <div className="flex items-center gap-2">
                                    {row.can_delete ? (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(row)}
                                            title="Excluir solicitação"
                                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    ) : null}
                                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                        {row.status_label}
                                    </span>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{row.message_preview}</p>
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Criado em: {dateLabel(row.created_at)}
                            </p>
                        </Card>
                    ))
                )}
            </div>

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
                            Descreva a demanda com contexto e prazo para facilitar a organização da equipe.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="comm_demand_type" value="Tipo de demanda" />
                            <SelectInput
                                id="comm_demand_type"
                                value={form.data.demand_type}
                                className="mt-1 block w-full"
                                onChange={(e) => form.setData('demand_type', e.target.value)}
                            >
                                <option value="">Selecione…</option>
                                {demandTypeOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError className="mt-2" message={form.errors.demand_type} />
                        </div>
                        <div>
                            <InputLabel htmlFor="comm_priority" value="Prioridade" />
                            <SelectInput
                                id="comm_priority"
                                value={form.data.priority}
                                className="mt-1 block w-full"
                                onChange={(e) => form.setData('priority', e.target.value)}
                            >
                                <option value="">Selecione…</option>
                                {priorityOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError className="mt-2" message={form.errors.priority} />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="comm_preferred_date" value="Prazo desejado (opcional)" />
                        <TextInput
                            id="comm_preferred_date"
                            type="date"
                            value={form.data.preferred_date}
                            className="mt-1 block w-full max-w-xs"
                            onChange={(e) => form.setData('preferred_date', e.target.value)}
                        />
                        <InputError className="mt-2" message={form.errors.preferred_date} />
                    </div>

                    <div>
                        <InputLabel htmlFor="comm_message" value="Descrição" />
                        <Textarea
                            id="comm_message"
                            value={form.data.message}
                            className="mt-1 block w-full"
                            rows={6}
                            placeholder="Objetivo, público, contexto, data do evento, materiais já existentes, etc."
                            onChange={(e) => form.setData('message', e.target.value)}
                        />
                        <InputError className="mt-2" message={form.errors.message} />
                    </div>
                </form>
            </Modal>

            <Modal show={panelOpen} onClose={closePanel} disableBodyScroll maxWidth="2xl">
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    <div className="flex shrink-0 items-start gap-3 border-b border-zinc-200 px-5 pb-3 pt-4 dark:border-zinc-800 sm:px-6 sm:pb-4 sm:pt-5">
                        <InboxIcon className="mt-0.5 h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <div className="min-w-0 flex-1 pr-10">
                            <h2 className="truncate text-lg font-semibold leading-tight text-zinc-900 dark:text-white">
                                {panelPayload?.solicitation?.typeLabel ?? 'Solicitação de comunicação'}
                            </h2>
                            {panelPayload?.solicitation?.memberLabel ? (
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Solicitante:{' '}
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                        {panelPayload.solicitation.memberLabel}
                                    </span>
                                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                                    <span className="font-mono text-zinc-400 dark:text-zinc-500">#{panelPayload.solicitation.id}</span>
                                </p>
                            ) : null}
                        </div>
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
                                    />
                                ) : (
                                    <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar o painel.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
