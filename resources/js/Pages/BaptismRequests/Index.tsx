import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { ChevronRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import AddButton from '@/Components/AddButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import SupportTicketDetailPanel, { type SupportTicketDetailPanelProps } from '@/Components/Support/SupportTicketDetailPanel';
import TextInput from '@/Components/TextInput';
import PageHeader from '@/Components/PageHeader';

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

type TabKey = 'pendente' | 'aguardando' | 'batizados' | 'arquivados';

type SolicitationModalPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'>;
type PastoralModalPayload = SupportTicketDetailPanelProps;

type ModalDetail =
    | { kind: 'solicitation'; payload: SolicitationModalPayload }
    | { kind: 'pastoral'; payload: PastoralModalPayload }
    | null;

interface Props {
    demands: DemandRow[];
    baptismIndexUrl: string;
    baptismStoreUrl: string;
    modalDetail: ModalDetail;
    canManage: boolean;
    filters: { aba: TabKey; q: string };
    tabCounts: Record<TabKey, number>;
    tabs: { key: TabKey; label: string }[];
}

const TAB_HINTS: Record<TabKey, string> = {
    pendente: 'Novos pedidos ainda não tratados pela equipe.',
    aguardando: 'Em acompanhamento até a data do batismo.',
    batizados: 'Batismos já realizados.',
    arquivados: 'Encerrados ou sem seguimento na lista ativa.',
};

const EMPTY_MESSAGES: Record<TabKey, string> = {
    pendente: 'Nenhum pedido pendente por agora.',
    aguardando: 'Nenhum pedido em acompanhamento.',
    batizados: 'Nenhum batismo registrado como realizado.',
    arquivados: 'Nenhum registro arquivado.',
};

function filterQueryParams(filters: { aba: TabKey; q: string }, extra: Record<string, string> = {}): Record<string, string> {
    const p: Record<string, string> = { aba: filters.aba, ...extra };
    if (filters.q.trim()) p.q = filters.q.trim();
    return p;
}

function baptismListTabClass(active: boolean): string {
    return [
        'inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px text-center sm:px-4',
        active
            ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
            : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
    ].join(' ');
}

function statusBadgeClass(status: string): string {
    const base = 'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ';
    switch (status) {
        case 'pending':
            return `${base} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200`;
        case 'waiting':
        case 'in_progress':
            return `${base} border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200`;
        case 'baptized':
        case 'completed':
            return `${base} border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200`;
        case 'archived':
        case 'cancelled':
            return `${base} border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`;
        default:
            return `${base} border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300`;
    }
}

export default function BaptismRequestsIndex({
    demands,
    baptismIndexUrl,
    baptismStoreUrl,
    modalDetail,
    canManage,
    filters: filtersProp,
    tabCounts,
    tabs,
}: Props) {
    const [modalTab, setModalTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [createOpen, setCreateOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(filtersProp);

    const createForm = useForm({
        type: 'baptism',
        message: '',
        preferred_date: '',
        return_to: 'baptism_admin' as const,
    });

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

    const goToTab = (aba: TabKey) => {
        const next = { ...localFilters, aba };
        setLocalFilters(next);
        router.get(baptismIndexUrl, filterQueryParams(next), { preserveScroll: false, replace: true });
    };

    const closeModal = () => {
        setModalTab('detalhes');
        router.get(baptismIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const openModal = (kind: DemandKind, id: number) => {
        router.get(
            baptismIndexUrl,
            filterQueryParams(localFilters, { modal_kind: kind, modal_id: String(id) }),
            { preserveScroll: true, preserveState: true, only: ['modalDetail'] },
        );
    };

    const detailModalOpen = modalDetail !== null;
    const overlayOpen = detailModalOpen || createOpen;

    const openCreate = () => {
        createForm.reset();
        createForm.setData({
            type: 'baptism',
            message: '',
            preferred_date: '',
            return_to: 'baptism_admin',
        });
        setCreateOpen(true);
    };

    const closeCreate = () => {
        setCreateOpen(false);
        createForm.reset();
    };

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(baptismStoreUrl, {
            preserveScroll: true,
            onSuccess: () => closeCreate(),
        });
    };

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(baptismIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const chatBadgeCount = useMemo(
        () => (modalDetail?.kind === 'solicitation' ? modalDetail.payload.messages?.length ?? 0 : 0),
        [modalDetail],
    );

    const tabBtn = (active: boolean) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`;

    const activeTabLabel = tabs.find((t) => t.key === localFilters.aba)?.label ?? 'Pendente';

    return (
        <AdminLayout modalOverlayOpen={overlayOpen}>
            <Head title="Batismo" />
            <FlashMessages />
            <div className={overlayOpen ? 'hidden' : undefined} aria-hidden={overlayOpen}>
                <PageHeader
                    title="Batismo"
                    subtitle="Lista e acompanhamento dos pedidos formais de batismo."
                    actions={
                        canManage ? (
                            <AddButton variant="icon" onClick={openCreate} title="Novo pedido de batismo">
                                Novo pedido de batismo
                            </AddButton>
                        ) : null
                    }
                />

                <div className="space-y-6">
                <nav
                    role="tablist"
                    aria-label="Situação dos pedidos de batismo"
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
                                className={baptismListTabClass(active)}
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
                    {TAB_HINTS[localFilters.aba]}{' '}
                    Use o <strong className="font-semibold">+</strong> para registrar um pedido ou toque num item para gestão
                    interna (situação, notas e chat). Outros tipos de pedido estão em{' '}
                    <Link
                        href={route('solicitations.index', { kind: 'solicitation' })}
                        className="font-semibold text-brand-700 underline dark:text-brand-400"
                    >
                        Atendimento Pastoral
                    </Link>
                    .
                </p>

                <form onSubmit={applyFilters} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="w-full sm:flex-1 sm:min-w-[14rem]">
                        <label htmlFor="bap_f_q" className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Pesquisar
                        </label>
                        <TextInput
                            id="bap_f_q"
                            type="search"
                            value={localFilters.q}
                            onChange={(e) => setLocalFilters((f) => ({ ...f, q: e.target.value }))}
                            placeholder="Nome do membro ou texto do pedido"
                            className="w-full"
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold uppercase tracking-widest text-white dark:bg-white dark:text-black"
                    >
                        Buscar
                    </button>
                </form>

                {demands.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                        {localFilters.q.trim()
                            ? `Nenhum resultado em «${activeTabLabel}» para esta busca.`
                            : EMPTY_MESSAGES[localFilters.aba]}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {demands.map((s) => (
                            <button
                                key={`${s.kind}_${s.id}`}
                                type="button"
                                onClick={() => openModal(s.kind, s.id)}
                                aria-label={`Abrir: ${s.memberLabel}`}
                                className="group w-full cursor-pointer touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.998] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <SparklesIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                                            <span className="font-semibold text-zinc-900 dark:text-white">{s.memberLabel}</span>
                                            <span className={statusBadgeClass(s.status)}>{s.statusLabel}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            {s.typeLabel}
                                            {s.preferredDate ? (
                                                <>
                                                    {' '}
                                                    · Data: {s.preferredDate}
                                                </>
                                            ) : null}
                                        </div>
                                        <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
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
            </div>

            <Modal show={createOpen} onClose={closeCreate} maxWidth="2xl" disableBodyScroll>
                <form onSubmit={submitCreate} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-6 sm:p-8">
                    <h2 className="pr-10 text-lg font-semibold text-zinc-900 dark:text-white">Novo pedido de batismo</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        O pedido fica vinculado ao seu usuário. Membros também podem enviar pelo app em Início → Batismo.
                    </p>
                    <div className="mt-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="bap_create_message" value="Mensagem" />
                            <Textarea
                                id="bap_create_message"
                                value={createForm.data.message}
                                onChange={(e) => createForm.setData('message', e.target.value)}
                                rows={6}
                                className="mt-1 block w-full"
                                placeholder="Detalhes do pedido de batismo…"
                                required
                            />
                            <InputError message={createForm.errors.message} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="bap_create_pref_date" value="Data pretendida (opcional)" />
                            <input
                                id="bap_create_pref_date"
                                type="date"
                                value={createForm.data.preferred_date}
                                onChange={(e) => createForm.setData('preferred_date', e.target.value)}
                                className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400"
                            />
                            <InputError message={createForm.errors.preferred_date} className="mt-1" />
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SecondaryButton type="button" onClick={closeCreate}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={createForm.processing || !createForm.data.message.trim()}>
                            Registrar pedido
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={detailModalOpen} onClose={closeModal} disableBodyScroll maxWidth="2xl">
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    <div className="flex shrink-0 items-start gap-3 border-b border-zinc-200 px-5 pb-3 pt-4 dark:border-zinc-800 sm:px-6 sm:pb-4 sm:pt-5">
                        <SparklesIcon className="mt-0.5 h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <div className="min-w-0 flex-1 pr-10">
                            <h2 className="truncate text-lg font-semibold leading-tight text-zinc-900 dark:text-white">
                                {modalDetail?.kind === 'solicitation'
                                    ? (modalDetail.payload.solicitation.memberLabel ?? 'Batismo')
                                    : modalDetail?.kind === 'pastoral'
                                      ? modalDetail.payload.ticket.typeLabel
                                      : 'Batismo'}
                            </h2>
                            {modalDetail?.kind === 'solicitation' ? (
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span className={statusBadgeClass(modalDetail.payload.solicitation.status)}>
                                        {modalDetail.payload.solicitation.statusLabel}
                                    </span>
                                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                                    <span className="font-mono text-zinc-400 dark:text-zinc-500">
                                        #{modalDetail.payload.solicitation.id}
                                    </span>
                                </p>
                            ) : null}
                        </div>
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
                                                preserveStateOnPanelActions
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
