import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import AddButton from '@/Components/AddButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { ChevronRightIcon, FunnelIcon, InboxIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import PersonListIdentity from '@/Components/PersonListIdentity';
import PersonModalHeader from '@/Components/PersonModalHeader';
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
    memberPhotoUrl?: string | null;
};

type TabKey = 'pendente' | 'concluidos' | 'cancelados' | 'arquivados';

type SolicitationModalPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'>;
type PastoralModalPayload = SupportTicketDetailPanelProps;

type ModalDetail =
    | { kind: 'solicitation'; payload: SolicitationModalPayload }
    | { kind: 'pastoral'; payload: PastoralModalPayload }
    | null;

type SelectOpt = { value: number; label: string };

interface Props {
    demands: DemandRow[];
    solicitationsIndexUrl: string;
    modalDetail: ModalDetail;
    canManage: boolean;
    filters: { aba: TabKey; type: string; q: string; kind: string };
    tabCounts: Record<TabKey, number>;
    tabs: { key: TabKey; label: string }[];
    typeOptions: { value: string; label: string }[];
    informalPastoralStoreUrl: string | null;
    pastorOptions: SelectOpt[];
    memberUserOptions: SelectOpt[];
}

const TAB_HINTS: Record<TabKey, string> = {
    pendente: 'Pedidos e agendamentos a aguardar atendimento.',
    concluidos: 'Pedidos concluídos e agendamentos confirmados ou realizados.',
    cancelados: 'Pedidos cancelados ou agendamentos cancelados.',
    arquivados: 'Fora da lista ativa — apenas pedidos formais arquivados pela equipe.',
};

const EMPTY_MESSAGES: Record<TabKey, string> = {
    pendente: 'Nenhum pedido pendente por agora.',
    concluidos: 'Nenhum pedido concluído nesta lista.',
    cancelados: 'Nenhum pedido cancelado.',
    arquivados: 'Nenhum pedido arquivado.',
};

function filterQueryParams(
    filters: { aba: TabKey; type: string; q: string; kind: string },
    extra: Record<string, string> = {},
): Record<string, string> {
    const p: Record<string, string> = { aba: filters.aba, ...extra };
    if (filters.type) p.type = filters.type;
    if (filters.kind) p.kind = filters.kind;
    if (filters.q.trim()) p.q = filters.q.trim();
    return p;
}

function listTabClass(active: boolean): string {
    return [
        'inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px text-center sm:px-4',
        active
            ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
            : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
    ].join(' ');
}

function statusBadgeClass(status: string): string {
    const base = 'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ';
    switch (status) {
        case 'pending':
        case 'in_progress':
            return `${base} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200`;
        case 'waiting':
        case 'confirmed':
            return `${base} border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200`;
        case 'completed':
        case 'baptized':
            return `${base} border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200`;
        case 'cancelled':
            return `${base} border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200`;
        case 'archived':
            return `${base} border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`;
        default:
            return `${base} border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300`;
    }
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
    tabCounts,
    tabs,
    typeOptions,
    informalPastoralStoreUrl,
    pastorOptions,
    memberUserOptions,
}: Props) {
    const [modalTab, setModalTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [createInformalOpen, setCreateInformalOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(filtersProp);
    const [draftFilters, setDraftFilters] = useState(filtersProp);

    const informalForm = useForm({
        requester_user_id: '' as string | number,
        requester_name: '',
        assigned_pastor_id: '' as string | number,
        subject: '',
        message: '',
        internal_notes: '',
        preferred_date: '',
        status: 'completed' as 'pending' | 'completed',
    });

    const canRegisterInformal = canManage && informalPastoralStoreUrl !== null;
    const informalUsesMemberAccount =
        informalForm.data.requester_user_id !== '' && informalForm.data.requester_user_id !== null;

    useEffect(() => {
        setLocalFilters(filtersProp);
    }, [filtersProp]);

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
            setDraftFilters(localFilters);
        }
    }, [filterSheetOpen, localFilters]);

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (localFilters.type) n += 1;
        if (localFilters.q.trim()) n += 1;
        return n;
    }, [localFilters]);

    const activeChips = useMemo(() => {
        const chips: { key: string; label: string }[] = [];
        if (localFilters.type) {
            const lb = optionLabel(typeOptions, localFilters.type);
            if (lb) chips.push({ key: 'type', label: lb });
        }
        if (localFilters.q.trim()) {
            const q = localFilters.q.trim();
            chips.push({ key: 'q', label: q.length > 28 ? `${q.slice(0, 28)}…` : q });
        }
        return chips;
    }, [localFilters, typeOptions]);

    const goToTab = (aba: TabKey) => {
        const next = { ...localFilters, aba };
        setLocalFilters(next);
        router.get(solicitationsIndexUrl, filterQueryParams(next), { preserveScroll: false, replace: true });
    };

    const closeModal = () => {
        setModalTab('detalhes');
        router.get(solicitationsIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const openModal = (kind: DemandKind, id: number) => {
        router.get(
            solicitationsIndexUrl,
            filterQueryParams(localFilters, { modal_kind: kind, modal_id: String(id) }),
            { preserveScroll: true },
        );
    };

    const applySearch: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(solicitationsIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const applyFiltersFromDraft = () => {
        setLocalFilters(draftFilters);
        router.get(solicitationsIndexUrl, filterQueryParams(draftFilters), { preserveScroll: true, replace: true });
        setFilterSheetOpen(false);
    };

    const clearFiltersAndApply = () => {
        const empty = { ...localFilters, type: '', q: '' };
        setLocalFilters(empty);
        setDraftFilters(empty);
        router.get(solicitationsIndexUrl, filterQueryParams(empty), { preserveScroll: true, replace: true });
        setFilterSheetOpen(false);
    };

    const removeChip = (key: string) => {
        const next = {
            ...localFilters,
            type: key === 'type' ? '' : localFilters.type,
            q: key === 'q' ? '' : localFilters.q,
        };
        setLocalFilters(next);
        router.get(solicitationsIndexUrl, filterQueryParams(next), { preserveScroll: true, replace: true });
    };

    const filterSheetSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        applyFiltersFromDraft();
    };

    const openCreateInformal = () => {
        informalForm.reset();
        informalForm.clearErrors();
        informalForm.setData('status', 'completed');
        setCreateInformalOpen(true);
    };

    const closeCreateInformal = () => {
        setCreateInformalOpen(false);
        informalForm.reset();
        informalForm.clearErrors();
    };

    const submitInformalPastoral: FormEventHandler = (e) => {
        e.preventDefault();
        if (!informalPastoralStoreUrl) return;

        const payload: Record<string, string | number | null> = {
            requester_name: informalUsesMemberAccount ? '' : informalForm.data.requester_name.trim(),
            assigned_pastor_id:
                informalForm.data.assigned_pastor_id === '' ? null : Number(informalForm.data.assigned_pastor_id),
            subject: informalForm.data.subject.trim(),
            message: informalForm.data.message.trim(),
            internal_notes: informalForm.data.internal_notes.trim() || null,
            preferred_date: informalForm.data.preferred_date || null,
            status: informalForm.data.status,
        };

        if (informalUsesMemberAccount) {
            payload.requester_user_id = Number(informalForm.data.requester_user_id);
        } else {
            payload.requester_user_id = null;
        }

        router.post(informalPastoralStoreUrl, payload, {
            preserveScroll: true,
            onSuccess: () => closeCreateInformal(),
            onError: (errors) => informalForm.setError(errors),
        });
    };

    const chatBadgeCount =
        modalDetail?.kind === 'solicitation' ? modalDetail.payload.messages?.length ?? 0 : 0;

    const tabBtn = (active: boolean) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`;

    const activeTabLabel = tabs.find((t) => t.key === localFilters.aba)?.label ?? 'Pendente';

    return (
        <AdminLayout>
            <Head title="Atendimento Pastoral" />
            <FlashMessages />
            <div className="space-y-5 sm:space-y-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                            Atendimento Pastoral
                        </h1>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Pedidos formais, conversas com líder e agendamentos pastor. Batismo tem tela própria no menu.
                        </p>
                    </div>
                    {canRegisterInformal ? (
                        <AddButton
                            variant="icon"
                            onClick={openCreateInformal}
                            title="Registrar atendimento acionado informalmente"
                            className="shrink-0"
                        >
                            Registrar atendimento
                        </AddButton>
                    ) : null}
                </div>

                <nav
                    role="tablist"
                    aria-label="Situação do atendimento pastoral"
                    className="flex flex-wrap border-b border-zinc-200 dark:border-zinc-800"
                >
                    {tabs.map((tab) => {
                        const count = tabCounts[tab.key] ?? 0;
                        const active = localFilters.aba === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                className={listTabClass(active)}
                                onClick={() => goToTab(tab.key)}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                                        active
                                            ? 'bg-teal-600 text-white dark:bg-teal-500'
                                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                                    }`}
                                >
                                    {count > 99 ? '99+' : count}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{activeTabLabel}:</span>{' '}
                    {TAB_HINTS[localFilters.aba]}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <form onSubmit={applySearch} className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="sol_q" className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Pesquisar
                            </label>
                            <TextInput
                                id="sol_q"
                                type="search"
                                value={localFilters.q}
                                onChange={(e) => setLocalFilters((f) => ({ ...f, q: e.target.value }))}
                                placeholder="Nome ou texto do pedido"
                                className="w-full"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold uppercase tracking-widest text-white dark:bg-white dark:text-black"
                        >
                            Buscar
                        </button>
                    </form>
                    <button
                        type="button"
                        onClick={() => setFilterSheetOpen(true)}
                        className="relative inline-flex h-12 shrink-0 items-center justify-center gap-2 self-stretch rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-zinc-600 dark:hover:bg-zinc-800 sm:self-end"
                    >
                        <FunnelIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        Tipo
                        {activeFilterCount > 0 ? (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                                {activeFilterCount > 9 ? '9+' : activeFilterCount}
                            </span>
                        ) : null}
                    </button>
                </div>

                {activeChips.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            Filtros
                        </span>
                        {activeChips.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                onClick={() => removeChip(c.key)}
                                className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200"
                                title="Remover filtro"
                            >
                                <span className="truncate">{c.label}</span>
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
                                    ×
                                </span>
                            </button>
                        ))}
                    </div>
                ) : null}

                {demands.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                        {localFilters.q.trim() || localFilters.type
                            ? `Nenhum resultado em «${activeTabLabel}» com estes filtros.`
                            : EMPTY_MESSAGES[localFilters.aba]}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {demands.map((s) => (
                            <button
                                key={`${s.kind}_${s.id}`}
                                type="button"
                                onClick={() => openModal(s.kind, s.id)}
                                aria-label={`Abrir: ${s.typeLabel}`}
                                className="group w-full cursor-pointer touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.998] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        {s.memberLabel ? (
                                            <div className="mb-3">
                                                <PersonListIdentity
                                                    name={s.memberLabel}
                                                    photoUrl={s.memberPhotoUrl}
                                                    nameClassName="font-semibold text-zinc-900 dark:text-white"
                                                />
                                            </div>
                                        ) : null}
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <InboxIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                                            <span className="font-semibold text-zinc-900 dark:text-white">{s.typeLabel}</span>
                                            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                                                {s.tagLabel}
                                            </span>
                                            <span className={statusBadgeClass(s.status)}>{s.statusLabel}</span>
                                        </div>
                                        {s.preferredDate ? (
                                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Data: {s.preferredDate}
                                            </div>
                                        ) : null}
                                        <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                                            {s.messageExcerpt}
                                        </div>
                                    </div>
                                    <ChevronRightIcon
                                        className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-500"
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
                            className="text-center text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400"
                        >
                            Limpar filtros
                        </button>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <SecondaryButton type="button" className="justify-center sm:w-auto" onClick={() => setFilterSheetOpen(false)}>
                                Fechar
                            </SecondaryButton>
                            <PrimaryButton type="submit" form="solicitations-filter-form" className="justify-center sm:w-auto">
                                Aplicar
                            </PrimaryButton>
                        </div>
                    </div>
                }
            >
                <div className="px-5 pb-2 pt-14 sm:px-6 sm:pt-16">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Filtrar por tipo</h2>
                </div>
                <form id="solicitations-filter-form" onSubmit={filterSheetSubmit} className="space-y-4 px-5 pb-6 sm:px-6">
                    <div>
                        <label htmlFor="sol_f_type" className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Tipo de pedido
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
                </form>
            </Modal>

            <Modal show={createInformalOpen} onClose={closeCreateInformal} maxWidth="lg">
                <div className="px-5 pb-6 pt-14 sm:px-6 sm:pt-16">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Registrar atendimento pastoral</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Para contatos fora do app (telefone, presencial, indicação). O membro só recebe chat se tiver conta
                        vinculada abaixo.
                    </p>
                    <form onSubmit={submitInformalPastoral} className="mt-5 space-y-4">
                        <div>
                            <InputLabel htmlFor="inf_member" value="Membro com conta na app (opcional)" />
                            <SelectInput
                                id="inf_member"
                                className="mt-1 block w-full"
                                value={informalForm.data.requester_user_id}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    informalForm.setData('requester_user_id', v);
                                    if (v !== '') {
                                        const hit = memberUserOptions.find((o) => String(o.value) === v);
                                        if (hit) {
                                            informalForm.setData('requester_name', hit.label);
                                        }
                                    }
                                }}
                            >
                                <option value="">Sem conta / só nome abaixo</option>
                                {memberUserOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        {!informalUsesMemberAccount ? (
                            <div>
                                <InputLabel htmlFor="inf_name" value="Nome de quem foi atendido" />
                                <TextInput
                                    id="inf_name"
                                    className="mt-1 block w-full"
                                    value={informalForm.data.requester_name}
                                    onChange={(e) => informalForm.setData('requester_name', e.target.value)}
                                    required
                                />
                                <InputError message={informalForm.errors.requester_name} className="mt-1" />
                            </div>
                        ) : null}
                        <div>
                            <InputLabel htmlFor="inf_pastor" value="Pastor (opcional)" />
                            <SelectInput
                                id="inf_pastor"
                                className="mt-1 block w-full"
                                value={informalForm.data.assigned_pastor_id}
                                onChange={(e) => informalForm.setData('assigned_pastor_id', e.target.value)}
                            >
                                <option value="">Não atribuído</option>
                                {pastorOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        <div>
                            <InputLabel htmlFor="inf_subject" value="Assunto (opcional)" />
                            <TextInput
                                id="inf_subject"
                                className="mt-1 block w-full"
                                value={informalForm.data.subject}
                                onChange={(e) => informalForm.setData('subject', e.target.value)}
                                placeholder="Atendimento pastoral informal"
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="inf_message" value="Resumo do atendimento" />
                            <Textarea
                                id="inf_message"
                                className="mt-1 block w-full"
                                rows={4}
                                value={informalForm.data.message}
                                onChange={(e) => informalForm.setData('message', e.target.value)}
                                required
                            />
                            <InputError message={informalForm.errors.message} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="inf_date" value="Data do atendimento (opcional)" />
                            <TextInput
                                id="inf_date"
                                type="date"
                                className="mt-1 block w-full"
                                value={informalForm.data.preferred_date}
                                onChange={(e) => informalForm.setData('preferred_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="inf_status" value="Situação" />
                            <SelectInput
                                id="inf_status"
                                className="mt-1 block w-full"
                                value={informalForm.data.status}
                                onChange={(e) =>
                                    informalForm.setData('status', e.target.value as 'pending' | 'completed')
                                }
                            >
                                <option value="completed">Concluído (já realizado)</option>
                                <option value="pending">Pendente (acompanhamento)</option>
                            </SelectInput>
                        </div>
                        <div>
                            <InputLabel htmlFor="inf_notes" value="Notas internas (opcional)" />
                            <Textarea
                                id="inf_notes"
                                className="mt-1 block w-full"
                                rows={2}
                                value={informalForm.data.internal_notes}
                                onChange={(e) => informalForm.setData('internal_notes', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <SecondaryButton type="button" onClick={closeCreateInformal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={informalForm.processing}>
                                Salvar registro
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal show={modalDetail !== null} onClose={closeModal} disableBodyScroll maxWidth="2xl">
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    <div className="shrink-0 border-b border-zinc-200 px-5 pb-3 pt-4 dark:border-zinc-800 sm:px-6 sm:pb-4 sm:pt-5">
                        {modalDetail?.kind === 'solicitation' ? (
                            <PersonModalHeader
                                person={{
                                    name: modalDetail.payload.solicitation.memberLabel ?? null,
                                    photoUrl: modalDetail.payload.solicitation.memberPhotoUrl,
                                }}
                                subtitle={modalDetail.payload.solicitation.typeLabel ?? 'Pedido'}
                                badge={modalDetail.payload.solicitation.statusLabel}
                                onClose={closeModal}
                            />
                        ) : modalDetail?.kind === 'pastoral' ? (
                            <PersonModalHeader
                                person={{
                                    name: modalDetail.payload.ticket.ownerLabel,
                                    photoUrl: modalDetail.payload.ticket.ownerPhotoUrl,
                                }}
                                subtitle={modalDetail.payload.ticket.typeLabel}
                                badge={modalDetail.payload.ticket.statusLabel ?? modalDetail.payload.ticket.status}
                                onClose={closeModal}
                            />
                        ) : (
                            <h2 className="pr-10 text-lg font-semibold text-zinc-900 dark:text-white">Pedido</h2>
                        )}
                    </div>

                    {modalDetail && (
                        <>
                            <div className="shrink-0 border-b border-zinc-200 px-5 py-2 dark:border-zinc-800 sm:px-6">
                                <div className="inline-flex w-full max-w-md rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                                    <button type="button" className={`flex-1 ${tabBtn(modalTab === 'detalhes')}`} onClick={() => setModalTab('detalhes')}>
                                        Detalhes
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex flex-1 items-center justify-center gap-2 ${tabBtn(modalTab === 'chat')}`}
                                        onClick={() => setModalTab('chat')}
                                    >
                                        Chat
                                        {chatBadgeCount > 0 ? (
                                            <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
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
                                                preserveStateOnPanelActions
                                                onPanelActionSuccess={() => {
                                                    router.reload({
                                                        only: ['modalDetail', 'demands', 'tabCounts', 'filters'],
                                                    });
                                                }}
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
