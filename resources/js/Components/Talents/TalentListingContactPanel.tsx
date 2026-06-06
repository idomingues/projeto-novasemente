import {
    ChatBubbleLeftRightIcon,
    EnvelopeIcon,
    PhoneIcon,
} from '@heroicons/react/24/outline';

export type TalentContactChannel = {
    key: string;
    label: string;
    value: string;
    href: string;
};

type Props = {
    channels: TalentContactChannel[];
    isExample?: boolean;
};

function channelIcon(key: string) {
    switch (key) {
        case 'whatsapp':
            return ChatBubbleLeftRightIcon;
        case 'email':
            return EnvelopeIcon;
        case 'instagram':
            return ({ className }: { className?: string }) => (
                <span className={`inline-flex items-center justify-center font-bold ${className ?? ''}`} aria-hidden>
                    @
                </span>
            );
        default:
            return PhoneIcon;
    }
}

export default function TalentListingContactPanel({ channels, isExample = false }: Props) {
    if (channels.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-sm dark:border-brand-900 dark:bg-brand-950/30">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-200">Contato</h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {isExample
                    ? 'Canais fictícios para mostrar como fica uma publicação real.'
                    : 'Fale direto com quem publicou o serviço.'}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {channels.map((channel) => {
                    const Icon = channelIcon(channel.key);
                    return (
                        <a
                            key={channel.key}
                            href={channel.href}
                            target={channel.key === 'email' || channel.key === 'phone' ? undefined : '_blank'}
                            rel={channel.key === 'email' || channel.key === 'phone' ? undefined : 'noopener noreferrer'}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/80 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/80 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-brand-700 dark:hover:bg-zinc-800"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                                <Icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">{channel.label}</span>
                                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{channel.value}</span>
                            </span>
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
