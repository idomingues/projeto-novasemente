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
    message: string;
    solutionText: string | null;
    createdAt: string;
    updatedAt: string;
    ownerLabel: string;
};

type ModalPayload = Omit<SupportTicketDetailPanelProps, 'variant' | 'section'>;

interface Props {
    tickets: TicketRow[];
    devItemStoreUrl: string;
    supportIndexUrl: string;
    modalDetail: ModalPayload | null;
    canCreateDevItem?: boolean;
}

export default function SupportIndex({ tickets, devItemStoreUrl, supportIndexUrl, modalDetail, canCreateDevItem = false }: Props) {
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
        router.get(supportIndexUrl, {}, { preserveScroll: true, replace: true });
    };

    const openTicketModal = (token: string) => {
        router.get(supportIndexUrl, { modal: token }, { preserveScroll: true });
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

                {tickets.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-600 dark:text-zinc-400">
                        Nenhum chamado encontrado.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tickets.map((t) => (
                            <button
                                key={t.publicToken}
                                type="button"
                                onClick={() => openTicketModal(t.publicToken)}
                                aria-label={`Abrir chamado: ${t.typeLabel}`}
                                className="group w-full cursor-pointer text-left rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40 active:scale-[0.998] touch-manipulation"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary-500 shrink-0" />
                                            <span className="font-semibold text-zinc-900 dark:text-white">{t.typeLabel}</span>
                                        </div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            {t.ownerLabel} · {t.status === 'open' ? 'Em andamento' : 'Encerrado'}
                                        </div>
                                        <div className="text-sm text-zinc-700 dark:text-zinc-200 mt-2 whitespace-pre-wrap line-clamp-3">
                                            {t.message}
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
