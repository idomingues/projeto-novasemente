import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm } from '@inertiajs/react';
import {
    BookOpenIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EllipsisHorizontalCircleIcon,
    HandRaisedIcon,
    PencilSquareIcon,
    PlusIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import SolicitationDetailPanel, {
    type MemberPastorOption,
    type SolicitationDetailShape,
    type SolicitationMessageRow,
} from '@/Components/Solicitations/SolicitationDetailPanel';
import type { ComponentType, SVGProps } from 'react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TypeItem {
    type: string;
    label: string;
}

interface PastorOption {
    value: number;
    label: string;
}

export interface SolicitationHubRow {
    solicitation: SolicitationDetailShape;
    messages: SolicitationMessageRow[];
    canChat: boolean;
    messageStoreUrl: string;
    hubUrl: string;
    mineUrl: string;
    memberUpdateUrl: string;
    memberCanEditDetails: boolean;
    memberPastorOptions: MemberPastorOption[];
    canFinalizeLeaderChat?: boolean;
    finalizeLeaderChatUrl?: string | null;
    memberHideConversationUrl?: string | null;
    leaderHideConversationUrl?: string | null;
}

interface Props {
    types: TypeItem[];
    mineUrl: string;
    storeUrl: string;
    pastorOptions: PastorOption[];
    mySolicitations: SolicitationHubRow[];
    /** Ecrã dedicado a batismo (menu principal mobile). */
    pageTitle?: string;
    pageSubtitle?: string;
    singleBaptismType?: boolean;
    /** Redirecionamento após «excluir da minha app» (batismo vs hub geral). */
    hideConversationReturnTo?: 'hub' | 'baptism_hub';
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

function iconForSolicitationType(type: string): IconComponent {
    switch (type) {
        case 'baptism':
            return SparklesIcon;
        case 'baby_presentation':
            return HandRaisedIcon;
        case 'pastor_visit':
            return UserGroupIcon;
        case 'bible_study':
            return BookOpenIcon;
        case 'other':
        default:
            return EllipsisHorizontalCircleIcon;
    }
}

type DetailTab = 'detalhes' | 'chat';

function formatListWhen(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('pt-PT', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export default function Hub({
    types,
    storeUrl,
    pastorOptions,
    mySolicitations,
    pageTitle,
    pageSubtitle,
    singleBaptismType = false,
    hideConversationReturnTo = 'hub',
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [step, setStep] = useState<'pick' | 'form'>('pick');
    const [typeLabel, setTypeLabel] = useState('');

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRow, setDetailRow] = useState<SolicitationHubRow | null>(null);
    const [detailTab, setDetailTab] = useState<DetailTab>('detalhes');
    const [detailKey, setDetailKey] = useState(0);

    const listRef = useRef<HTMLDivElement | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        type: '',
        message: '',
        preferred_date: '',
        assigned_pastor_id: '',
    });

    const typeLabelByType = useMemo(() => {
        const m = new Map<string, string>();
        for (const t of types) {
            m.set(t.type, t.label);
        }
        return m;
    }, [types]);

    const openCreate = () => {
        reset();
        if (singleBaptismType && types.length === 1) {
            const t = types[0].type;
            setData('type', t);
            setTypeLabel(typeLabelByType.get(t) ?? '');
            setStep('form');
        } else {
            setStep('pick');
            setTypeLabel('');
        }
        setCreateOpen(true);
    };

    const closeCreate = () => {
        setCreateOpen(false);
        setStep('pick');
        setTypeLabel('');
        reset();
    };

    const pickType = (type: string) => {
        setData('type', type);
        setTypeLabel(typeLabelByType.get(type) ?? type);
        setStep('form');
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl);
    };

    const openDetail = useCallback((row: SolicitationHubRow, tab: DetailTab = 'detalhes') => {
        setDetailRow(row);
        setDetailTab(tab);
        setDetailKey((k) => k + 1);
        setDetailOpen(true);
    }, []);

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailRow(null);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sid = params.get('solicitacao');
        const painel = params.get('painel');
        if (sid) {
            const row = mySolicitations.find((r) => String(r.solicitation.id) === sid);
            if (row) {
                openDetail(row, painel === 'chat' ? 'chat' : 'detalhes');
            }
        }
        if (params.get('lista') === '1' && listRef.current) {
            listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (sid || params.get('lista')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [mySolicitations, openDetail]);

    const tabBtn = (active: boolean) =>
        `flex-1 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px text-center ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    const heading = pageTitle ?? 'Solicitações';
    const sub =
        pageSubtitle ??
        'Batismo, apresentação, visita pastoral. Toque num pedido para editar ou conversar.';

    const listHeading = singleBaptismType ? 'Os meus pedidos de batismo' : 'Os meus pedidos';

    return (
        <MobileLayout>
            <Head title={heading} />
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{heading}</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{sub}</p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 p-0 text-white shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                        aria-label="Nova solicitação"
                        title="Nova solicitação"
                    >
                        <PlusIcon className="h-6 w-6 shrink-0" strokeWidth={2.2} aria-hidden />
                    </button>
                </div>

                <div ref={listRef} id="lista-solicitacoes" className="scroll-mt-24">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">{listHeading}</h2>
                    {mySolicitations.length === 0 ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 py-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 px-4">
                            {singleBaptismType ? (
                                <>
                                    Você não tem nenhum pedido de batismo. Clique no <strong>+</strong> para criar uma
                                    solicitação.
                                </>
                            ) : (
                                <>
                                    Você não tem nenhum pedido. Clique no <strong>+</strong> para criar uma solicitação.
                                </>
                            )}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {mySolicitations.map((row) => (
                                <div
                                    key={row.solicitation.id}
                                    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() => openDetail(row, 'detalhes')}
                                        className="block w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-zinc-900 dark:text-white">{row.solicitation.typeLabel}</div>
                                                <div className="text-xs text-zinc-500 mt-0.5">{row.solicitation.statusLabel}</div>
                                                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                                                    {row.solicitation.message}
                                                </div>
                                                <div className="text-[11px] text-zinc-400 mt-2">{formatListWhen(row.solicitation.createdAt)}</div>
                                            </div>
                                            <ChevronRightIcon className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" aria-hidden />
                                        </div>
                                    </button>
                                    <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-900/80">
                                        <button
                                            type="button"
                                            onClick={() => openDetail(row, 'chat')}
                                            className="text-xs font-semibold text-primary-600 underline dark:text-primary-400"
                                        >
                                            Chat
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openDetail(row, 'detalhes')}
                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80"
                                        >
                                            <PencilSquareIcon className="h-4 w-4" aria-hidden />
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal show={createOpen} onClose={closeCreate} maxWidth={step === 'form' ? '2xl' : 'md'}>
                {step === 'pick' ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Nova solicitação</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Escolha o tipo do seu pedido.</p>

                        <div className="grid grid-cols-1 gap-2">
                            {types.map((t) => {
                                const TypeIcon = iconForSolicitationType(t.type);
                                return (
                                    <button
                                        key={t.type}
                                        type="button"
                                        onClick={() => pickType(t.type)}
                                        className="flex w-full items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                            <TypeIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="font-semibold text-zinc-900 dark:text-white block">{t.label}</span>
                                        </div>
                                        <ChevronRightIcon className="w-5 h-5 text-zinc-400 shrink-0" />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <SecondaryButton type="button" onClick={closeCreate}>
                                Fechar
                            </SecondaryButton>
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-6 sm:p-8">
                        <button
                            type="button"
                            onClick={() => {
                                setStep('pick');
                                setData('type', '');
                                setTypeLabel('');
                            }}
                            className="mb-4 inline-flex items-center gap-1 text-sm font-medium !text-zinc-900 dark:!text-zinc-100 hover:underline"
                        >
                            <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                            Tipos de pedido
                        </button>

                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{typeLabel}</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 mb-6">
                            A igreja responderá pelo seu pedido através do App e email.
                        </p>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="hub_sol_message" value="Mensagem" />
                                <Textarea
                                    id="hub_sol_message"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={8}
                                    className="mt-1 block w-full"
                                    placeholder="Escreva os detalhes do seu pedido…"
                                    required
                                />
                                <InputError message={errors.message} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="hub_sol_pref_date" value="Data pretendida ou relevante (opcional)" />
                                <input
                                    id="hub_sol_pref_date"
                                    type="date"
                                    value={data.preferred_date}
                                    onChange={(e) => setData('preferred_date', e.target.value)}
                                    className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20"
                                />
                                <InputError message={errors.preferred_date} className="mt-1" />
                            </div>
                            {pastorOptions.length > 0 && (
                                <div>
                                    <InputLabel htmlFor="hub_sol_pastor" value="Pastor (opcional)" />
                                    <SelectInput
                                        id="hub_sol_pastor"
                                        className="mt-1"
                                        value={data.assigned_pastor_id}
                                        onChange={(e) => setData('assigned_pastor_id', e.target.value)}
                                    >
                                        <option value="">— Nenhum —</option>
                                        {pastorOptions.map((o) => (
                                            <option key={o.value} value={String(o.value)}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </SelectInput>
                                    <InputError message={errors.assigned_pastor_id} className="mt-1" />
                                </div>
                            )}
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                                <SecondaryButton type="button" className="justify-center" onClick={closeCreate}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton type="submit" disabled={processing} className="justify-center">
                                    Enviar pedido
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            <Modal show={detailOpen} onClose={closeDetail} maxWidth="2xl">
                {detailRow ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white pr-10">{detailRow.solicitation.typeLabel}</h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detailRow.solicitation.statusLabel}</p>

                        <div className="mt-4 flex border-b border-zinc-200 dark:border-zinc-800">
                            <button type="button" className={tabBtn(detailTab === 'detalhes')} onClick={() => setDetailTab('detalhes')}>
                                Detalhes
                            </button>
                            <button type="button" className={tabBtn(detailTab === 'chat')} onClick={() => setDetailTab('chat')}>
                                Chat
                            </button>
                        </div>

                        <div className="mt-5">
                            <SolicitationDetailPanel
                                key={detailKey}
                                solicitation={detailRow.solicitation}
                                messages={detailRow.messages}
                                messageStoreUrl={detailRow.messageStoreUrl}
                                canChat={detailRow.canChat}
                                canManage={false}
                                variant="modal"
                                section={detailTab === 'detalhes' ? 'details' : 'chat'}
                                composerRole="member"
                                memberUpdateUrl={detailRow.memberUpdateUrl}
                                memberCanEditDetails={detailRow.memberCanEditDetails}
                                memberPastorOptions={detailRow.memberPastorOptions}
                                messagePostReturnTo="hub"
                                canFinalizeLeaderChat={detailRow.canFinalizeLeaderChat}
                                finalizeLeaderChatUrl={detailRow.finalizeLeaderChatUrl ?? null}
                                memberHideConversationUrl={detailRow.memberHideConversationUrl ?? null}
                                leaderHideConversationUrl={detailRow.leaderHideConversationUrl ?? null}
                                hideConversationReturnTo={hideConversationReturnTo}
                            />
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
                                onClick={closeDetail}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </MobileLayout>
    );
}
