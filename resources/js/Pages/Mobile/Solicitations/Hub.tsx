import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm } from '@inertiajs/react';
import {
    BookOpenIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    EllipsisHorizontalCircleIcon,
    ExclamationTriangleIcon,
    HandRaisedIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import SolicitationDetailPanel, {
    type MemberPastorOption,
    type MemberPastoralBookingPayload,
    type SolicitationDetailShape,
    type SolicitationMessageRow,
} from '@/Components/Solicitations/SolicitationDetailPanel';
import PastoralAppointmentForm, { type PastoralPastorOpt } from '@/Components/PastoralAppointment/PastoralAppointmentForm';
import PastoralAppointmentMemberPanel, {
    type PastoralAppointmentHubRow,
} from '@/Components/PastoralAppointment/PastoralAppointmentMemberPanel';
import type { ComponentType, SVGProps } from 'react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

interface TypeItem {
    type: string;
    label: string;
    description?: string;
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
    memberPastoralBooking?: MemberPastoralBookingPayload | null;
    canFinalizeLeaderChat?: boolean;
    finalizeLeaderChatUrl?: string | null;
    memberHideConversationUrl?: string | null;
    leaderHideConversationUrl?: string | null;
}

type PastoralBookingProps = {
    pastors: PastoralPastorOpt[];
    storeUrl: string;
    defaultRequesterName: string;
};

interface Props {
    types: TypeItem[];
    mineUrl: string;
    storeUrl: string;
    pastorOptions: PastorOption[];
    mySolicitations: SolicitationHubRow[];
    appointments?: PastoralAppointmentHubRow[];
    pastoralBooking?: PastoralBookingProps | null;
    pastoralAgendaUrl?: string;
    /** Tela dedicada a batismo (menu principal mobile). */
    pageTitle?: string;
    pageSubtitle?: string;
    singleBaptismType?: boolean;
    /** Redirecionamento após «excluir da minha app» (batismo vs hub geral). */
    hideConversationReturnTo?: 'hub' | 'baptism_hub';
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

function iconForSolicitationType(type: string): IconComponent {
    switch (type) {
        case 'pastoral':
            return ClockIcon;
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

function descriptionForType(t: TypeItem): string {
    if (t.description) return t.description;
    switch (t.type) {
        case 'pastoral':
            return 'Marcar conversa presencial ou online';
        case 'baptism':
            return 'Quero ser batizado';
        case 'baby_presentation':
            return 'Apresentar uma criança à igreja';
        case 'bible_study':
            return 'Quero estudar a Bíblia com alguém';
        case 'other':
            return 'Outro pedido à igreja';
        default:
            return '';
    }
}

type DetailTab = 'detalhes' | 'chat';

function formatListWhen(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

function modalityLabel(m: string | null | undefined): string {
    if (m === 'presential') return 'Presencial';
    if (m === 'online') return 'Online';
    return '';
}

type HubListItem =
    | { kind: 'solicitation'; createdAt: string; key: string; row: SolicitationHubRow }
    | { kind: 'appointment'; createdAt: string; key: string; row: PastoralAppointmentHubRow };

export default function Hub({
    types,
    storeUrl,
    pastorOptions,
    mySolicitations,
    appointments = [],
    pastoralBooking = null,
    pastoralAgendaUrl = '',
    pageTitle,
    pageSubtitle,
    singleBaptismType = false,
    hideConversationReturnTo = 'hub',
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [step, setStep] = useState<'pick' | 'form'>('pick');
    const [typeLabel, setTypeLabel] = useState('');
    const [createPastorId, setCreatePastorId] = useState<string>('');
    const [pastoralFormKey, setPastoralFormKey] = useState(0);

    const [detailTab, setDetailTab] = useState<DetailTab>('detalhes');
    const [detailKey, setDetailKey] = useState(0);
    const [detailSolicitation, setDetailSolicitation] = useState<SolicitationHubRow | null>(null);
    const [detailAppointment, setDetailAppointment] = useState<PastoralAppointmentHubRow | null>(null);

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

    const listItems = useMemo<HubListItem[]>(() => {
        const items: HubListItem[] = [
            ...mySolicitations.map((row) => ({
                kind: 'solicitation' as const,
                createdAt: row.solicitation.createdAt ?? '',
                key: `s-${row.solicitation.id}`,
                row,
            })),
            ...appointments.map((row) => ({
                kind: 'appointment' as const,
                createdAt: row.createdAt ?? '',
                key: `a-${row.id}`,
                row,
            })),
        ];
        items.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
        });
        return items;
    }, [mySolicitations, appointments]);

    const hasAnyFreeSlot = (pastoralBooking?.pastors ?? []).some((p) => p.slots.length > 0);
    const isPastoralForm = data.type === 'pastoral';

    const openCreate = useCallback(() => {
        reset();
        setCreatePastorId('');
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
    }, [reset, setData, singleBaptismType, types, typeLabelByType]);

    const closeCreate = () => {
        setCreateOpen(false);
        setStep('pick');
        setTypeLabel('');
        setCreatePastorId('');
        reset();
    };

    const pickType = (type: string, pastorId?: string) => {
        setData('type', type);
        setData('assigned_pastor_id', '');
        setTypeLabel(typeLabelByType.get(type) ?? type);
        setCreatePastorId(pastorId ?? '');
        if (type === 'pastoral') {
            setPastoralFormKey((k) => k + 1);
        }
        setStep('form');
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isPastoralForm) return;
        post(storeUrl, {
            ...inertiaListModalSave,
            onSuccess: () => {
                reset();
                setStep('pick');
                setTypeLabel('');
            },
        });
    };

    const openSolicitationDetail = useCallback((row: SolicitationHubRow, tab: DetailTab = 'detalhes') => {
        setDetailAppointment(null);
        setDetailSolicitation(row);
        setDetailTab(tab);
        setDetailKey((k) => k + 1);
    }, []);

    const openAppointmentDetail = useCallback((row: PastoralAppointmentHubRow, tab: DetailTab = 'detalhes') => {
        setDetailSolicitation(null);
        setDetailAppointment(row);
        setDetailTab(tab);
        setDetailKey((k) => k + 1);
    }, []);

    const closeDetail = () => {
        setDetailSolicitation(null);
        setDetailAppointment(null);
    };

    const detailOpen = detailSolicitation !== null || detailAppointment !== null;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sid = params.get('solicitacao');
        const appointmentId = params.get('appointment');
        const painel = params.get('painel');
        const shouldOpenCreate = params.get('novo') === '1';
        const tipo = params.get('tipo');
        const pastor = params.get('pastor');
        const tab: DetailTab = painel === 'chat' ? 'chat' : 'detalhes';

        let shouldClean = false;

        if (shouldOpenCreate) {
            if (tipo && types.some((t) => t.type === tipo)) {
                setCreateOpen(true);
                pickType(tipo, pastor && /^\d+$/.test(pastor) ? pastor : undefined);
            } else {
                openCreate();
            }
            shouldClean = true;
        }

        if (sid) {
            const row = mySolicitations.find((r) => String(r.solicitation.id) === sid);
            if (row) {
                openSolicitationDetail(row, tab);
            }
            shouldClean = true;
        }

        if (appointmentId) {
            const row = appointments.find((r) => String(r.id) === appointmentId);
            if (row) {
                setCreateOpen(false);
                openAppointmentDetail(row, tab);
            }
            shouldClean = true;
        }

        if (params.get('lista') === '1' && listRef.current) {
            listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            shouldClean = true;
        }

        if (shouldClean) {
            window.history.replaceState({}, '', window.location.pathname);
        }
        // pickType/openCreate omitted: would retrigger on every type change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mySolicitations, appointments, openSolicitationDetail, openAppointmentDetail, types]);

    const tabBtn = (active: boolean) =>
        `flex-1 cursor-pointer px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px text-center ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    const heading = pageTitle ?? 'Solicitações';
    const sub =
        pageSubtitle ?? 'Batismo, apresentação, horário com pastor e outros pedidos.';

    const listHeading = singleBaptismType ? 'Meus pedidos de batismo' : 'Meus pedidos';
    const modalOverlayOpen = createOpen || detailOpen;

    const backToPick = () => {
        setStep('pick');
        setData('type', '');
        setData('assigned_pastor_id', '');
        setTypeLabel('');
        setCreatePastorId('');
    };

    return (
        <MobileLayout modalOverlayOpen={modalOverlayOpen}>
            <Head title={heading} />
            <div className={`space-y-4 ${modalOverlayOpen ? 'hidden' : ''}`} aria-hidden={modalOverlayOpen}>
                <PageHeader
                    title={heading}
                    subtitle={<span className="text-zinc-600 dark:text-zinc-400">{sub}</span>}
                    actions={
                        <AddButton variant="icon" onClick={openCreate} title="Nova solicitação">
                            Nova solicitação
                        </AddButton>
                    }
                />

                <div ref={listRef} id="lista-solicitacoes" className="scroll-mt-24">
                    <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">{listHeading}</h2>
                    {listItems.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                            {singleBaptismType ? (
                                <>
                                    Você ainda não tem pedidos de batismo. Toque em <strong>+</strong> para enviar o
                                    primeiro.
                                </>
                            ) : (
                                <>
                                    Você ainda não tem pedidos. Toque em <strong>+</strong> para enviar o primeiro.
                                </>
                            )}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {listItems.map((item) =>
                                item.kind === 'solicitation' ? (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => openSolicitationDetail(item.row, 'detalhes')}
                                        className="block w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-zinc-900 dark:text-white">
                                                    {item.row.solicitation.typeLabel}
                                                </div>
                                                <div className="mt-0.5 text-xs text-zinc-500">
                                                    {item.row.solicitation.statusLabel}
                                                </div>
                                                <div className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {item.row.solicitation.message}
                                                </div>
                                                <div className="mt-2 text-[11px] text-zinc-400">
                                                    {formatListWhen(item.row.solicitation.createdAt)}
                                                </div>
                                            </div>
                                            <ChevronRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => openAppointmentDetail(item.row, 'detalhes')}
                                        className="block w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-zinc-900 dark:text-white">
                                                    {item.row.typeLabel}
                                                </div>
                                                <div className="mt-0.5 text-xs text-zinc-500">{item.row.statusLabel}</div>
                                                {item.row.pastorName ? (
                                                    <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
                                                        {item.row.pastorName}
                                                    </p>
                                                ) : null}
                                                {item.row.preferredStart ? (
                                                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {formatListWhen(item.row.preferredStart)}
                                                        {item.row.preferredModality
                                                            ? ` · ${modalityLabel(item.row.preferredModality)}`
                                                            : ''}
                                                    </p>
                                                ) : item.row.subject ? (
                                                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {item.row.subject}
                                                    </p>
                                                ) : null}
                                                <div className="mt-2 text-[11px] text-zinc-400">
                                                    {formatListWhen(item.row.createdAt)}
                                                </div>
                                            </div>
                                            <ChevronRightIcon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                                        </div>
                                    </button>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Modal show={createOpen} onClose={closeCreate} maxWidth={step === 'form' ? '2xl' : 'md'} disableBodyScroll>
                {step === 'pick' ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-6">
                        <h2 className="mb-1 pr-10 text-lg font-semibold text-zinc-900 dark:text-white">Nova solicitação</h2>
                        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">Escolha o tipo do seu pedido.</p>

                        <div className="grid grid-cols-1 gap-2">
                            {types.map((t) => {
                                const TypeIcon = iconForSolicitationType(t.type);
                                const hint = descriptionForType(t);
                                return (
                                    <button
                                        key={t.type}
                                        type="button"
                                        onClick={() => pickType(t.type)}
                                        className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-300 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:active:bg-zinc-800"
                                    >
                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                            <TypeIcon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="block font-semibold text-zinc-900 dark:text-white">{t.label}</span>
                                            {hint ? (
                                                <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                                                    {hint}
                                                </span>
                                            ) : null}
                                        </div>
                                        <ChevronRightIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-6 sm:p-8">
                        {!singleBaptismType ? (
                            <button
                                type="button"
                                onClick={backToPick}
                                className="mb-4 inline-flex cursor-pointer items-center gap-1 text-sm font-medium !text-zinc-900 hover:underline dark:!text-zinc-100"
                            >
                                <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                                Tipos de pedido
                            </button>
                        ) : null}

                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{typeLabel}</h2>
                        <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {isPastoralForm
                                ? 'Escolha o pastor e um horário livre. A equipe pastoral pode falar com você pelo chat.'
                                : 'A igreja responderá pelo seu pedido através do App e e-mail.'}
                        </p>

                        {isPastoralForm ? (
                            pastoralBooking ? (
                                <div className="space-y-4">
                                    {!hasAnyFreeSlot ? (
                                        <div
                                            className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                                            role="status"
                                        >
                                            <div className="flex items-start gap-3">
                                                <ExclamationTriangleIcon
                                                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                                                    aria-hidden
                                                />
                                                <div>
                                                    <p className="font-medium">Sem horários disponíveis</p>
                                                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                                                        No momento, todos os horários publicados na agenda pastoral estão
                                                        preenchidos. Não é possível enviar um novo pedido até que surja
                                                        pelo menos um horário livre. Tente novamente mais tarde.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <PastoralAppointmentForm
                                            key={pastoralFormKey}
                                            pastors={pastoralBooking.pastors}
                                            storeUrl={pastoralBooking.storeUrl}
                                            defaultRequesterName={pastoralBooking.defaultRequesterName}
                                            fieldIdPrefix="hub_pa"
                                            initialPastorId={createPastorId || null}
                                            onSuccess={() => {
                                                setCreateOpen(false);
                                                setStep('pick');
                                                reset();
                                            }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                    Não foi possível carregar os horários. Confirme que há uma igreja ativa no app.
                                </p>
                            )
                        ) : (
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
                                    <InputLabel htmlFor="hub_sol_pref_date" value="Data desejada ou relevante (opcional)" />
                                    <input
                                        id="hub_sol_pref_date"
                                        type="date"
                                        value={data.preferred_date}
                                        onChange={(e) => setData('preferred_date', e.target.value)}
                                        className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-white dark:focus:ring-white/20"
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
                                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                                    <SecondaryButton type="button" className="cursor-pointer justify-center" onClick={closeCreate}>
                                        Cancelar
                                    </SecondaryButton>
                                    <PrimaryButton
                                        type="submit"
                                        disabled={processing || !data.message.trim()}
                                        className="cursor-pointer justify-center"
                                    >
                                        Enviar pedido
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </Modal>

            <Modal show={detailOpen} onClose={closeDetail} maxWidth="2xl" disableBodyScroll>
                {detailSolicitation ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-5 sm:p-6">
                        <h2 className="pr-10 text-lg font-semibold text-zinc-900 dark:text-white">
                            {detailSolicitation.solicitation.typeLabel}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {detailSolicitation.solicitation.statusLabel}
                        </p>

                        <div className="mt-4 flex border-b border-zinc-200 dark:border-zinc-800">
                            <button
                                type="button"
                                className={tabBtn(detailTab === 'detalhes')}
                                onClick={() => setDetailTab('detalhes')}
                            >
                                Detalhes
                            </button>
                            <button type="button" className={tabBtn(detailTab === 'chat')} onClick={() => setDetailTab('chat')}>
                                Chat
                            </button>
                        </div>

                        <div className="mt-5">
                            <SolicitationDetailPanel
                                key={detailKey}
                                solicitation={detailSolicitation.solicitation}
                                messages={detailSolicitation.messages}
                                messageStoreUrl={detailSolicitation.messageStoreUrl}
                                canChat={detailSolicitation.canChat}
                                canManage={false}
                                variant="modal"
                                section={detailTab === 'detalhes' ? 'details' : 'chat'}
                                composerRole="member"
                                memberUpdateUrl={detailSolicitation.memberUpdateUrl}
                                memberCanEditDetails={detailSolicitation.memberCanEditDetails}
                                memberPastorOptions={detailSolicitation.memberPastorOptions}
                                memberPastoralBooking={detailSolicitation.memberPastoralBooking ?? null}
                                pastoralAgendaUrl={pastoralAgendaUrl || undefined}
                                messagePostReturnTo="hub"
                                canFinalizeLeaderChat={detailSolicitation.canFinalizeLeaderChat}
                                finalizeLeaderChatUrl={detailSolicitation.finalizeLeaderChatUrl ?? null}
                                memberHideConversationUrl={detailSolicitation.memberHideConversationUrl ?? null}
                                leaderHideConversationUrl={detailSolicitation.leaderHideConversationUrl ?? null}
                                hideConversationReturnTo={hideConversationReturnTo}
                            />
                        </div>
                    </div>
                ) : null}

                {detailAppointment ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-5 sm:p-6">
                        <h2 className="pr-10 text-lg font-semibold text-zinc-900 dark:text-white">
                            {detailAppointment.typeLabel}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {detailAppointment.pastorName ?? '—'} · {detailAppointment.statusLabel}
                        </p>

                        <div className="mt-4 flex border-b border-zinc-200 dark:border-zinc-800">
                            <button
                                type="button"
                                className={tabBtn(detailTab === 'detalhes')}
                                onClick={() => setDetailTab('detalhes')}
                            >
                                Detalhes
                            </button>
                            <button type="button" className={tabBtn(detailTab === 'chat')} onClick={() => setDetailTab('chat')}>
                                Chat
                            </button>
                        </div>

                        <div className="mt-5">
                            <PastoralAppointmentMemberPanel
                                key={detailKey}
                                row={detailAppointment}
                                fallbackPastors={pastoralBooking?.pastors ?? []}
                                section={detailTab === 'detalhes' ? 'details' : 'chat'}
                            />
                        </div>
                    </div>
                ) : null}
            </Modal>
        </MobileLayout>
    );
}
