import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import SelectInput from '@/Components/SelectInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import NsWhatsChatComposer from '@/Components/NsWhats/NsWhatsChatComposer';
import { NsWhatsMessageBubble, NsWhatsSystemPill } from '@/Components/NsWhats/NsWhatsMessageBubble';
import { FormEventHandler, useRef, useEffect, useState } from 'react';
import { sendNsWhatsMessage, type NsWhatsMessagePayload } from '@/utils/nsWhatsSendMessage';

type Message = {
    id: number;
    authorRole: string;
    authorName?: string | null;
    body: string;
    kind: string;
    isInternal?: boolean;
    isSystem?: boolean;
    createdAt?: string | null;
    editedAt?: string | null;
};

type Conversation = {
    id: number;
    headerTitle: string;
    headerSubtitle: string;
    statusLabel: string;
    canClaim: boolean;
    canTransfer: boolean;
    canForward: boolean;
    canInternalNote: boolean;
    canReply: boolean;
    messages: Message[];
    currentMinistryId: number;
};

interface Props {
    conversation: Conversation;
    peerLeaders: { id: number; name: string }[];
    otherMinistries: { id: number; name: string }[];
    indexUrl: string;
}

export default function LeaderShow({ conversation, peerLeaders, otherMinistries, indexUrl }: Props) {
    const endRef = useRef<HTMLDivElement | null>(null);
    const [transferOpen, setTransferOpen] = useState(false);
    const [forwardOpen, setForwardOpen] = useState(false);
    const [noteOpen, setNoteOpen] = useState(false);
    const [composerText, setComposerText] = useState('');
    const [composerError, setComposerError] = useState<string | undefined>();
    const [sending, setSending] = useState(false);
    const [liveMessages, setLiveMessages] = useState<NsWhatsMessagePayload[]>(conversation.messages);

    const transferForm = useForm({ to_user_id: '', reason: '' });
    const forwardForm = useForm({
        to_ministry_id: '',
        to_leader_user_id: '',
        reason: '',
        internal_note: '',
    });
    const noteForm = useForm({ content: '' });

    useEffect(() => {
        setLiveMessages(conversation.messages);
        setComposerText('');
        setComposerError(undefined);
    }, [conversation.id]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }, [liveMessages.length]);

    const send: FormEventHandler = async (e) => {
        e.preventDefault();
        if (sending) return;
        const content = composerText.trim();
        if (!content) return;

        const tempId = -Date.now();
        const optimistic: NsWhatsMessagePayload = {
            id: tempId,
            authorRole: 'leader',
            authorName: null,
            body: content,
            kind: 'public',
            createdAt: new Date().toISOString(),
        };

        setComposerText('');
        setComposerError(undefined);
        setSending(true);
        setLiveMessages((prev) => [...prev, optimistic]);

        const result = await sendNsWhatsMessage(
            route('mobile.ns-whats.leader.messages.store', conversation.id),
            content,
        );
        setSending(false);

        if (!result.ok) {
            setLiveMessages((prev) => prev.filter((m) => m.id !== tempId));
            setComposerText(content);
            setComposerError(result.error);
            return;
        }

        setLiveMessages((prev) => prev.map((m) => (m.id === tempId ? result.message : m)));
    };

    return (
        <MobileLayout flush>
            <Head title={`NS Conecta — ${conversation.headerTitle}`} />
            <div className={`mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:border-x pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]`}>
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200/80 bg-[#f0f2f5] px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="min-w-0 flex-1">
                        <Link href={indexUrl} className="inline-flex cursor-pointer text-sm font-medium text-[#00a884]">
                            ← Conversas
                        </Link>
                        <h1 className="truncate text-[16px] font-semibold leading-tight text-zinc-900 dark:text-white">
                            {conversation.headerTitle}
                        </h1>
                        <p className="truncate text-[12px] text-zinc-500">
                            {conversation.headerSubtitle}
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                        {conversation.canClaim ? (
                            <PrimaryButton
                                type="button"
                                className="!rounded-full !px-3 !py-1.5 text-xs"
                                onClick={() => router.post(route('mobile.ns-whats.leader.claim', conversation.id))}
                            >
                                Assumir
                            </PrimaryButton>
                        ) : null}
                        {conversation.canTransfer ? (
                            <SecondaryButton type="button" className="!rounded-full !px-3 !py-1.5 text-xs" onClick={() => setTransferOpen(true)}>
                                Transferir
                            </SecondaryButton>
                        ) : null}
                        {conversation.canForward ? (
                            <SecondaryButton type="button" className="!rounded-full !px-3 !py-1.5 text-xs" onClick={() => setForwardOpen(true)}>
                                Encaminhar
                            </SecondaryButton>
                        ) : null}
                        {conversation.canInternalNote ? (
                            <SecondaryButton type="button" className="!rounded-full !px-3 !py-1.5 text-xs" onClick={() => setNoteOpen(true)}>
                                Interna
                            </SecondaryButton>
                        ) : null}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[#efeae2] px-2.5 py-3 dark:bg-zinc-950 sm:px-3">
                    <div className="flex flex-col gap-1.5">
                        {liveMessages.map((m) => {
                            if (m.isSystem || m.kind === 'system') {
                                return <NsWhatsSystemPill key={m.id}>{m.body}</NsWhatsSystemPill>;
                            }
                            if (m.isInternal || m.kind === 'internal') {
                                return (
                                    <div
                                        key={m.id}
                                        className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                                    >
                                        <div className="text-[11px] font-semibold">
                                            Observação interna · {m.authorName}
                                        </div>
                                        <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
                                    </div>
                                );
                            }
                            const mine = m.authorRole !== 'member';
                            return (
                                <NsWhatsMessageBubble
                                    key={m.id}
                                    message={m}
                                    mine={mine}
                                    showAuthor={!mine}
                                />
                            );
                        })}
                        <div ref={endRef} />
                    </div>
                </div>

                {conversation.canReply ? (
                    <NsWhatsChatComposer
                        value={composerText}
                        onChange={setComposerText}
                        onSubmit={send}
                        processing={sending}
                        placeholder="Mensagem"
                        error={composerError}
                    />
                ) : conversation.canClaim ? (
                    <p className="shrink-0 border-t border-zinc-200 bg-[#f0f2f5] px-4 py-3 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                        Assuma a conversa para responder.
                    </p>
                ) : (
                    <p className="shrink-0 border-t border-zinc-200 bg-[#f0f2f5] px-4 py-3 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                        Esta conversa está com outro responsável. Peça transferência ou use permissão de administrador.
                    </p>
                )}
            </div>

            <Modal show={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="md">
                <form
                    className="space-y-4 p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        transferForm.post(route('mobile.ns-whats.leader.transfer', conversation.id), {
                            onSuccess: () => setTransferOpen(false),
                        });
                    }}
                >
                    <h2 className="text-lg font-semibold">Transferir para outro líder</h2>
                    <div>
                        <InputLabel value="Líder" />
                        <SelectInput
                            className="mt-1"
                            value={transferForm.data.to_user_id}
                            onChange={(e) => transferForm.setData('to_user_id', e.target.value)}
                            required
                        >
                            <option value="">Selecione…</option>
                            {peerLeaders.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <InputLabel value="Motivo (opcional)" />
                        <Textarea
                            className="mt-1"
                            rows={2}
                            value={transferForm.data.reason}
                            onChange={(e) => transferForm.setData('reason', e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setTransferOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={transferForm.processing}>
                            Transferir
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={forwardOpen} onClose={() => setForwardOpen(false)} maxWidth="md">
                <form
                    className="space-y-4 p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        forwardForm.post(route('mobile.ns-whats.leader.forward', conversation.id), {
                            onSuccess: () => setForwardOpen(false),
                        });
                    }}
                >
                    <h2 className="text-lg font-semibold">Encaminhar para outro departamento</h2>
                    <div>
                        <InputLabel value="Departamento" />
                        <SelectInput
                            className="mt-1"
                            value={forwardForm.data.to_ministry_id}
                            onChange={(e) => forwardForm.setData('to_ministry_id', e.target.value)}
                            required
                        >
                            <option value="">Selecione…</option>
                            {otherMinistries.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <InputLabel value="Motivo" />
                        <Textarea
                            className="mt-1"
                            rows={2}
                            value={forwardForm.data.reason}
                            onChange={(e) => forwardForm.setData('reason', e.target.value)}
                        />
                    </div>
                    <div>
                        <InputLabel value="Observação interna (não visível ao membro)" />
                        <Textarea
                            className="mt-1"
                            rows={2}
                            value={forwardForm.data.internal_note}
                            onChange={(e) => forwardForm.setData('internal_note', e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setForwardOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={forwardForm.processing}>
                            Encaminhar
                        </PrimaryButton>
                    </div>
                    <InputError message={forwardForm.errors.to_ministry_id} />
                </form>
            </Modal>

            <Modal show={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="md">
                <form
                    className="space-y-4 p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        noteForm.post(route('mobile.ns-whats.leader.internal', conversation.id), {
                            onSuccess: () => {
                                noteForm.reset();
                                setNoteOpen(false);
                            },
                        });
                    }}
                >
                    <h2 className="text-lg font-semibold">Adicionar observação interna</h2>
                    <p className="text-sm text-amber-800 dark:text-amber-200">Esta observação não será exibida para o membro.</p>
                    <Textarea
                        rows={4}
                        value={noteForm.data.content}
                        onChange={(e) => noteForm.setData('content', e.target.value)}
                        required
                    />
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setNoteOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={noteForm.processing}>
                            Salvar
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </MobileLayout>
    );
}
