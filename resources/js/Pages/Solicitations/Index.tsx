import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { ChevronRightIcon, FunnelIcon, InboxIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import SupportTicketDetailPanel, { type SupportTicketDetailPanelProps } from '@/Components/Support/SupportTicketDetailPanel';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

type DemandKind = 'solicitation' | 'pastoral';

type DemandRow = {
    kind: DemandKind;
    id: number;
    tagLabel: string;
    typeLabel: string;
    status: string;
    statusLabel: string;
    messageExcerpt: string;
    preferredDate: string | null;
    updatedAt: string;
    memberLabel: string;
};

type SolicitationModalPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'>;
type PastoralModalPayload = SupportTicketDetailPanelProps;

type ModalDetail =
    | { kind: 'solicitation'; payload: SolicitationModalPayload }
    | { kind: 'pastoral'; payload: PastoralModalPayload }
    | null;

interface Props {
    demands: DemandRow[];
    solicitationsIndexUrl: string;
    modalDetail: ModalDetail;
    canManage: boolean;
    filters: { type: string; status: string; q: string };
    typeOptions: { value: string; label: string }[];
    statusOptions: { value: string; label: string }[];
}

function filterQueryParams(filters: { type: string; status: string; q: string }): Record<string, string> {
    const p: Record<string, string> = {};
    if (filters.type) p.type = filters.type;
    if (filters.status) p.status = filters.status;
    if (filters.q.trim()) p.q = filters.q.trim();
    return p;
}

function optionLabel(options: { value: string; label: string }[], value: string): string | null {
    const hit = options.find((o) => o.value === value);
    return hit?.label ?? null;
}

export default function SolicitationsIndex({
    demands,
    solicitationsIndexUrl,
    modalDetail,
    canManage,
    filters: filtersProp,
    typeOptions,
    statusOptions,
}: Props) {
    const [modalTab, setModalTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState(filtersProp);

    useEffect(() => {
        if (modalDetail?.kind === 'solicitation' && modalDetail.payload?.solicitation?.id) {
            setModalTab(modalDetail.payload.solicitation.type === 'leader_chat' ? 'chat' : 'detalhes');
        }
        if (modalDetail?.kind === 'pastoral') {
            setModalTab('chat');
        }
    }, [modalDetail]);

    useEffect(() => {
        if (filterSheetOpen) {
            setDraftFilters(filtersProp);
        }
    }, [filterSheetOpen, filtersProp]);

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (filtersProp.type) n += 1;
        if (filtersProp.status) n += 1;
        if (filtersProp.q.trim()) n += 1;
        return n;
    }, [filtersProp]);

    const activeChips = useMemo(() => {
        const chips: { key: string; label: string }[] = [];
        if (filtersProp.type) {
            const lb = optionLabel(typeOptions, filtersProp.type);
            if (lb) chips.push({ key: 'type', label: lb });
        }
        if (filtersProp.status) {
            const lb = optionLabel(statusOptions, filtersProp.status);
            if (lb) chips.push({ key: 'status', label: lb });
        }
        if (filtersProp.q.trim()) {
            const q = filtersProp.q.trim();
            chips.push({
                key: 'q',
                label: q.length > 28 ? `${q.slice(0, 28)}…` : q,
            });
        }
        return chips;
    }, [filtersProp, typeOptions, statusOptions]);

    const closeModal = () => {
        setModalTab('detalhes');
        router.get(solicitationsIndexUrl, filterQueryParams(filtersProp), { preserveScroll: true, replace: true });
    };

    const openModal = (kind: DemandKind, id: number) => {
        router.get(
            solicitationsIndexUrl,
            { ...filterQueryParams(filtersProp), modal_kind: kind, modal_id: String(id) },
            { preserveScroll: true },
        );
    };

    const applyFiltersFromDraft = () => {
        router.get(solicitationsIndexUrl, filterQueryParams(draftFilters), { preserveScroll: true, replace: true });
        setFilterSheetOpen(false);
    };

    const clearFiltersAndApply = () => {
        const empty = { type: '', status: '', q: '' };
        setDraftFilters(empty);
        router.get(solicitationsIndexUrl, {}, { preserveScroll: true, replace: true });
        setFilterSheetOpen(false);
    };

    const removeChip = (key: string) => {
        const next = {
            type: key === 'type' ? '' : filtersProp.type,
            status: key === 'status' ? '' : filtersProp.status,
            q: key === 'q' ? '' : filtersProp.q,
        };
        router.get(solicitationsIndexUrl, filterQueryParams(next), { preserveScroll: true, replace: true });
    };

    const openFilterSheet = () => {
        setDraftFilters(filtersProp);
        setFilterSheetOpen(true);
    };

    const filterSheetSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        applyFiltersFromDraft();
    };

    const chatBadgeCount =
        modalDetail?.kind === 'solicitation' ? modalDetail.payload.messages?.length ?? 0 : 0;

    const tabBtn = (active: boolean) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`;

    return (
        <AdminLayout>
            <Head title="Atendimento" />
            <div className="space-y-5 sm:space-y-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Atendimento</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Pedidos formais, conversas «Falar com líder» e agendamentos pastor. Responda no separador Chat (vista tipo WhatsApp
                        Web) quando existir conversa.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                        {activeChips.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">A filtrar</span>
                                {activeChips.map((c) => (
                                    <button
                                        key={c.key}
                                        type="button"
                                        onClick={() => removeChip(c.key)}
                                        className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                                        title="Remover filtro"
                                    >
                                        <span className="truncate">{c.label}</span>
                                        <span
                                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-zinc-400 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-100"
                                            aria-hidden
                                        >
                                            ×
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">Lista completa — use filtros para afinar.</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={openFilterSheet}
                        className="relative inline-flex h-12 shrink-0 items-center justify-center gap-2 self-stretch rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-zinc-600 dark:hover:bg-zinc-800 sm:self-center"
                    >
                        <FunnelIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        Filtros
                        {activeFilterCount > 0 ? (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                                {activeFilterCount > 9 ? '9+' : activeFilterCount}
                            </span>
                        ) : null}
                    </button>
                </div>

                {demands.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                        Nenhum pedido por agora.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {demands.map((s) => (
                            <button
                                key={`${s.kind}_${s.id}`}
                                type="button"
                                onClick={() => openModal(s.kind, s.id)}
                                aria-label={`Abrir pedido: ${s.typeLabel}`}
                                className="group w-full cursor-pointer text-left rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40 active:scale-[0.998] touch-manipulation"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <InboxIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                                            <span className="font-semibold text-zinc-900 dark:text-white">{s.typeLabel}</span>
                                            <span className="ml-1 inline-flex rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                                {s.tagLabel}
                                            </span>
                                        </div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            {s.memberLabel} · {s.statusLabel}
                                            {s.preferredDate && (
                                                <>
                                                    {' '}
                                                    · Data: {s.preferredDate}
                                                </>
                                            )}
                                        </div>
                                        <div className="text-sm text-zinc-700 dark:text-zinc-200 mt-2 whitespace-pre-wrap line-clamp-3">
                                            {s.messageExcerpt}
                                        </div>
                                    </div>
                                    <ChevronRightIcon
                                        className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                                        aria-hidden
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                show={filterSheetOpen}
                onClose={() => setFilterSheetOpen(false)}
                maxWidth="md"
                footer={
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={clearFiltersAndApply}
                            className="text-center text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                            Limpar filtros
                        </button>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <SecondaryButton type="button" className="justify-center sm:w-auto" onClick={() => setFilterSheetOpen(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" form="solicitations-filter-form" className="justify-center sm:w-auto">
                                Aplicar filtros
                            </PrimaryButton>
                        </div>
                    </div>
                }
            >
                <div className="px-5 pb-2 pt-14 sm:px-6 sm:pt-16">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Filtros</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Escolha tipo, estado ou texto — só a lista muda ao tocar em «Aplicar filtros».</p>
                </div>
                <form id="solicitations-filter-form" onSubmit={filterSheetSubmit} className="space-y-4 px-5 pb-6 sm:px-6">
                    <div>
                        <label htmlFor="sol_f_type" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Tipo
                        </label>
                        <SelectInput
                            id="sol_f_type"
                            value={draftFilters.type}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, type: e.target.value }))}
                        >
                            {typeOptions.map((o) => (
                                <option key={o.value || 'all'} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <label htmlFor="sol_f_status" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Estado
                        </label>
                        <SelectInput
                            id="sol_f_status"
                            value={draftFilters.status}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
                        >
                            {statusOptions.map((o) => (
                                <option key={o.value || 'all-s'} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <label htmlFor="sol_f_q" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Pesquisar
                        </label>
                        <TextInput
                            id="sol_f_q"
                            type="search"
                            value={draftFilters.q}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, q: e.target.value }))}
                            placeholder="Nome ou texto do pedido"
                            className="w-full"
                        />
                    </div>
                </form>
            </Modal>

            <Modal
                show={modalDetail !== null}
                onClose={closeModal}
                disableBodyScroll
                maxWidth="2xl"
            >
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    <div className="flex shrink-0 items-start gap-3 border-b border-zinc-200 px-5 pb-3 pt-4 dark:border-zinc-800 sm:px-6 sm:pb-4 sm:pt-5">
                        <InboxIcon className="mt-0.5 h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <div className="min-w-0 flex-1 pr-10">
                            <h2 className="truncate text-lg font-semibold leading-tight text-zinc-900 dark:text-white">
                                {modalDetail?.kind === 'solicitation'
                                    ? (modalDetail.payload.solicitation.typeLabel ?? 'Pedido')
                                    : modalDetail?.kind === 'pastoral'
                                      ? modalDetail.payload.ticket.typeLabel
                                      : 'Pedido'}
                            </h2>
                            {modalDetail?.kind === 'solicitation' && modalDetail.payload.solicitation.memberLabel ? (
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Membro: <span className="font-medium text-zinc-700 dark:text-zinc-300">{modalDetail.payload.solicitation.memberLabel}</span>
                                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                                    <span className="font-mono text-zinc-400 dark:text-zinc-500">#{modalDetail.payload.solicitation.id}</span>
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {modalDetail && (
                        <>
                            <div className="shrink-0 border-b border-zinc-200 px-5 py-2 dark:border-zinc-800 sm:px-6">
                                <div className="inline-flex w-full max-w-md rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                                    <button
                                        type="button"
                                        className={`flex-1 ${tabBtn(modalTab === 'detalhes')}`}
                                        onClick={() => setModalTab('detalhes')}
                                    >
                                        Detalhes
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex flex-1 items-center justify-center gap-2 ${tabBtn(modalTab === 'chat')}`}
                                        onClick={() => setModalTab('chat')}
                                    >
                                        Chat
                                        {chatBadgeCount > 0 ? (
                                            <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white dark:bg-emerald-500">
                                                {chatBadgeCount > 99 ? '99+' : chatBadgeCount}
                                            </span>
                                        ) : null}
                                    </button>
                                </div>
                            </div>

                            <div
                                className={
                                    modalTab === 'chat'
                                        ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 sm:px-6 sm:py-4'
                                        : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 sm:py-5'
                                }
                            >
                                {modalDetail.kind === 'solicitation' && (
                                    <>
                                        {modalTab === 'detalhes' && (
                                            <SolicitationDetailPanel
                                                {...modalDetail.payload}
                                                variant="modal"
                                                section="details"
                                                composerRole="staff"
                                                canManage={canManage && modalDetail.payload.canManage}
                                            />
                                        )}
                                        {modalTab === 'chat' && (
                                            <SolicitationDetailPanel
                                                {...modalDetail.payload}
                                                variant="modal"
                                                section="chat"
                                                composerRole="staff"
                                                canManage={canManage && modalDetail.payload.canManage}
                                            />
                                        )}
                                    </>
                                )}

                                {modalDetail.kind === 'pastoral' && (
                                    <>
                                        {modalTab === 'detalhes' && (
                                            <SupportTicketDetailPanel {...modalDetail.payload} variant="modal" section="details" />
                                        )}
                                        {modalTab === 'chat' && (
                                            <SupportTicketDetailPanel {...modalDetail.payload} variant="modal" section="chat" />
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
