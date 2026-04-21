import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { ChevronRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import SupportTicketDetailPanel, { type SupportTicketDetailPanelProps } from '@/Components/Support/SupportTicketDetailPanel';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import AddButton from '@/Components/AddButton';
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

type SolicitationModalPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'>;
type PastoralModalPayload = SupportTicketDetailPanelProps;

type ModalDetail =
    | { kind: 'solicitation'; payload: SolicitationModalPayload }
    | { kind: 'pastoral'; payload: PastoralModalPayload }
    | null;

interface Props {
    demands: DemandRow[];
    baptismIndexUrl: string;
    modalDetail: ModalDetail;
    canManage: boolean;
    filters: { status: string; q: string };
    statusOptions: { value: string; label: string }[];
}

function filterQueryParams(filters: { status: string; q: string }): Record<string, string> {
    const p: Record<string, string> = {};
    if (filters.status) p.status = filters.status;
    if (filters.q.trim()) p.q = filters.q.trim();
    return p;
}

export default function BaptismRequestsIndex({
    demands,
    baptismIndexUrl,
    modalDetail,
    canManage,
    filters: filtersProp,
    statusOptions,
}: Props) {
    const [modalTab, setModalTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [localFilters, setLocalFilters] = useState(filtersProp);

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

    const closeModal = () => {
        setModalTab('detalhes');
        router.get(baptismIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const openModal = (kind: DemandKind, id: number) => {
        router.get(
            baptismIndexUrl,
            { ...filterQueryParams(localFilters), modal_kind: kind, modal_id: String(id) },
            { preserveScroll: true },
        );
    };

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(baptismIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const tabBtn = (active: boolean) =>
        `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    return (
        <AdminLayout>
            <Head title="Pedidos de batismo" />
            <PageHeader
                title="Pedidos de batismo"
                subtitle="Lista e tratamento dos pedidos formais de batismo."
                actions={
                    <AddButton variant="icon" onClick={() => router.visit(route('mobile.baptism'))} title="Novo pedido (membro)">
                        Novo pedido (membro)
                    </AddButton>
                }
            />

            <div className="space-y-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    O botão + abre o formulário como no app do membro. Para outros tipos de pedido, use{' '}
                    <Link href={route('solicitations.index', { kind: 'solicitation' })} className="font-semibold text-brand-700 underline dark:text-brand-400">
                        Atendimento
                    </Link>
                    .
                </p>

                <form onSubmit={applyFilters} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="w-full sm:w-auto sm:min-w-[10rem]">
                        <label htmlFor="bap_f_status" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Estado
                        </label>
                        <SelectInput
                            id="bap_f_status"
                            value={localFilters.status}
                            onChange={(e) => setLocalFilters((f) => ({ ...f, status: e.target.value }))}
                        >
                            {statusOptions.map((o) => (
                                <option key={o.value || 'all-s'} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div className="w-full sm:flex-1 sm:min-w-[12rem]">
                        <label htmlFor="bap_f_q" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Pesquisar
                        </label>
                        <TextInput
                            id="bap_f_q"
                            type="search"
                            value={localFilters.q}
                            onChange={(e) => setLocalFilters((f) => ({ ...f, q: e.target.value }))}
                            placeholder="Nome ou texto do pedido"
                            className="w-full"
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-white px-6 text-sm font-semibold uppercase tracking-widest text-white dark:text-black"
                    >
                        Filtrar
                    </button>
                </form>

                {demands.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                        Nenhum pedido de batismo por agora.
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
                                            <SparklesIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
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
                show={modalDetail !== null}
                onClose={closeModal}
                maxWidth={modalDetail?.kind === 'pastoral' ? '2xl' : (modalDetail?.kind === 'solicitation' && modalDetail.payload.solicitation.type === 'leader_chat' ? '2xl' : 'lg')}
            >
                <div
                    className={`flex min-h-0 w-full flex-col overflow-hidden ${
                        modalDetail?.kind === 'pastoral' || (modalDetail?.kind === 'solicitation' && modalDetail.payload.solicitation.type === 'leader_chat')
                            ? 'max-h-[min(90dvh,820px)]'
                            : 'max-h-[min(85dvh,720px)]'
                    }`}
                >
                    <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
                        <SparklesIcon className="h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <h2 className="min-w-0 truncate text-lg font-semibold text-zinc-900 dark:text-white">
                            {modalDetail?.kind === 'solicitation'
                                ? (modalDetail.payload.solicitation.typeLabel ?? 'Pedido')
                                : (modalDetail?.kind === 'pastoral' ? modalDetail.payload.ticket.typeLabel : 'Pedido')}
                        </h2>
                    </div>

                    {modalDetail && (
                        <>
                            <div className="flex shrink-0 border-b border-zinc-200 px-5 dark:border-zinc-800 sm:px-6">
                                <button type="button" className={tabBtn(modalTab === 'detalhes')} onClick={() => setModalTab('detalhes')}>
                                    Detalhes
                                </button>
                                <button type="button" className={tabBtn(modalTab === 'chat')} onClick={() => setModalTab('chat')}>
                                    Chat
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
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
