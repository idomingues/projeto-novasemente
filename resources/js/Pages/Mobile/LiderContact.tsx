import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ChevronRightIcon,
    MapPinIcon,
    PencilSquareIcon,
    PlusIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import SolicitationDetailPanel, {
    type MemberPastorOption,
    type SolicitationDetailShape,
    type SolicitationMessageRow,
} from '@/Components/Solicitations/SolicitationDetailPanel';
import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react';

interface LeaderOpt {
    value: number;
    label: string;
}

export interface LeaderContactRow {
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
}

interface Props {
    leaderOptions: LeaderOpt[];
    storeUrl: string;
    mineUrl: string;
    leaderInboxUrl: string;
    locationUrl: string;
    myLeaderChats: LeaderContactRow[];
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

function rowTitle(row: LeaderContactRow): string {
    const sub = row.solicitation.subject?.trim();
    if (sub) {
        return sub;
    }
    return row.solicitation.assignedVolunteerName ?? row.solicitation.typeLabel;
}

export default function LiderContact({
    leaderOptions,
    storeUrl,
    mineUrl,
    leaderInboxUrl,
    locationUrl,
    myLeaderChats,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRow, setDetailRow] = useState<LeaderContactRow | null>(null);
    const [detailTab, setDetailTab] = useState<DetailTab>('detalhes');
    const [detailKey, setDetailKey] = useState(0);
    const listRef = useRef<HTMLDivElement | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        assigned_volunteer_id: '' as string | number,
        subject: '',
        message: '',
    });

    const openCreate = () => {
        reset();
        setCreateOpen(true);
    };

    const closeCreate = () => {
        setCreateOpen(false);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl);
    };

    const openDetail = useCallback((row: LeaderContactRow, tab: DetailTab = 'detalhes') => {
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
            const row = myLeaderChats.find((r) => String(r.solicitation.id) === sid);
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
    }, [myLeaderChats, openDetail]);

    const tabBtn = (active: boolean) =>
        `flex-1 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px text-center ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    return (
        <MobileLayout>
            <Head title="Falar com líder" />
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Falar com líder</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                            Conversa privada com um líder de ministério (conta na app). Toque numa conversa para ver detalhes ou abrir o
                            chat. Para batismo, visita pastoral, etc., use{' '}
                            <Link href={mineUrl} className="font-semibold text-primary-600 underline dark:text-primary-400">
                                Solicitações
                            </Link>
                            .
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                        aria-label="Nova conversa com líder"
                        title="Nova conversa"
                    >
                        <PlusIcon className="h-6 w-6" strokeWidth={2.2} aria-hidden />
                    </button>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 p-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Se for líder e quiser responder no telemóvel, use{' '}
                        <Link href={leaderInboxUrl} className="font-semibold text-primary-600 underline dark:text-primary-400">
                            as minhas conversas como líder
                        </Link>
                        . Morada e mapa:{' '}
                        <Link href={locationUrl} className="font-semibold text-primary-600 underline dark:text-primary-400">
                            Localização
                        </Link>
                        .
                    </p>
                </div>

                <div ref={listRef} id="lista-lider" className="scroll-mt-24">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">As minhas conversas</h2>
                    {myLeaderChats.length === 0 ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 py-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                            Ainda não tem conversas com líderes. Use o botão + acima.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {myLeaderChats.map((row) => (
                                <div
                                    key={row.solicitation.id}
                                    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() => openDetail(row, 'detalhes')}
                                        className="block w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                                <UserGroupIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-zinc-900 dark:text-white">{rowTitle(row)}</div>
                                                {row.solicitation.subject?.trim() && row.solicitation.assignedVolunteerName ? (
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                        Com {row.solicitation.assignedVolunteerName}
                                                    </div>
                                                ) : null}
                                                <div className="text-xs text-zinc-500 mt-0.5">{row.solicitation.statusLabel}</div>
                                                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                                                    {row.solicitation.message}
                                                </div>
                                                <div className="text-[11px] text-zinc-400 mt-2">
                                                    {formatListWhen(row.solicitation.createdAt)}
                                                </div>
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
                                            Detalhes
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Link
                    href={locationUrl}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <MapPinIcon className="h-6 w-6 shrink-0 text-zinc-500" aria-hidden />
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Localização e contactos da igreja</span>
                </Link>

                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 text-center">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Clique no <strong>+</strong> para iniciar uma nova conversa com um líder.
                    </p>
                </div>
            </div>

            <Modal show={createOpen} onClose={closeCreate} maxWidth="2xl">
                <div className="p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Nova conversa</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 mb-6">
                        Indique um assunto curto, escolha o líder com conta na app e escreva a primeira mensagem. Abre-se um chat privado
                        entre si e esse líder.
                    </p>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="lc_subject" value="Assunto" />
                            <TextInput
                                id="lc_subject"
                                value={data.subject}
                                onChange={(e) => setData('subject', e.target.value)}
                                className="mt-1"
                                maxLength={150}
                                placeholder="Ex.: Horário do ensaio do louvor"
                                required
                            />
                            <InputError message={errors.subject} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="lc_leader" value="Líder de ministério" />
                            <SelectInput
                                id="lc_leader"
                                className="mt-1"
                                value={data.assigned_volunteer_id}
                                onChange={(e) => setData('assigned_volunteer_id', e.target.value)}
                                required
                            >
                                <option value="" disabled>
                                    Selecione…
                                </option>
                                {leaderOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.assigned_volunteer_id} className="mt-1" />
                            {leaderOptions.length === 0 ? (
                                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                    Ainda não há líderes com utilizador da app associado ao voluntariado. Peça à secretaria para associar a
                                    conta na ficha do voluntário.
                                </p>
                            ) : null}
                        </div>
                        <div>
                            <InputLabel htmlFor="lc_msg" value="Mensagem inicial" />
                            <Textarea
                                id="lc_msg"
                                value={data.message}
                                onChange={(e) => setData('message', e.target.value)}
                                rows={8}
                                className="mt-1 block w-full"
                                placeholder="Escreva o que gostaria de tratar com o líder…"
                                required
                            />
                            <InputError message={errors.message} className="mt-1" />
                        </div>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                            <SecondaryButton type="button" className="justify-center" onClick={closeCreate}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing || leaderOptions.length === 0} className="justify-center">
                                Iniciar conversa
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal show={detailOpen} onClose={closeDetail} maxWidth="2xl">
                {detailRow ? (
                    <div className="max-h-[min(92vh,860px)] overflow-y-auto p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white pr-10">{rowTitle(detailRow)}</h2>
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
                                messagePostReturnTo="leader-contact"
                                memberPatchReturnTo="leader-contact"
                                canFinalizeLeaderChat={detailRow.canFinalizeLeaderChat}
                                finalizeLeaderChatUrl={detailRow.finalizeLeaderChatUrl ?? null}
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
