import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

/** Base compartilhada: mesmo tamanho/layout dos pills Encaminhar / Salvar / Enviar */
export const volunteerModalActionPillBaseClass =
    'inline-flex h-9 min-w-[9.5rem] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60';

const inviteClass = `${volunteerModalActionPillBaseClass} border-emerald-600/80 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/70 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50`;

export default function VolunteerAppInviteButton({
    onClick,
    disabled = false,
    className = '',
    label = 'Enviar',
}: {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    /** Texto do botão (lista/modal). Padrão: Enviar */
    label?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${inviteClass} ${className}`.trim()}
            title="Gera o link e abre a tela para copiar ou enviar pelo WhatsApp"
        >
            <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
        </button>
    );
}

export const volunteerEncaminharButtonClass = `${volunteerModalActionPillBaseClass} border-brand-600/80 bg-brand-50 text-brand-900 hover:bg-brand-100 dark:border-brand-500/70 dark:bg-brand-950/40 dark:text-brand-100 dark:hover:bg-brand-900/50`;

/** Mesmo tamanho/layout do Encaminhar — ação de salvar fase na ficha */
export const volunteerSalvarFaseButtonClass = `${volunteerModalActionPillBaseClass} border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white`;
