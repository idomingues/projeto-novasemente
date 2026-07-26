import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import TextInput from '@/Components/TextInput';
import UserListAvatar from '@/Components/UserListAvatar';
import { getMinistryIconByKey } from '@/lib/ministryIcons';

export type ComposeMinistry = {
    id: number;
    name: string;
    description?: string | null;
    icon?: string | null;
    leaders_count: number;
    members_count?: number;
};

export type ComposePerson = { id: number; name: string; photo_url?: string | null; role?: string };

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
    fallbackMinistryConfigured: boolean;
    tab: string;
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

export default function NsWhatsNewChatPanel({
    ministries,
    selectedMinistry,
    leaders,
    members,
    fallbackMinistryConfigured,
    tab,
    search,
    onSelectTarget,
    onClearTarget,
    onClose,
    selectedRecipientId = null,
    selectedUseFallback = false,
}: Props) {
    const [q, setQ] = useState('');
    const [personQ, setPersonQ] = useState('');

    useEffect(() => {
        if (selectedMinistry) {
            setPersonQ('');
        } else {
            onClearTarget();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMinistry?.id]);

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

    const indexQuery = (extra: Record<string, string | number | undefined> = {}) => ({
        tab,
        q: search || undefined,
        nova: 1,
        ...extra,
    });

    const pickMinistry = (id: number) => {
        onClearTarget();
        router.get(route('mobile.ns-whats.index'), indexQuery({ ministry: id }), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearMinistry = () => {
        onClearTarget();
        router.get(route('mobile.ns-whats.index'), indexQuery({ ministry: undefined }), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openDraftOrSelect = (opts: {
        recipientUserId: number | '';
        title: string;
        subtitle: string;
        photoUrl?: string | null;
        useFallback?: boolean;
    }) => {
        if (!selectedMinistry && !opts.useFallback) return;
        onSelectTarget({
            ministryId: selectedMinistry?.id ?? 0,
            ministryName: selectedMinistry?.name ?? 'Fila geral',
            recipientUserId: opts.recipientUserId,
            title: opts.title,
            subtitle: opts.subtitle,
            photoUrl: opts.photoUrl ?? null,
            useFallback: opts.useFallback,
        });
    };

    const isSelected = (id: number | '') => selectedRecipientId !== null && selectedRecipientId === id;

    if (selectedMinistry) {
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
                        className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left ${
                            isSelected('')
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                : 'border-zinc-200 dark:border-zinc-700'
                        }`}
                    >
                        <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">Enviar para o departamento</div>
                        <p className="mt-0.5 text-[11px] text-zinc-500">Qualquer líder autorizado poderá responder.</p>
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
                            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left ${
                                isSelected(l.id)
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                    : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                        >
                            <UserListAvatar name={l.name} photoUrl={l.photo_url} size="md" previewOnClick={false} />
                            <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold">{l.name}</div>
                                <div className="text-[11px] text-zinc-500">Líder</div>
                            </div>
                        </button>
                    ))}

                    {filteredMembers.map((m) => (
                        <button
                            key={`m-${m.id}`}
                            type="button"
                            onClick={() =>
                                openDraftOrSelect({
                                    recipientUserId: m.id,
                                    title: m.name,
                                    subtitle: `Membro · ${selectedMinistry.name}`,
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
                                <div className="truncate text-[13px] font-semibold">{m.name}</div>
                                <div className="text-[11px] text-zinc-500">Membro</div>
                            </div>
                        </button>
                    ))}
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
                        placeholder="Pesquisar departamento"
                        className="w-full rounded-full border-0 bg-zinc-100 py-1.5 pl-8 pr-3 text-[12px] shadow-none dark:bg-zinc-900"
                    />
                </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2">
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

                {filtered.length === 0 ? (
                    <p className="py-8 text-center text-[12px] text-zinc-500">Nenhum departamento localizado.</p>
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
