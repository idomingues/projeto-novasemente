import type { ReactNode } from 'react';

type MessageLike = {
    id: number;
    body: string;
    authorName?: string | null;
    createdAt?: string | null;
    editedAt?: string | null;
};

function formatBubbleTime(iso?: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

type BubbleProps = {
    message: MessageLike;
    mine: boolean;
    showAuthor?: boolean;
};

/** Bolha de mensagem no estilo WhatsApp. */
export function NsWhatsMessageBubble({ message, mine, showAuthor = true }: BubbleProps) {
    const time = formatBubbleTime(message.createdAt);
    const edited = Boolean(message.editedAt);

    return (
        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`relative max-w-[min(85%,26rem)] px-2.5 pb-1.5 pt-1.5 text-[14.5px] leading-[1.35] shadow-sm ${
                    mine
                        ? 'rounded-2xl rounded-tr-sm bg-[#d9fdd3] text-zinc-900 dark:bg-emerald-800 dark:text-emerald-50'
                        : 'rounded-2xl rounded-tl-sm bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                }`}
            >
                {!mine && showAuthor && message.authorName ? (
                    <div className="mb-0.5 text-[12.5px] font-semibold text-[#02a698] dark:text-teal-300">
                        {message.authorName}
                    </div>
                ) : null}
                <div className="whitespace-pre-wrap break-words">{message.body}</div>
                <div
                    className={`mt-0.5 flex items-center justify-end gap-1 text-[10.5px] tabular-nums leading-none ${
                        mine ? 'text-emerald-800/70 dark:text-emerald-200/80' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                >
                    {edited ? <span>editada</span> : null}
                    {time ? <span>{time}</span> : null}
                </div>
            </div>
        </div>
    );
}

export function NsWhatsSystemPill({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto max-w-[90%] rounded-lg bg-[#ffeecd] px-3 py-1.5 text-center text-[12px] text-zinc-700 shadow-sm dark:bg-amber-950/50 dark:text-amber-100">
            {children}
        </div>
    );
}
