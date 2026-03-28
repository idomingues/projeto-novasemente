import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
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
}

export default function Show({ solicitation, messages, canChat, messageStoreUrl, hubUrl, mineUrl }: Props) {
    const [tab, setTab] = useState<'detalhes' | 'chat'>('detalhes');

    const tabBtn = (active: boolean) =>
        `flex-1 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px text-center ${
            active
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`;

    return (
        <MobileLayout>
            <Head title={solicitation.typeLabel} />
            <div className="space-y-4">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    <Link href={hubUrl} className="text-brand-600 dark:text-brand-400 hover:underline">
                        ← Solicitações
                    </Link>
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                    <Link href={mineUrl} className="text-brand-600 dark:text-brand-400 hover:underline">
                        Os meus pedidos
                    </Link>
                </div>

                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{solicitation.typeLabel}</h1>

                <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                    <button type="button" className={tabBtn(tab === 'detalhes')} onClick={() => setTab('detalhes')}>
                        Detalhes
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
                    variant="page"
                    section={tab === 'detalhes' ? 'details' : 'chat'}
                    composerRole="member"
                />
            </div>
        </MobileLayout>
    );
}
