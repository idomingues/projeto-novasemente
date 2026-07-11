import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { solicitationsBackLinkClass } from '@/Pages/Mobile/Solicitations/solicitationNavClasses';
import { useState } from 'react';
import SolicitationDetailPanel, {
    type SolicitationDetailShape,
    type SolicitationMessageRow,
} from '@/Components/Solicitations/SolicitationDetailPanel';

interface Props {
    solicitation: SolicitationDetailShape;
    messages: SolicitationMessageRow[];
    canChat: boolean;
    messageStoreUrl: string;
    hubUrl: string;
    mineUrl: string;
    canFinalizeLeaderChat?: boolean;
    finalizeLeaderChatUrl?: string | null;
    memberHideConversationUrl?: string | null;
    leaderHideConversationUrl?: string | null;
}

export default function LeaderShow({
    solicitation,
    messages,
    canChat,
    messageStoreUrl,
    hubUrl,
    mineUrl,
    canFinalizeLeaderChat,
    finalizeLeaderChatUrl,
    memberHideConversationUrl,
    leaderHideConversationUrl,
}: Props) {
    const [tab, setTab] = useState<'detalhes' | 'chat'>('chat');

    const tabBtn = (active: boolean) =>
        `flex-1 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px text-center ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    return (
        <MobileLayout>
            <Head title={solicitation.subject?.trim() ? `${solicitation.subject} · Líder` : `Chat · ${solicitation.typeLabel}`} />
            <div className="space-y-4">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    <Link href={hubUrl} className={solicitationsBackLinkClass}>
                        ← Conversas como líder
                    </Link>
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                    <Link href={mineUrl} className={solicitationsBackLinkClass}>
                        Início
                    </Link>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {solicitation.subject?.trim() ?? solicitation.memberLabel ?? 'Membro'}
                </h1>
                {solicitation.subject?.trim() ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Membro: {solicitation.memberLabel ?? 'Membro'}</p>
                ) : null}

                <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                    <button type="button" className={tabBtn(tab === 'detalhes')} onClick={() => setTab('detalhes')}>
                        Pedido
                    </button>
                    <button type="button" className={tabBtn(tab === 'chat')} onClick={() => setTab('chat')}>
                        Chat
                    </button>
                </div>

                <SolicitationDetailPanel
                    solicitation={solicitation}
                    messages={messages}
                    messageStoreUrl={messageStoreUrl}
                    canChat={canChat}
                    canManage={false}
                    staffCanReply
                    variant="page"
                    section={tab === 'detalhes' ? 'details' : 'chat'}
                    composerRole="staff"
                    staffBubbleLabel="Eu (líder)"
                    memberBubbleLabel="Membro"
                    canFinalizeLeaderChat={canFinalizeLeaderChat}
                    finalizeLeaderChatUrl={finalizeLeaderChatUrl ?? null}
                    memberHideConversationUrl={memberHideConversationUrl ?? null}
                    leaderHideConversationUrl={leaderHideConversationUrl ?? null}
                />
            </div>
        </MobileLayout>
    );
}
