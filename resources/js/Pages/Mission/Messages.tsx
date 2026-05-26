import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import PageHeader from '@/Components/PageHeader';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, router } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon, EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';
import { confirmAction } from '@/utils/confirmDialog';

type MessageRow = {
    id: number;
    body: string;
    authorName: string;
    authorEmail: string | null;
    is_hidden: boolean;
    createdAt: string | null;
};

interface Props {
    messages: MessageRow[];
    canManage: boolean;
}

function formatWhen(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR');
}

export default function MissionMessagesAdmin({ messages, canManage }: Props) {
    const toggleVisibility = (id: number) => {
        router.patch(route('mission.content.messages.visibility', id), {}, { preserveScroll: true });
    };

    const destroy = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir recado?',
            text: 'O recado será removido permanentemente.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) router.delete(route('mission.content.messages.destroy', id), { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Missão — Recados" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle="Modere os recados publicados pela comunidade no app."
                />
                <MissionAdminTabs active="recados" />

                {messages.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600">Nenhum recado publicado</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {messages.map((m) => (
                            <li
                                key={m.id}
                                className={`rounded-2xl border p-4 ${
                                    m.is_hidden
                                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
                                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                                }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-zinc-900 dark:text-white">{m.authorName}</p>
                                        {m.authorEmail ? <p className="text-xs text-zinc-500">{m.authorEmail}</p> : null}
                                        <time className="text-xs text-zinc-500">{formatWhen(m.createdAt)}</time>
                                    </div>
                                    {canManage ? (
                                        <div className="flex gap-2">
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
                                            <button
                                                type="button"
                                                onClick={() => destroy(m.id)}
                                                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                    {m.body}
                                </p>
                                {m.is_hidden ? (
                                    <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">Oculto no app</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </AdminLayout>
    );
}
