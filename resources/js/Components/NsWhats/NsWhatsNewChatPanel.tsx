import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import UserListAvatar from '@/Components/UserListAvatar';
import ListSearchHint from '@/Components/ListSearchHint';
import { getMinistryIconByKey } from '@/lib/ministryIcons';
import {
    isListSearchBelowMinimum,
    LIST_SEARCH_DEBOUNCE_MS,
    LIST_SEARCH_MIN_LENGTH,
    serverSearchTerm,
} from '@/utils/listSearch';

export type ComposeMinistry = {
    id: number;
    name: string;
    description?: string | null;
    icon?: string | null;
    leaders_count: number;
    members_count?: number;
};

export type ComposePerson = { id: number; name: string; photo_url?: string | null; role?: string };

export type ComposePeopleMatch = ComposePerson & {
    ministry_id: number;
    ministry_name: string;
};

export type DraftTarget = {
    ministryId: number;
    ministryName: string;
    recipientUserId: number | '';
    title: string;
    subtitle: string;
    photoUrl?: string | null;
    useFallback?: boolean;
};

type Props = {
    ministries: ComposeMinistry[];
    selectedMinistry: ComposeMinistry | null;
    leaders: ComposePerson[];
    members: ComposePerson[];
    peopleMatches?: ComposePeopleMatch[];
    peopleSearch?: string;
    fallbackMinistryConfigured: boolean;
    search: string;
    /** Destino escolhido → painel de mensagem à direita (PC) / tela de conversa (mobile). */
    onSelectTarget: (draft: DraftTarget) => void;
    onClearTarget: () => void;
    onClose: () => void;
    selectedRecipientId?: number | '' | null;
    selectedUseFallback?: boolean;
};

function personCountLabel(leaders: number, members: number): string {
    const parts: string[] = [];
    if (leaders > 0) parts.push(`${leaders} ${leaders === 1 ? 'líder' : 'líderes'}`);
    if (members > 0) parts.push(`${members} ${members === 1 ? 'membro' : 'membros'}`);
    return parts.join(' · ') || 'Departamento';
}

function roleLabel(role?: string): string {
    return role === 'leader' ? 'Líder' : 'Voluntário';
}

export default function NsWhatsNewChatPanel({
    ministries,
    selectedMinistry,
    leaders,
    members,
    peopleMatches = [],
    peopleSearch = '',
    fallbackMinistryConfigured,
    search,
    onSelectTarget,
    onClearTarget,
    onClose,
    selectedRecipientId = null,
    selectedUseFallback = false,
}: Props) {
    const [q, setQ] = useState(peopleSearch);
    const [personQ, setPersonQ] = useState('');
    const [peopleLoading, setPeopleLoading] = useState(false);
    const lastRequestedPessoa = useRef(peopleSearch);

    const indexQuery = (extra: Record<string, string | number | undefined> = {}) => ({
        q: search || undefined,
        nova: 1,
        ...extra,
    });

    useEffect(() => {
        setQ(peopleSearch);
        lastRequestedPessoa.current = peopleSearch;
        setPeopleLoading(false);
    }, [peopleSearch]);

    useEffect(() => {
        if (selectedMinistry) {
            setPersonQ('');
        } else {
            onClearTarget();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMinistry?.id]);

    useEffect(() => {
        if (selectedMinistry) {
            return;
        }

        const term = serverSearchTerm(q) ?? '';
        if (term === (lastRequestedPessoa.current || '')) {
            return;
        }

        const handle = window.setTimeout(() => {
            lastRequestedPessoa.current = term;
            setPeopleLoading(true);
            router.get(
                route('mobile.ns-whats.index'),
                indexQuery({ pessoa: term || undefined }),
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['peopleMatches', 'peopleSearch', 'composing'],
                    onFinish: () => setPeopleLoading(false),
                },
            );
        }, LIST_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, selectedMinistry?.id]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return ministries;
        return ministries.filter(
            (m) =>
                m.name.toLowerCase().includes(term) ||
                (m.description ?? '').toLowerCase().includes(term),
        );
    }, [ministries, q]);

    const filteredLeaders = useMemo(() => {
        const term = personQ.trim().toLowerCase();
        if (!term) return leaders;
        return leaders.filter((p) => p.name.toLowerCase().includes(term));
    }, [leaders, personQ]);

    const filteredMembers = useMemo(() => {
        const term = personQ.trim().toLowerCase();
        if (!term) return members;
        return members.filter((p) => p.name.toLowerCase().includes(term));
    }, [members, personQ]);

    const pickMinistry = (id: number) => {
        onClearTarget();
        router.get(route('mobile.ns-whats.index'), indexQuery({ ministry: id, pessoa: undefined }), {
            preserveState: true,
            preserveScroll: true,
            only: ['ministries', 'selectedMinistry', 'leaders', 'members', 'peopleMatches', 'peopleSearch', 'composing'],
        });
    };

    const clearMinistry = () => {
        onClearTarget();
        router.get(route('mobile.ns-whats.index'), indexQuery({ ministry: undefined, pessoa: serverSearchTerm(q) }), {
            preserveState: true,
            preserveScroll: true,
            only: ['ministries', 'selectedMinistry', 'leaders', 'members', 'peopleMatches', 'peopleSearch', 'composing'],
        });
    };

    const openDraftOrSelect = (opts: {
        recipientUserId: number | '';
        title: string;
        subtitle: string;
        photoUrl?: string | null;
        useFallback?: boolean;
        ministryId?: number;
        ministryName?: string;
    }) => {
        const ministryId = opts.ministryId ?? selectedMinistry?.id;
        const ministryName = opts.ministryName ?? selectedMinistry?.name;
        if ((!ministryId || !ministryName) && !opts.useFallback) return;
        onSelectTarget({
            ministryId: ministryId ?? 0,
            ministryName: ministryName ?? 'Fila geral',
            recipientUserId: opts.recipientUserId,
            title: opts.title,
            subtitle: opts.subtitle,
            photoUrl: opts.photoUrl ?? null,
            useFallback: opts.useFallback,
        });
    };

    const isSelected = (id: number | '') => selectedRecipientId !== null && selectedRecipientId === id;
    const showPeopleHint = isListSearchBelowMinimum(q);
    const hasPeopleQuery = Boolean(serverSearchTerm(q));

    if (selectedMinistry) {
        const MinistryIcon = getMinistryIconByKey(selectedMinistry.icon ?? null);

        return (
            <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 space-y-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={clearMinistry}
                        className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[#00a884]"
                    >
                        <ArrowLeftIcon className="h-3.5 w-3.5" /> Departamentos
                    </button>
                    <div>
                        <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">{selectedMinistry.name}</h2>
                        {selectedMinistry.description ? (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{selectedMinistry.description}</p>
                        ) : null}
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2.5 py-2">
                    <button
                        type="button"
                        onClick={() =>
                            openDraftOrSelect({
                                recipientUserId: '',
                                title: selectedMinistry.name,
                                subtitle: 'Fila do departamento',
                            })
                        }
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left shadow-sm ${
                            isSelected('')
                                ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600/30 dark:border-teal-400 dark:bg-teal-950/50 dark:ring-teal-400/40'
                                : 'border-teal-300/80 bg-gradient-to-r from-teal-50 to-[#f5f1e9] dark:border-teal-700 dark:from-teal-950/60 dark:to-zinc-900'
                        }`}
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700/15 text-teal-800 dark:bg-teal-400/20 dark:text-teal-200">
                            <MinistryIcon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <div className="truncate text-[13px] font-semibold text-teal-950 dark:text-teal-50">
                                    Enviar para o departamento
                                </div>
                                <span className="shrink-0 rounded-full bg-teal-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white dark:bg-teal-400 dark:text-teal-950">
                                    Depto
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-teal-900/70 dark:text-teal-100/70">
                                Fila de {selectedMinistry.name} · qualquer líder pode responder
                            </p>
                        </div>
                    </button>

                    {(filteredLeaders.length > 0 || filteredMembers.length > 0) && (
                        <p className="px-1 pt-1 text-[11px] font-medium text-zinc-500">Ou escolha alguém:</p>
                    )}

                    {(leaders.length + members.length) > 5 ? (
                        <label className="relative block">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                            <TextInput
                                value={personQ}
                                onChange={(e) => setPersonQ(e.target.value)}
                                placeholder="Pesquisar"
                                className="w-full rounded-full border-0 bg-zinc-100 py-1.5 pl-8 pr-3 text-[12px] shadow-none dark:bg-zinc-900"
                            />
                        </label>
                    ) : null}

                    {filteredLeaders.length > 0 ? (
                        <div className="space-y-1.5">
                            <p className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-300">
                                {filteredLeaders.length === 1 ? 'Líder do departamento' : 'Líderes do departamento'}
                            </p>
                            {filteredLeaders.map((l) => (
                                <button
                                    key={`l-${l.id}`}
                                    type="button"
                                    onClick={() =>
                                        openDraftOrSelect({
                                            recipientUserId: l.id,
                                            title: l.name,
                                            subtitle: `Líder · ${selectedMinistry.name}`,
                                            photoUrl: l.photo_url,
                                        })
                                    }
                                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left shadow-sm ${
                                        isSelected(l.id)
                                            ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600/30 dark:border-teal-400 dark:bg-teal-950/50 dark:ring-teal-400/40'
                                            : 'border-teal-300/80 bg-gradient-to-r from-teal-50 to-[#f5f1e9] dark:border-teal-700 dark:from-teal-950/60 dark:to-zinc-900'
                                    }`}
                                >
                                    <div className="relative shrink-0">
                                        <UserListAvatar name={l.name} photoUrl={l.photo_url} size="md" previewOnClick={false} />
                                        <span
                                            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-teal-600 ring-2 ring-white dark:bg-teal-400 dark:ring-zinc-900"
                                            aria-hidden
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <div className="truncate text-[13px] font-semibold text-teal-950 dark:text-teal-50">
                                                {l.name}
                                            </div>
                                            <span className="shrink-0 rounded-full bg-teal-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white dark:bg-teal-400 dark:text-teal-950">
                                                Líder
                                            </span>
                                        </div>
                                                        <div className="truncate text-[11px] text-teal-900/70 dark:text-teal-100/70">
                                                            Líder do {selectedMinistry.name}
                                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {filteredMembers.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                            <p className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                Voluntários
                            </p>
                            {filteredMembers.map((m) => (
                                <button
                                    key={`m-${m.id}`}
                                    type="button"
                                    onClick={() =>
                                        openDraftOrSelect({
                                            recipientUserId: m.id,
                                            title: m.name,
                                            subtitle: `Voluntário · ${selectedMinistry.name}`,
                                            photoUrl: m.photo_url,
                                        })
                                    }
                                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left ${
                                        isSelected(m.id)
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                            : 'border-zinc-200 dark:border-zinc-700'
                                    }`}
                                >
                                    <UserListAvatar name={m.name} photoUrl={m.photo_url} size="md" previewOnClick={false} />
                                    <div className="min-w-0">
                                        <div className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">
                                            {m.name}
                                        </div>
                                        <div className="text-[11px] text-zinc-500">Voluntário</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 space-y-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">Nova conversa</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                        Fechar
                    </button>
                </div>
                <label className="relative block">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <TextInput
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Pesquisar departamento, líder ou voluntário"
                        className="w-full rounded-full border-0 bg-zinc-100 py-1.5 pl-8 pr-3 text-[12px] shadow-none dark:bg-zinc-900"
                    />
                </label>
                <ListSearchHint show={showPeopleHint} minLength={LIST_SEARCH_MIN_LENGTH} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2">
                {hasPeopleQuery ? (
                    <div className="mb-3 space-y-2">
                        <p className="px-1 text-[11px] font-medium text-zinc-500">
                            {peopleLoading ? 'Buscando pessoas…' : 'Pessoas'}
                        </p>
                        {!peopleLoading && peopleMatches.length === 0 ? (
                            <p className="px-1 pb-1 text-[12px] text-zinc-400">Nenhum líder ou voluntário encontrado.</p>
                        ) : null}
                        {peopleMatches.map((person) => (
                            <button
                                key={`p-${person.id}-${person.ministry_id}-${person.role ?? 'member'}`}
                                type="button"
                                onClick={() =>
                                    openDraftOrSelect({
                                        recipientUserId: person.id,
                                        title: person.name,
                                        subtitle: `${roleLabel(person.role)} · ${person.ministry_name}`,
                                        photoUrl: person.photo_url,
                                        ministryId: person.ministry_id,
                                        ministryName: person.ministry_name,
                                    })
                                }
                                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left ${
                                    isSelected(person.id)
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                        : 'border-zinc-200 dark:border-zinc-700'
                                }`}
                            >
                                <UserListAvatar name={person.name} photoUrl={person.photo_url} size="md" previewOnClick={false} />
                                <div className="min-w-0">
                                    <div className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">{person.name}</div>
                                    <div className="truncate text-[11px] text-zinc-500">
                                        {roleLabel(person.role)} · {person.ministry_name}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : null}

                {filtered.length > 0 ? (
                    <>
                        {hasPeopleQuery ? (
                            <p className="mb-2 px-1 text-[11px] font-medium text-zinc-500">Departamentos</p>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                            {filtered.map((m) => {
                                const Icon = getMinistryIconByKey(m.icon ?? null);
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => pickMinistry(m.id)}
                                        className="flex cursor-pointer flex-col items-start rounded-xl border border-zinc-200 bg-white p-2.5 text-left transition hover:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-900"
                                    >
                                        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="text-[12px] font-semibold leading-tight text-zinc-900 dark:text-white">{m.name}</div>
                                        <p className="mt-1 text-[10px] text-zinc-400">
                                            {personCountLabel(m.leaders_count, m.members_count ?? 0)}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : null}

                {!hasPeopleQuery && filtered.length === 0 ? (
                    <p className="py-8 text-center text-[12px] text-zinc-500">Nenhum departamento localizado.</p>
                ) : null}

                {hasPeopleQuery && filtered.length === 0 && peopleMatches.length === 0 && !peopleLoading ? (
                    <p className="py-6 text-center text-[12px] text-zinc-500">Nenhum resultado para essa busca.</p>
                ) : null}

                {fallbackMinistryConfigured ? (
                    <button
                        type="button"
                        onClick={() =>
                            openDraftOrSelect({
                                recipientUserId: '',
                                title: 'Fila geral',
                                subtitle: 'Não sei com quem falar',
                                useFallback: true,
                            })
                        }
                        className={`mt-3 w-full cursor-pointer rounded-xl border border-dashed px-3 py-3 text-left ${
                            selectedUseFallback
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                    >
                        <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Não sei com quem falar</h3>
                        <p className="mt-0.5 text-[11px] text-zinc-500">Enviaremos para a fila geral da igreja.</p>
                    </button>
                ) : null}
            </div>
        </div>
    );
}
