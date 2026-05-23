import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const baseClass =
    'inline-flex min-w-[8.5rem] items-center justify-center gap-2 rounded-full border border-emerald-600/80 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/70 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50';

export default function VolunteerAppInviteButton({
    onClick,
    disabled = false,
    className = '',
}: {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${baseClass} ${className}`.trim()}
            title="Gera o link e abre a tela para copiar ou enviar pelo WhatsApp"
        >
            <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0" aria-hidden />
            Convidar
        </button>
    );
}

export const volunteerEncaminharButtonClass =
    'inline-flex min-w-[8.5rem] items-center justify-center gap-2 rounded-full border border-brand-600/80 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-900 shadow-sm transition hover:bg-brand-100 disabled:opacity-60 dark:border-brand-500/70 dark:bg-brand-950/40 dark:text-brand-100 dark:hover:bg-brand-900/50';
