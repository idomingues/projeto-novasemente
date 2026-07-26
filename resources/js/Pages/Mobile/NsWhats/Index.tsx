import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BookmarkIcon,
    CheckCircleIcon,
    EllipsisVerticalIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    UserGroupIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import TextInput from '@/Components/TextInput';
import UserListAvatar from '@/Components/UserListAvatar';
import NsWhatsChatComposer from '@/Components/NsWhats/NsWhatsChatComposer';
import { NsWhatsMessageBubble, NsWhatsSystemPill } from '@/Components/NsWhats/NsWhatsMessageBubble';
import NsWhatsNewChatPanel, {
    type ComposeMinistry,
    type ComposePerson,
    type DraftTarget,
} from '@/Components/NsWhats/NsWhatsNewChatPanel';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import {
    loadNsWhatsConversation,
    sendNsWhatsMessage,
    type NsWhatsMessagePayload,
} from '@/utils/nsWhatsSendMessage';

type Message = {
    id: number;
    authorRole: string;
    authorName?: string | null;
    body: string;
    kind: string;
    editedAt?: string | null;
    createdAt?: string | null;
    isSystem?: boolean;
};

type Conversation = {
    id: number;
    subject?: string | null;
    status: string;
    statusLabel: string;
    ministryName?: string | null;
    assigneeName?: string | null;
    canChat: boolean;
    canReopen: boolean;
    canClaim?: boolean;
    canReply?: boolean;
    viewerRole?: 'member' | 'staff';
    directedToMe?: boolean;
    lastActivityAt?: string | null;
    unreadCount: number;
    lastPreview: string;
    messages: Message[];
    headerTitle: string;
    headerSubtitle: string;
    headerPhotoUrl?: string | null;
    /** Conversas fixas com líderes dos departamentos em que o usuário serve. */
    pinnedLeader?: boolean;
};

interface Props {
    tab: 'open' | 'closed';
    search: string;
    conversations: Conversation[];
    selected: Conversation | null;
    composing: boolean;
    composeDraft?: (DraftTarget & { prefillMessage?: string }) | null;
    ministries: ComposeMinistry[];
    selectedMinistry: ComposeMinistry | null;
    leaders: ComposePerson[];
    members: ComposePerson[];
    storeUrl: string;
    departmentQueueUrl?: string | null;
    fallbackMinistryConfigured: boolean;
}

function formatWhen(iso?: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
        return '';
    }
}

/** Espaço para a barra inferior fixa — coluna e composer descem até o menu. */
const bottomNavClearance =
    'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]';

function syncConversaInUrl(conversaId: number | null, extras?: { tab?: string; q?: string; nova?: boolean }) {
    const url = new URL(window.location.href);
    if (extras?.tab) {
        url.searchParams.set('tab', extras.tab);
    }
    if (extras?.q !== undefined) {
        if (extras.q) url.searchParams.set('q', extras.q);
        else url.searchParams.delete('q');
    }
    if (extras?.nova) {
        url.searchParams.set('nova', '1');
    } else if (extras?.nova === false) {
        url.searchParams.delete('nova');
        url.searchParams.delete('ministry');
    }
    if (conversaId) {
        url.searchParams.set('conversa', String(conversaId));
    } else {
        url.searchParams.delete('conversa');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

export default function NsWhatsIndex({
    tab,
    search: initialSearch,
    conversations: initialConversations,
    selected: initialSelected,
    composing: initialComposing,
    composeDraft: initialComposeDraft = null,
    ministries,
    selectedMinistry,
    leaders,
    members,
    storeUrl,
    departmentQueueUrl = null,
    fallbackMinistryConfigured,
}: Props) {
    const [search, setSearch] = useState(initialSearch);
    const [menuOpen, setMenuOpen] = useState(false);
    const [composeDraft, setComposeDraft] = useState<DraftTarget | null>(() => {
        if (!initialComposeDraft) {
            return null;
        }
        const { prefillMessage: _prefill, ...draft } = initialComposeDraft;
        return draft;
    });
    const [composerText, setComposerText] = useState('');
    const [composerError, setComposerError] = useState<string | undefined>();
    const [sending, setSending] = useState(false);
    const [loadingConversation, setLoadingConversation] = useState(false);
    const [composing, setComposing] = useState(initialComposing);
    const [roster, setRoster] = useState(initialConversations);
    const [active, setActive] = useState<Conversation | null>(initialSelected);
    const [liveMessages, setLiveMessages] = useState<NsWhatsMessagePayload[]>(initialSelected?.messages ?? []);
    const threadEnd = useRef<HTMLDivElement | null>(null);
    const draftForm = useForm({
        ministry_id: (initialComposeDraft?.ministryId ?? '') as number | '',
        recipient_user_id: (initialComposeDraft?.recipientUserId ?? '') as number | '',
        message: (initialComposeDraft?.prefillMessage ?? '') as string,
        use_fallback: Boolean(initialComposeDraft?.useFallback),
    });

    const selectedId = active?.id ?? null;
    const showComposeDraft = Boolean(composeDraft) && !selectedId;
    const mobileShowList = !selectedId && !showComposeDraft;

    useEffect(() => {
        setRoster(initialConversations);
    }, [initialConversations]);

    useEffect(() => {
        setComposing(initialComposing);
    }, [initialComposing]);

    useEffect(() => {
        setActive(initialSelected);
        setLiveMessages(initialSelected?.messages ?? []);
        setComposerText('');
        setComposerError(undefined);
    }, [initialSelected?.id]);

    useEffect(() => {
        threadEnd.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }, [liveMessages.length, selectedId]);

    useEffect(() => {
        if (composeDraft) {
            draftForm.setData('ministry_id', composeDraft.useFallback ? '' : composeDraft.ministryId);
            draftForm.setData('recipient_user_id', composeDraft.recipientUserId);
            draftForm.setData('use_fallback', Boolean(composeDraft.useFallback));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        composeDraft?.ministryId,
        composeDraft?.recipientUserId,
        composeDraft?.title,
        composeDraft?.useFallback,
    ]);

    const applySearch = () => {
        router.get(
            route('mobile.ns-whats.index'),
            { tab, q: search || undefined, nova: composing ? 1 : undefined, ministry: selectedMinistry?.id },
            { preserveState: true },
        );
    };

    const openConversation = async (id: number) => {
        if (loadingConversation) return;
        setComposeDraft(null);
        setComposing(false);
        setMenuOpen(false);

        if (active?.id === id) {
            syncConversaInUrl(id, { tab, q: search, nova: false });
            return;
        }

        setLoadingConversation(true);
        const result = await loadNsWhatsConversation(route('mobile.ns-whats.show', id));
        setLoadingConversation(false);

        if (!result.ok) {
            return;
        }

        const conversation = result.conversation as Conversation;
        setActive(conversation);
        setLiveMessages(conversation.messages ?? []);
        setComposerText('');
        setComposerError(undefined);
        setRoster((prev) =>
            prev.map((c) =>
                c.id === id
                    ? {
                          ...c,
                          unreadCount: 0,
                          lastPreview: conversation.lastPreview,
                          headerPhotoUrl: conversation.headerPhotoUrl ?? c.headerPhotoUrl,
                          headerTitle: conversation.headerTitle ?? c.headerTitle,
                      }
                    : c,
            ),
        );
        syncConversaInUrl(id, { tab, q: search, nova: false });
    };

    const backToList = () => {
        setComposeDraft(null);
        setActive(null);
        setLiveMessages([]);
        setMenuOpen(false);
        syncConversaInUrl(null, { tab, q: search });
    };

    const startCompose = () => {
        setComposeDraft(null);
        setActive(null);
        setLiveMessages([]);
        setComposing(true);
        syncConversaInUrl(null, { tab, q: search, nova: true });
        router.get(
            route('mobile.ns-whats.index'),
            { tab, q: search || undefined, nova: 1 },
            { preserveState: true, preserveScroll: true, only: ['ministries', 'selectedMinistry', 'leaders', 'members', 'composing', 'fallbackMinistryConfigured'] },
        );
    };

    const closeCompose = () => {
        setComposeDraft(null);
        setComposing(false);
        syncConversaInUrl(null, { tab, q: search, nova: false });
        router.get(
            route('mobile.ns-whats.index'),
            { tab, q: search || undefined },
            { preserveState: true, preserveScroll: true, only: ['composing', 'selectedMinistry', 'leaders', 'members'] },
        );
    };

    const finalizeConversation = async () => {
        if (!active?.canChat) return;
        setMenuOpen(false);
        const ok = await confirmAction({
            title: 'Finalizar conversa?',
            confirmButtonText: 'Finalizar',
        });
        if (ok) {
            router.post(route('mobile.ns-whats.close', active.id));
        }
    };

    const sendMessage: FormEventHandler = async (e) => {
        e.preventDefault();
        if (!active || sending) return;
        const content = composerText.trim();
        if (!content) return;

        const tempId = -Date.now();
        const optimistic: NsWhatsMessagePayload = {
            id: tempId,
            authorRole: active.viewerRole === 'staff' ? 'leader' : 'member',
            authorName: null,
            body: content,
            kind: 'public',
            createdAt: new Date().toISOString(),
        };

        setComposerText('');
        setComposerError(undefined);
        setSending(true);
        setLiveMessages((prev) => [...prev, optimistic]);

        const result = await sendNsWhatsMessage(route('mobile.ns-whats.messages.store', active.id), content);
        setSending(false);

        if (!result.ok) {
            setLiveMessages((prev) => prev.filter((m) => m.id !== tempId));
            setComposerText(content);
            setComposerError(result.error);
            return;
        }

        setLiveMessages((prev) => prev.map((m) => (m.id === tempId ? result.message : m)));
        setRoster((prev) =>
            prev.map((c) =>
                c.id === active.id
                    ? { ...c, lastPreview: content, lastActivityAt: result.message.createdAt ?? c.lastActivityAt }
                    : c,
            ),
        );
    };

    const sendDraft: FormEventHandler = (e) => {
        e.preventDefault();
        if (!composeDraft || draftForm.data.message.trim().length < 3) return;
        draftForm.post(storeUrl, {
            onSuccess: () => {
                setComposeDraft(null);
                draftForm.reset();
            },
        });
    };

    const tabs = useMemo(
        () => [
            { key: 'open' as const, label: 'Em andamento' },
            { key: 'closed' as const, label: 'Finalizadas' },
        ],
        [],
    );

    return (
        <MobileLayout flush>
            <Head title="NS Whats" />
            <div className="flex h-full min-h-0 overflow-hidden border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:rounded-none md:border-0">
                <aside
                    className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:w-[20rem] md:shrink-0 md:border-r lg:w-[22rem] ${bottomNavClearance} ${
                        mobileShowList ? 'flex' : 'hidden md:flex'
                    }`}
                >
                    {!composing ? (
                        <>
                            <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-0.5 pt-2.5">
                                <h1 className="text-[20px] font-bold leading-none tracking-tight text-zinc-900 dark:text-white">
                                    NS Whats
                                </h1>
                                <div className="flex items-center gap-1.5">
                                    {departmentQueueUrl ? (
                                        <Link
                                            href={departmentQueueUrl}
                                            className="inline-flex cursor-pointer items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                            title="Fila do departamento"
                                        >
                                            Fila do depto
                                        </Link>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={startCompose}
                                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow-sm transition hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                        aria-label="Nova conversa"
                                    >
                                        <PlusIcon className="h-5 w-5" strokeWidth={2.25} />
                                    </button>
                                </div>
                            </div>

                            <div className="shrink-0 px-2.5 pb-1.5 pt-2">
                                <label className="relative block">
                                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <TextInput
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                                        placeholder="Pesquisar"
                                        className="w-full rounded-full border-0 bg-zinc-100 py-1.5 pl-9 pr-3 text-[13px] shadow-none placeholder:text-zinc-400 focus:ring-0 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
                                    />
                                </label>
                            </div>

                            <div className="flex shrink-0 gap-1.5 overflow-x-auto px-2.5 pb-1.5">
                                {tabs.map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() =>
                                            router.get(route('mobile.ns-whats.index'), { tab: t.key }, { preserveState: true })
                                        }
                                        className={`cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                                            tab === t.key
                                                ? 'bg-[#d8fdd2] text-[#006e52] dark:bg-emerald-950 dark:text-emerald-100'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                {roster.length === 0 ? (
                                    <div className="px-5 py-10 text-center text-[13px] text-zinc-500">
                                        Você ainda não possui conversas.
                                        <p className="mt-2 text-[12px] text-zinc-400">Toque em + para iniciar uma nova.</p>
                                        {!fallbackMinistryConfigured ? (
                                            <p className="mt-2 text-[11px] text-zinc-400">
                                                A opção «Não sei com quem falar» depende da configuração da igreja.
                                            </p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <ul className="space-y-1 px-2 py-1.5">
                                        {roster.map((c, index) => {
                                            const isActive = selectedId === c.id;
                                            const isPinned = Boolean(c.pinnedLeader);
                                            const prevPinned = index > 0 ? Boolean(roster[index - 1]?.pinnedLeader) : false;
                                            const nextPinned = index < roster.length - 1 ? Boolean(roster[index + 1]?.pinnedLeader) : false;
                                            const showPinnedDivider = isPinned && !nextPinned && roster.some((row) => !row.pinnedLeader);
                                            const preview = c.viewerRole === 'staff'
                                                ? `${c.ministryName ? `${c.ministryName} · ` : ''}${c.lastPreview}`
                                                : c.ministryName
                                                  ? `${c.ministryName}${c.lastPreview ? ` · ${c.lastPreview}` : ''}`
                                                  : c.lastPreview;
                                            return (
                                                <li key={c.id}>
                                                    {isPinned && !prevPinned ? (
                                                        <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                                                            Seus líderes
                                                        </p>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => openConversation(c.id)}
                                                        disabled={loadingConversation}
                                                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition disabled:cursor-wait disabled:opacity-60 ${
                                                            isActive
                                                                ? 'border border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'
                                                                : isPinned
                                                                  ? 'border border-transparent bg-zinc-50/80 hover:bg-zinc-100/90 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80'
                                                                  : 'border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/80'
                                                        }`}
                                                    >
                                                        <UserListAvatar
                                                            name={c.headerTitle}
                                                            photoUrl={c.headerPhotoUrl}
                                                            size="md"
                                                            previewOnClick={false}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="flex min-w-0 items-center gap-1 truncate text-[14px] font-semibold text-zinc-900 dark:text-white">
                                                                    {isPinned ? (
                                                                        <BookmarkIcon
                                                                            className="h-3.5 w-3.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80"
                                                                            aria-hidden
                                                                            strokeWidth={2}
                                                                        />
                                                                    ) : null}
                                                                    <span className="truncate">
                                                                        {c.headerTitle}
                                                                        {c.viewerRole === 'staff' ? (
                                                                            <span className="ml-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                                                · Recebida
                                                                            </span>
                                                                        ) : null}
                                                                    </span>
                                                                </span>
                                                                <span
                                                                    className={`shrink-0 text-[11px] ${
                                                                        c.unreadCount > 0
                                                                            ? 'font-medium text-[#00a884]'
                                                                            : 'text-zinc-400'
                                                                    }`}
                                                                >
                                                                    {formatWhen(c.lastActivityAt)}
                                                                </span>
                                                            </div>
                                                            <div className="mt-0.5 flex items-center justify-between gap-2">
                                                                <p className="min-w-0 flex-1 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                                                                    {preview}
                                                                </p>
                                                                {c.unreadCount > 0 ? (
                                                                    <span className="inline-flex min-w-[1.1rem] shrink-0 items-center justify-center rounded-full bg-[#00a884] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                                                        {c.unreadCount}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    {showPinnedDivider ? (
                                                        <div
                                                            className="mx-2.5 my-2.5 border-t border-zinc-200/90 dark:border-zinc-800"
                                                            role="separator"
                                                            aria-label="Outras conversas"
                                                        />
                                                    ) : null}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </>
                    ) : (
                        <NsWhatsNewChatPanel
                            ministries={ministries}
                            selectedMinistry={selectedMinistry}
                            leaders={leaders}
                            members={members}
                            fallbackMinistryConfigured={fallbackMinistryConfigured}
                            tab={tab}
                            search={search}
                            onSelectTarget={(draft) => {
                                setComposeDraft(draft);
                                draftForm.setData('message', '');
                            }}
                            onClearTarget={() => setComposeDraft(null)}
                            onClose={closeCompose}
                            selectedRecipientId={composeDraft?.useFallback ? null : (composeDraft?.recipientUserId ?? null)}
                            selectedUseFallback={Boolean(composeDraft?.useFallback)}
                        />
                    )}
                </aside>

                <section
                    className={`h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${bottomNavClearance} ${
                        active || showComposeDraft ? 'flex' : 'hidden md:flex'
                    }`}
                >
                    {active ? (
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="relative flex shrink-0 items-center gap-1.5 border-b border-zinc-200/80 bg-[#f0f2f5] px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-2.5">
                                <button
                                    type="button"
                                    onClick={backToList}
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full md:hidden"
                                    aria-label="Voltar"
                                >
                                    <ArrowLeftIcon className="h-4 w-4" />
                                </button>
                                <UserListAvatar name={active.headerTitle} photoUrl={active.headerPhotoUrl} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[14px] font-semibold leading-tight text-zinc-900 dark:text-white">
                                        {active.headerTitle}
                                    </div>
                                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                        <span
                                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                                active.canChat
                                                    ? 'bg-[#d8fdd2] text-[#006e52] dark:bg-emerald-950 dark:text-emerald-200'
                                                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                            }`}
                                        >
                                            {active.statusLabel}
                                        </span>
                                        <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {active.headerSubtitle}
                                        </span>
                                    </div>
                                </div>
                                {active.canChat ? (
                                    <button
                                        type="button"
                                        onClick={finalizeConversation}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                                        title="Finalizar conversa"
                                    >
                                        <CheckCircleIcon className="h-4 w-4 text-[#00a884]" />
                                        Finalizar
                                    </button>
                                ) : (
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {active.canReopen ? (
                                            <button
                                                type="button"
                                                onClick={() => router.post(route('mobile.ns-whats.reopen', active.id))}
                                                className="inline-flex cursor-pointer items-center rounded-full bg-[#00a884] px-2.5 py-1 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#019978]"
                                            >
                                                Reabrir
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={startCompose}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                                            title="Nova conversa"
                                        >
                                            <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                                            Nova conversa
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((v) => !v)}
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                                    aria-label="Menu"
                                >
                                    <EllipsisVerticalIcon className="h-5 w-5" />
                                </button>
                                {menuOpen ? (
                                    <div className="absolute right-2 top-11 z-20 w-56 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                                        {active.canChat ? (
                                            <button
                                                type="button"
                                                className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm text-zinc-800 dark:text-zinc-100"
                                                onClick={finalizeConversation}
                                            >
                                                Finalizar conversa
                                            </button>
                                        ) : null}
                                        {active.canReopen ? (
                                            <button
                                                type="button"
                                                className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    router.post(route('mobile.ns-whats.reopen', active.id));
                                                }}
                                            >
                                                Reabrir conversa
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#efeae2] px-2 py-2 dark:bg-zinc-950 sm:px-2.5">
                                <div className="flex flex-col gap-1.5">
                                    {liveMessages.map((m) => {
                                        if (m.isSystem || m.kind === 'system') {
                                            return <NsWhatsSystemPill key={m.id}>{m.body}</NsWhatsSystemPill>;
                                        }
                                        const mine = m.authorRole === 'member';
                                        return (
                                            <NsWhatsMessageBubble
                                                key={m.id}
                                                message={m}
                                                mine={mine}
                                                showAuthor={!mine}
                                            />
                                        );
                                    })}
                                    <div ref={threadEnd} />
                                </div>
                            </div>

                            {active.canChat ? (
                                <NsWhatsChatComposer
                                    value={composerText}
                                    onChange={setComposerText}
                                    onSubmit={sendMessage}
                                    processing={sending}
                                    error={composerError}
                                />
                            ) : (
                                <div className="shrink-0 bg-[#efeae2] px-3 pb-2 pt-1 dark:bg-zinc-950">
                                    <div className="mx-auto max-w-xs space-y-2.5">
                                        {active.canReopen ? (
                                            <button
                                                type="button"
                                                onClick={() => router.post(route('mobile.ns-whats.reopen', active.id))}
                                                className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[#00a884] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#019978] active:scale-[0.98]"
                                            >
                                                Reabrir
                                            </button>
                                        ) : null}

                                        <div className="flex items-center gap-3 px-1">
                                            <div className="h-px flex-1 bg-zinc-300/80 dark:bg-zinc-700" />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={startCompose}
                                            className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-zinc-600 transition hover:text-[#00a884] dark:text-zinc-300 dark:hover:text-emerald-300"
                                        >
                                            <PlusIcon className="h-4 w-4" strokeWidth={2} />
                                            Nova conversa
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : showComposeDraft && composeDraft ? (
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="flex shrink-0 items-center gap-1.5 border-b border-zinc-200/80 bg-[#f0f2f5] px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
                                <button
                                    type="button"
                                    onClick={() => setComposeDraft(null)}
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full md:hidden"
                                    aria-label="Voltar"
                                >
                                    <ArrowLeftIcon className="h-4 w-4" />
                                </button>
                                <UserListAvatar
                                    name={composeDraft.title}
                                    photoUrl={composeDraft.photoUrl}
                                    size="sm"
                                    previewOnClick={false}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[14px] font-semibold">{composeDraft.title}</div>
                                    <div className="truncate text-[11px] text-zinc-500">{composeDraft.subtitle}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setComposeDraft(null)}
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                                    aria-label="Fechar"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[#efeae2] px-6 text-center dark:bg-zinc-950">
                                <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
                                    Escreva a primeira mensagem para iniciar a conversa com{' '}
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{composeDraft.title}</span>.
                                </p>
                            </div>
                            <NsWhatsChatComposer
                                value={draftForm.data.message}
                                onChange={(v) => draftForm.setData('message', v)}
                                onSubmit={sendDraft}
                                processing={draftForm.processing}
                                placeholder="Mensagem"
                                error={draftForm.errors.message || draftForm.errors.ministry_id}
                            />
                        </div>
                    ) : (
                        <div className="hidden flex-1 flex-col items-center justify-center bg-[#efeae2] px-6 text-center dark:bg-zinc-950 md:flex">
                            <UserGroupIcon className="mb-3 h-12 w-12 text-emerald-700 dark:text-emerald-300" />
                            <h2 className="text-lg font-semibold">NS Whats</h2>
                            <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                                {composing
                                    ? 'Escolha um departamento ou pessoa à esquerda para escrever a mensagem.'
                                    : 'Selecione uma conversa ou toque em + para falar com as áreas da igreja.'}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </MobileLayout>
    );
}
