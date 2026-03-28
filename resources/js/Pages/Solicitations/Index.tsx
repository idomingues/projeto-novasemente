import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { ChevronRightIcon, InboxIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import TextInput from '@/Components/TextInput';

type SolicitationRow = {
    id: number;
    typeLabel: string;
    status: string;
    statusLabel: string;
    messageExcerpt: string;
    preferredDate: string | null;
    updatedAt: string;
    memberLabel: string;
};

type ModalPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'>;

interface Props {
    solicitations: SolicitationRow[];
    solicitationsIndexUrl: string;
    modalDetail: ModalPayload | null;
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

export default function SolicitationsIndex({
    solicitations,
    solicitationsIndexUrl,
    modalDetail,
    canManage,
    filters: filtersProp,
    typeOptions,
    statusOptions,
}: Props) {
    const inertiaScrollOpts = { preserveScroll: true };
    const [modalTab, setModalTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [localFilters, setLocalFilters] = useState(filtersProp);

    useEffect(() => {
        setLocalFilters(filtersProp);
    }, [filtersProp]);

    useEffect(() => {
        if (modalDetail?.solicitation.id) {
            setModalTab('detalhes');
        }
    }, [modalDetail?.solicitation.id]);

    const closeModal = () => {
        setModalTab('detalhes');
        router.get(solicitationsIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const openModal = (id: number) => {
        router.get(solicitationsIndexUrl, { ...filterQueryParams(localFilters), modal: String(id) }, { preserveScroll: true });
    };

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(solicitationsIndexUrl, filterQueryParams(localFilters), { preserveScroll: true, replace: true });
    };

    const tabBtn = (active: boolean) =>
        `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    return (
        <AdminLayout>
            <Head title="Solicitações" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Solicitações</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Inbox de pedidos (batismo, apresentação, visita, estudo bíblico) e conversa com os membros.
                    </p>
                </div>

                <form onSubmit={applyFilters} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="w-full sm:w-auto sm:min-w-[10rem]">
                        <label htmlFor="sol_f_type" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Tipo
                        </label>
                        <select
                            id="sol_f_type"
                            value={localFilters.type}
                            onChange={(e) => setLocalFilters((f) => ({ ...f, type: e.target.value }))}
                            className="block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                        >
                            {typeOptions.map((o) => (
                                <option key={o.value || 'all'} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full sm:w-auto sm:min-w-[10rem]">
                        <label htmlFor="sol_f_status" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Estado
                        </label>
                        <select
                            id="sol_f_status"
                            value={localFilters.status}
                            onChange={(e) => setLocalFilters((f) => ({ ...f, status: e.target.value }))}
                            className="block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                        >
                            {statusOptions.map((o) => (
                                <option key={o.value || 'all-s'} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full sm:flex-1 sm:min-w-[12rem]">
                        <label htmlFor="sol_f_q" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Pesquisar
                        </label>
                        <TextInput
                            id="sol_f_q"
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

                {solicitations.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                        Nenhum pedido por agora.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {solicitations.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => openModal(s.id)}
                                aria-label={`Abrir pedido: ${s.typeLabel}`}
                                className="group w-full cursor-pointer text-left rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40 active:scale-[0.998] touch-manipulation"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <InboxIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                                            <span className="font-semibold text-zinc-900 dark:text-white">{s.typeLabel}</span>
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

            <Modal show={modalDetail !== null} onClose={closeModal} maxWidth="lg">
                <div className="flex max-h-[min(85vh,720px)] w-full flex-col overflow-hidden">
                    <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
                        <InboxIcon className="h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <h2 className="min-w-0 truncate text-lg font-semibold text-zinc-900 dark:text-white">
                            {modalDetail?.solicitation.typeLabel ?? 'Pedido'}
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
                                {modalTab === 'detalhes' && (
                                    <SolicitationDetailPanel
                                        {...modalDetail}
                                        variant="modal"
                                        section="details"
                                        composerRole="staff"
                                        canManage={canManage && modalDetail.canManage}
                                    />
                                )}
                                {modalTab === 'chat' && (
                                    <SolicitationDetailPanel
                                        {...modalDetail}
                                        variant="modal"
                                        section="chat"
                                        composerRole="staff"
                                        canManage={canManage && modalDetail.canManage}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
