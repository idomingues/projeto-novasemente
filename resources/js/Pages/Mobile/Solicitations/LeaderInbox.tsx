import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ChevronRightIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface Row {
    id: number;
    typeLabel: string;
    status: string;
    statusLabel: string;
    subject: string | null;
    memberLabel: string;
    messageExcerpt: string;
    updatedAt: string;
    showUrl: string;
}

interface Props {
    conversations: Row[];
    moreUrl: string;
}

export default function LeaderInbox({ conversations, moreUrl }: Props) {
    return (
        <MobileLayout>
            <Head title="Conversas como líder" />
            <div className="space-y-4">
                <div>
                    <Link href={moreUrl} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                        ← Mais
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Conversas como líder</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Responda aos membros que o escolheram em «Falar com líder». No computador, use Atendimento no painel web.
                    </p>
                </div>

                {conversations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Ainda não há conversas atribuídas a si.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {conversations.map((c) => (
                            <li key={c.id}>
                                <Link
                                    href={c.showUrl}
                                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-zinc-900 dark:text-white truncate">
                                            {c.subject?.trim() || c.memberLabel}
                                        </div>
                                        {c.subject?.trim() ? (
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                                Membro: {c.memberLabel}
                                            </div>
                                        ) : null}
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            {c.statusLabel} · {new Date(c.updatedAt).toLocaleString('pt-PT')}
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-2">{c.messageExcerpt}</p>
                                    </div>
                                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
