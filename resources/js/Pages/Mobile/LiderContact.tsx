import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    EllipsisVerticalIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
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
import { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { confirmAction } from '@/utils/confirmDialog';
import { router } from '@inertiajs/react';

interface LeaderOpt {
    value: number;
    label: string;
    name?: string;
    ministries?: string[];
}

interface MinistryOpt {
    id: number;
    name: string;
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
    memberHideConversationUrl?: string | null;
    leaderHideConversationUrl?: string | null;
}

interface Props {
    leaderOptions: LeaderOpt[];
    contactMinistries?: MinistryOpt[];
    contactMinistry?: MinistryOpt | null;
    storeUrl: string;
    myLeaderChats: LeaderContactRow[];
}

type Pane = 'list' | 'chat' | 'compose';

function formatListWhen(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const now = new Date();
        const sameDay =
            d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        if (sameDay) {
            return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (
            d.getFullYear() === yesterday.getFullYear() &&
            d.getMonth() === yesterday.getMonth() &&
            d.getDate() === yesterday.getDate()
        ) {
            return 'Ontem';
        }
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
        return '';
    }
}

function lastPreview(row: LeaderContactRow): string {
    const last = row.messages[row.messages.length - 1];
    if (last?.content?.trim()) {
        return last.content.trim();
    }
    return row.solicitation.message?.trim() || 'Nova conversa';
}

function contactTitle(row: LeaderContactRow): string {
    return row.solicitation.assignedVolunteerName?.trim() || row.solicitation.typeLabel || 'Conversa';
}

function areaLabel(row: LeaderContactRow): string {
    const meta = row.solicitation.meta as { ns_whats?: { ministry_names?: string[] } } | null | undefined;
    const names = meta?.ns_whats?.ministry_names;
    if (Array.isArray(names) && names.length > 0) {
        return names.join(', ');
    }
    return 'Área da igreja';
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LiderContact({
    leaderOptions,
    contactMinistries = [],
    contactMinistry = null,
    storeUrl,
    myLeaderChats,
}: Props) {
    const ministries = contactMinistries.length > 0 ? contactMinistries : contactMinistry ? [contactMinistry] : [];
    const singleLeader = leaderOptions.length === 1 ? leaderOptions[0] : null;
    const [pane, setPane] = useState<Pane>('list');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [detailKey, setDetailKey] = useState(0);

    const { data, setData, post, processing, errors, reset } = useForm({
        assigned_volunteer_id: '' as string | number,
        message: '',
    });

    const selectedRow = useMemo(
        () => myLeaderChats.find((r) => r.solicitation.id === selectedId) ?? null,
        [myLeaderChats, selectedId],
    );

    const filteredChats = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return myLeaderChats;
        return myLeaderChats.filter((row) => {
            const hay = [
                contactTitle(row),
                lastPreview(row),
                row.solicitation.statusLabel,
                row.solicitation.message,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [myLeaderChats, search]);

    const openCompose = () => {
        reset();
        if (singleLeader) {
            setData('assigned_volunteer_id', singleLeader.value);
        }
        setPane('compose');
        setSelectedId(null);
        setMenuOpen(false);
    };

    const openChat = useCallback((row: LeaderContactRow) => {
        setSelectedId(row.solicitation.id);
        setPane('chat');
        setDetailKey((k) => k + 1);
        setMenuOpen(false);
    }, []);

    const backToList = () => {
        setPane('list');
        setSelectedId(null);
        setMenuOpen(false);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl, {
            ...inertiaListModalSave,
            onSuccess: () => reset(),
        });
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sid = params.get('solicitacao');
        if (sid) {
            const row = myLeaderChats.find((r) => String(r.solicitation.id) === sid);
            if (row) {
                openChat(row);
            }
        }
        if (sid || params.get('lista') || params.get('painel')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [myLeaderChats, openChat]);

    useEffect(() => {
        if (selectedId && !myLeaderChats.some((r) => r.solicitation.id === selectedId) && pane === 'chat') {
            setPane('list');
            setSelectedId(null);
        }
    }, [myLeaderChats, selectedId, pane]);

    const mobileShowListOnly = pane === 'list';
    const mobileShowThread = pane === 'chat' || pane === 'compose';

    const shellHeight =
        'h-[calc(100dvh-8.75rem)] sm:h-[calc(100dvh-9.5rem)] md:h-[calc(100dvh-8rem)]';

    return (
        <MobileLayout>
            <Head title="NS Conecta" />
            <div
                className={`-mx-4 sm:-mx-6 md:-mx-8 -mt-2 mb-0 flex min-h-0 ${shellHeight} overflow-hidden border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:rounded-2xl md:border`}
            >
                {/* Lista (sempre no desktop; no mobile só na pane list) */}
                <aside
                    className={`flex w-full min-w-0 flex-col border-zinc-200 dark:border-zinc-800 md:w-[22rem] md:shrink-0 md:border-r lg:w-[26rem] ${
                        mobileShowListOnly ? 'flex' : 'hidden md:flex'
                    }`}
                >
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">NS Conecta</h1>
                        <button
                            type="button"
                            onClick={openCompose}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            aria-label="Nova conversa"
                            title="Nova conversa"
                        >
                            <PencilSquareIcon className="h-6 w-6" aria-hidden />
                        </button>
                    </div>

                    <div className="shrink-0 px-3 py-2">
                        <label className="relative block">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <TextInput
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar"
                                className="w-full rounded-lg border-0 bg-zinc-100 py-2 pl-9 pr-3 text-sm shadow-none focus:ring-1 focus:ring-emerald-500/40 dark:bg-zinc-900"
                                aria-label="Pesquisar conversas"
                            />
                        </label>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                        {filteredChats.length === 0 ? (
                            <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                {myLeaderChats.length === 0
                                    ? 'Você ainda não possui conversas. Toque em nova conversa para começar.'
                                    : 'Nenhuma conversa encontrada.'}
                                {myLeaderChats.length === 0 ? (
                                    <div className="mt-4">
                                        <PrimaryButton type="button" onClick={openCompose} className="justify-center">
                                            Iniciar uma conversa
                                        </PrimaryButton>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                {filteredChats.map((row) => {
                                    const active = selectedId === row.solicitation.id && pane === 'chat';
                                    const title = contactTitle(row);
                                    const closed = row.solicitation.status === 'completed';
                                    return (
                                        <li key={row.solicitation.id}>
                                            <button
                                                type="button"
                                                onClick={() => openChat(row)}
                                                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition ${
                                                    active
                                                        ? 'bg-zinc-100 dark:bg-zinc-800/80'
                                                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/80'
                                                }`}
                                            >
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                                    {initials(title)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <span className="truncate font-semibold text-zinc-900 dark:text-white">
                                                            {title}
                                                        </span>
                                                        <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                                                            {formatListWhen(
                                                                row.messages[row.messages.length - 1]?.createdAt ??
                                                                    row.solicitation.createdAt,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                                                        {closed ? 'Conversa finalizada · ' : ''}
                                                        {lastPreview(row)}
                                                    </p>
                                                    {areaLabel(row) ? (
                                                        <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                                                            {areaLabel(row)}
                                                            {closed ? ` · ${row.solicitation.statusLabel}` : ''}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Painel direito: chat / compose / vazio */}
                <section
                    className={`min-w-0 flex-1 flex-col ${mobileShowThread ? 'flex' : 'hidden md:flex'}`}
                >
                    {pane === 'compose' ? (
                        <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-zinc-950">
                            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={backToList}
                                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    aria-label="Voltar"
                                >
                                    <ArrowLeftIcon className="h-5 w-5" />
                                </button>
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white">Nova conversa</h2>
                                    <p className="truncate text-xs text-zinc-500">
                                        Escolha um líder de qualquer área e envie a primeira mensagem
                                    </p>
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                                <form onSubmit={submit} className="mx-auto max-w-lg space-y-4">
                                    {ministries.length > 0 ? (
                                        <div>
                                            <InputLabel value="Áreas com líderes" />
                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                {ministries.map((m) => m.name).join(' · ')}
                                            </p>
                                        </div>
                                    ) : null}
                                    <div>
                                        <InputLabel htmlFor="lc_leader" value="Líder / área" />
                                        {singleLeader ? (
                                            <p className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100">
                                                {singleLeader.label}
                                            </p>
                                        ) : (
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
                                        )}
                                        <InputError message={errors.assigned_volunteer_id} className="mt-1" />
                                        {leaderOptions.length === 0 ? (
                                            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                                Ainda não há líderes de departamento com conta na app. Fale com a secretaria.
                                            </p>
                                        ) : null}
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="lc_msg" value="Mensagem" />
                                        <Textarea
                                            id="lc_msg"
                                            value={data.message}
                                            onChange={(e) => setData('message', e.target.value)}
                                            rows={6}
                                            className="mt-1 block w-full"
                                            placeholder="Escreva o que gostaria de tratar…"
                                            required
                                            minLength={3}
                                        />
                                        <InputError message={errors.message} className="mt-1" />
                                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            Sua mensagem será enviada ao líder escolhido. A conversa fica entre você e
                                            essa pessoa até que ela finalize ou a equipe transfira o atendimento.
                                        </p>
                                    </div>
                                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                                        <SecondaryButton type="button" className="justify-center" onClick={backToList}>
                                            Cancelar
                                        </SecondaryButton>
                                        <PrimaryButton
                                            type="submit"
                                            disabled={processing || leaderOptions.length === 0}
                                            className="justify-center"
                                        >
                                            Enviar
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    ) : selectedRow ? (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="relative flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-[#f0f2f5] px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900 sm:px-3">
                                <button
                                    type="button"
                                    onClick={backToList}
                                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-200/80 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    aria-label="Voltar"
                                >
                                    <ArrowLeftIcon className="h-5 w-5" />
                                </button>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                    {initials(contactTitle(selectedRow))}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-semibold text-zinc-900 dark:text-white">
                                        {contactTitle(selectedRow)}
                                    </div>
                                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                        {areaLabel(selectedRow)}
                                        {selectedRow.solicitation.status === 'completed'
                                            ? ' · Finalizada'
                                            : ` · ${selectedRow.solicitation.statusLabel}`}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((v) => !v)}
                                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    aria-label="Menu da conversa"
                                    aria-expanded={menuOpen}
                                >
                                    <EllipsisVerticalIcon className="h-6 w-6" />
                                </button>
                                {menuOpen ? (
                                    <div className="absolute right-2 top-12 z-20 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                                        {selectedRow.canFinalizeLeaderChat && selectedRow.finalizeLeaderChatUrl ? (
                                            <button
                                                type="button"
                                                className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                                onClick={async () => {
                                                    setMenuOpen(false);
                                                    const ok = await confirmAction({
                                                        title: 'Finalizar conversa?',
                                                        text: 'Depois de finalizada, novas mensagens não poderão ser enviadas.',
                                                        confirmButtonText: 'Finalizar',
                                                        cancelButtonText: 'Cancelar',
                                                    });
                                                    if (!ok || !selectedRow.finalizeLeaderChatUrl) return;
                                                    router.post(selectedRow.finalizeLeaderChatUrl, {}, { preserveScroll: true });
                                                }}
                                            >
                                                Finalizar conversa
                                            </button>
                                        ) : null}
                                        {selectedRow.memberHideConversationUrl ? (
                                            <button
                                                type="button"
                                                className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                                                onClick={async () => {
                                                    setMenuOpen(false);
                                                    const url = selectedRow.memberHideConversationUrl;
                                                    if (!url) return;
                                                    const ok = await confirmAction({
                                                        title: 'Remover esta conversa da sua app?',
                                                        text: 'Ela deixa de aparecer na sua lista. A igreja pode manter o histórico no atendimento.',
                                                        icon: 'warning',
                                                        danger: true,
                                                        confirmButtonText: 'Remover da minha app',
                                                        cancelButtonText: 'Cancelar',
                                                    });
                                                    if (!ok) return;
                                                    router.post(
                                                        url,
                                                        { return_to: 'leader_contact' },
                                                        { preserveScroll: true },
                                                    );
                                                }}
                                            >
                                                Remover da minha app
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            Fechar menu
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col">
                                <SolicitationDetailPanel
                                    key={detailKey}
                                    solicitation={selectedRow.solicitation}
                                    messages={selectedRow.messages}
                                    messageStoreUrl={selectedRow.messageStoreUrl}
                                    canChat={selectedRow.canChat}
                                    canManage={false}
                                    variant="page"
                                    section="chat"
                                    composerRole="member"
                                    chatChrome="embedded"
                                    messagePostReturnTo="leader-contact"
                                    memberPatchReturnTo="leader-contact"
                                    canFinalizeLeaderChat={false}
                                    finalizeLeaderChatUrl={null}
                                    memberHideConversationUrl={null}
                                    leaderHideConversationUrl={null}
                                    hideConversationReturnTo="leader_contact"
                                    preserveStateOnPanelActions
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="hidden min-h-0 flex-1 flex-col items-center justify-center bg-[#efeae2] px-6 text-center dark:bg-zinc-950 md:flex">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-800">
                                <UserGroupIcon className="h-8 w-8 text-emerald-700 dark:text-emerald-300" aria-hidden />
                            </div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">NS Conecta</h2>
                            <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                                Selecione uma conversa à esquerda ou inicie uma nova para falar com líderes e áreas da
                                igreja.
                            </p>
                            <PrimaryButton type="button" className="mt-5 justify-center" onClick={openCompose}>
                                Nova conversa
                            </PrimaryButton>
                        </div>
                    )}
                </section>
            </div>
        </MobileLayout>
    );
}
