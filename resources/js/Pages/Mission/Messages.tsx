import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import { Head, router, useForm } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon, EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';
import { confirmAction } from '@/utils/confirmDialog';
import { FormEventHandler } from 'react';

type MessageRow = {
    id: number;
    body: string;
    authorName: string;
    authorEmail: string | null;
    is_hidden: boolean;
    isTeamHighlight: boolean;
    moderationStatus: string;
    moderationStatusLabel: string;
    moderationNote: string | null;
    createdAt: string | null;
};

interface Props {
    pendingMessages: MessageRow[];
    messages: MessageRow[];
    canManage: boolean;
    teamStoreUrl: string;
}

function formatWhen(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR');
}

function TeamBadge() {
    return (
        <span className="inline-flex rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-teal-500 dark:text-teal-950">
            Equipe Missão
        </span>
    );
}

function messageCardClass(row: MessageRow): string {
    if (row.moderationStatus === 'rejected') {
        return 'border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20';
    }
    if (row.isTeamHighlight && row.moderationStatus === 'published') {
        return 'border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50/80 shadow-sm ring-1 ring-teal-200/80 dark:border-teal-700 dark:from-teal-950/50 dark:to-emerald-950/30 dark:ring-teal-800/60';
    }
    if (row.is_hidden) {
        return 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20';
    }

    return 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900';
}

function MessageBody({ row }: { row: MessageRow }) {
    return (
        <>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{row.body}</p>
            {row.moderationNote ? (
                <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">Análise automática:</span> {row.moderationNote}
                </p>
            ) : null}
        </>
    );
}

export default function MissionMessagesAdmin({
    pendingMessages,
    messages,
    canManage,
    teamStoreUrl,
}: Props) {
    const teamForm = useForm({ body: '' });

    const submitTeam: FormEventHandler = (e) => {
        e.preventDefault();
        teamForm.post(teamStoreUrl, {
            preserveScroll: true,
            onSuccess: () => teamForm.reset('body'),
        });
    };

    const approve = (id: number) => {
        router.patch(route('mission.content.messages.approve', id), {}, { preserveScroll: true });
    };

    const reject = async (id: number) => {
        const ok = await confirmAction({
            title: 'Não publicar depoimento?',
            text: 'O autor será avisado no aplicativo e a mensagem não aparecerá no mural.',
            confirmButtonText: 'Não publicar',
            danger: true,
            icon: 'warning',
        });
        if (ok) router.patch(route('mission.content.messages.reject', id), {}, { preserveScroll: true });
    };

    const toggleVisibility = (id: number) => {
        router.patch(route('mission.content.messages.visibility', id), {}, { preserveScroll: true });
    };

    const destroy = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir depoimento?',
            text: 'O depoimento será removido permanentemente.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) router.delete(route('mission.content.messages.destroy', id), { preserveScroll: true });
    };

    const hasAny = pendingMessages.length > 0 || messages.length > 0;

    return (
        <AdminLayout>
            <Head title="Missão — Depoimentos" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle="Depoimentos da comunidade passam por análise automática quando necessário. A equipe pode publicar mensagens em destaque."
                />
                <MissionAdminTabs active="depoimentos" />

                {canManage ? (
                    <form
                        onSubmit={submitTeam}
                        className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 dark:border-teal-900 dark:bg-teal-950/30"
                    >
                        <h2 className="text-sm font-semibold text-teal-950 dark:text-teal-100">Publicar depoimento da equipe</h2>
                        <p className="mt-1 text-xs text-teal-900/80 dark:text-teal-200/80">
                            Aparece em destaque no app, sem passar pela fila de moderação.
                        </p>
                        <Textarea
                            className="mt-3 w-full"
                            rows={4}
                            value={teamForm.data.body}
                            onChange={(e) => teamForm.setData('body', e.target.value)}
                            placeholder="Escreva o depoimento oficial da equipe missionária…"
                        />
                        <InputError message={teamForm.errors.body} className="mt-1" />
                        <PrimaryButton type="submit" className="mt-3" disabled={teamForm.processing || !teamForm.data.body.trim()}>
                            {teamForm.processing ? 'Publicando…' : 'Publicar em destaque'}
                        </PrimaryButton>
                    </form>
                ) : null}

                {!hasAny ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600">Nenhum depoimento ainda</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {pendingMessages.length > 0 ? (
                            <section>
                                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                                    Aguardando análise ({pendingMessages.length})
                                </h2>
                                <ul className="space-y-3">
                                    {pendingMessages.map((m) => (
                                        <li
                                            key={m.id}
                                            className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/25"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-zinc-900 dark:text-white">{m.authorName}</p>
                                                    {m.authorEmail ? (
                                                        <p className="text-xs text-zinc-500">{m.authorEmail}</p>
                                                    ) : null}
                                                    <time className="text-xs text-zinc-500">{formatWhen(m.createdAt)}</time>
                                                </div>
                                                {canManage ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        <PrimaryButton type="button" onClick={() => approve(m.id)}>
                                                            Aprovar
                                                        </PrimaryButton>
                                                        <SecondaryButton type="button" onClick={() => reject(m.id)}>
                                                            Não publicar
                                                        </SecondaryButton>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <MessageBody row={m} />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        {messages.length > 0 ? (
                            <section>
                                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                    Publicados e histórico
                                </h2>
                                <ul className="space-y-3">
                                    {messages.map((m) => (
                                        <li key={m.id} className={`rounded-2xl border p-4 ${messageCardClass(m)}`}>
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-zinc-900 dark:text-white">{m.authorName}</p>
                                                        {m.isTeamHighlight ? <TeamBadge /> : null}
                                                    </div>
                                                    {m.authorEmail ? (
                                                        <p className="text-xs text-zinc-500">{m.authorEmail}</p>
                                                    ) : null}
                                                    <time className="text-xs text-zinc-500">{formatWhen(m.createdAt)}</time>
                                                </div>
                                                {canManage && m.moderationStatus === 'published' ? (
                                                    <div className="flex gap-2">
                                                        {!m.isTeamHighlight ? (
                                                            <SecondaryButton type="button" onClick={() => toggleVisibility(m.id)}>
                                                                {m.is_hidden ? (
                                                                    <>
                                                                        <EyeIcon className="mr-1 h-4 w-4" /> Exibir
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <EyeSlashIcon className="mr-1 h-4 w-4" /> Ocultar
                                                                    </>
                                                                )}
                                                            </SecondaryButton>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => destroy(m.id)}
                                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                ) : canManage ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => destroy(m.id)}
                                                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                ) : null}
                                            </div>
                                            <MessageBody row={m} />
                                            {m.moderationStatus === 'rejected' ? (
                                                <p className="mt-2 text-xs font-medium text-red-800 dark:text-red-200">
                                                    {m.moderationStatusLabel}
                                                </p>
                                            ) : m.is_hidden ? (
                                                <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                                                    Oculto no app
                                                </p>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
