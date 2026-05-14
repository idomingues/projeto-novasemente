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
import SupportTicketDetailPanel, { type SupportTicketDetailPanelProps } from '@/Components/Support/SupportTicketDetailPanel';

type TicketRow = {
    publicToken: string;
    typeLabel: string;
    status: string;
    statusLabel: string;
    message: string;
    solutionText: string | null;
    createdAt: string;
    updatedAt: string;
    ownerLabel: string;
};

type StatusOption = {
    value: string;
    label: string;
};

type ModalPayload = Omit<SupportTicketDetailPanelProps, 'variant' | 'section'>;

interface Props {
    tickets: TicketRow[];
    devItemStoreUrl: string;
    supportIndexUrl: string;
    modalDetail: ModalPayload | null;
    canCreateDevItem?: boolean;
    statusFilter: string;
    statusOptions: StatusOption[];
}

export default function SupportIndex({
    tickets,
    devItemStoreUrl,
    supportIndexUrl,
    modalDetail,
    canCreateDevItem = false,
    statusFilter,
    statusOptions,
}: Props) {
    const inertiaScrollOpts = { preserveScroll: true };
    const [modalTab, setModalTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [createOpen, setCreateOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        message: '',
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
            onSuccess: () => reset('message'),
        });
    };

    const tabBtn = (active: boolean) =>
        `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    return (
        <AdminLayout>
            <Head title="Suporte do app" />
            <div className="space-y-6">
                <PageHeader
                    title="Suporte do app"
                    subtitle="Chamados da app e itens internos que a equipe vai desenvolver."
                    actions={
                        canCreateDevItem ? (
                            <AddButton variant="icon" onClick={openCreateModal} title="Novo item a desenvolver">
                                Novo item a desenvolver
                            </AddButton>
                        ) : undefined
                    }
                />

                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((opt) => {
                        const active = statusFilter === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => applyStatusFilter(opt.value)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                    active
                                        ? `${statusFilterTone(opt.value)} ring-1 ring-current/20`
                                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {tickets.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                        Nenhum chamado encontrado.
                    </div>
                ) : (
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
                                        </div>
                                        <div className="text-sm text-zinc-700 dark:text-zinc-200 mt-2 whitespace-pre-wrap line-clamp-3">
                                            {t.message}
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
                )}
            </div>

            <Modal show={showModal} onClose={closeSupportModal} maxWidth="lg">
                <div className="flex min-h-0 max-h-[min(85dvh,720px)] w-full flex-col overflow-hidden">
                    <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
                        <WrenchScrewdriverIcon className="h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <h2 className="min-w-0 truncate text-lg font-semibold text-zinc-900 dark:text-white">
                            {modalDetail ? modalDetail.ticket.typeLabel : 'Novo item a desenvolver'}
                        </h2>
                    </div>

                    <div className="flex shrink-0 border-b border-zinc-200 px-5 dark:border-zinc-800 sm:px-6">
                        <button type="button" className={tabBtn(modalTab === 'detalhes')} onClick={() => setModalTab('detalhes')}>
                            Detalhes
                        </button>
                        <button
                            type="button"
                            className={tabBtn(modalTab === 'chat')}
                            disabled={!modalDetail}
                            onClick={() => setModalTab('chat')}
                            title={!modalDetail ? 'Guarde o item na aba Detalhes para usar o chat' : undefined}
                        >
                            Chat
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
                        {modalTab === 'detalhes' && createOpen && !modalDetail && (
                            <form onSubmit={submitDevItem} className="space-y-4">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Descreva a funcionalidade ou correção a planear. Depois de criar, pode conversar com a equipe na
                                    aba Chat (quando aplicável).
                                </p>
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
                                        Criar item
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
