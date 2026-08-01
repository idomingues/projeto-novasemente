import {
    FormEvent,
    FormEventHandler,
    KeyboardEventHandler,
    useEffect,
    useRef,
} from 'react';
import InputError from '@/Components/InputError';

type Props = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: FormEventHandler;
    processing?: boolean;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    /** Mínimo de caracteres para habilitar o envio (padrão 1). */
    minLength?: number;
};

/** Ícone de enviar do WhatsApp (avião apontando à direita), centralizado no círculo. */
function WhatsAppSendIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
            <path d="M1.101 21.757 23.8 12.028 1.101 2.245l.011 7.112 9.718 2.67-9.718 2.67z" />
        </svg>
    );
}

/**
 * Barra de mensagem estilo WhatsApp: campo pill + botão circular de enviar.
 */
export default function NsWhatsChatComposer({
    value,
    onChange,
    onSubmit,
    processing = false,
    placeholder = 'Mensagem',
    error,
    disabled = false,
    minLength = 1,
}: Props) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const trimmed = value.trim();
    const canSend = trimmed.length >= minLength && !processing && !disabled;

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(Math.max(el.scrollHeight, 24), 120)}px`;
    }, [value]);

    const onKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) {
                onSubmit(e as unknown as FormEvent<HTMLFormElement>);
            }
        }
    };

    return (
        <div className="relative z-20 shrink-0 bg-[#efeae2] px-2.5 pb-2.5 pt-1.5 dark:bg-zinc-950">
            <form onSubmit={onSubmit} className="flex items-end gap-2.5">
                <div className="flex min-h-[48px] min-w-0 flex-1 items-center rounded-[24px] bg-white px-3.5 py-2.5 shadow-sm dark:bg-zinc-800">
                    <label className="sr-only" htmlFor="ns-whats-composer">
                        {placeholder}
                    </label>
                    <textarea
                        id="ns-whats-composer"
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="max-h-[120px] min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-[16px] leading-6 text-zinc-900 shadow-none outline-none ring-0 placeholder:text-zinc-400 focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="Enviar"
                    title="Enviar"
                    className={`inline-flex h-12 w-12 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-full transition active:scale-95 disabled:cursor-not-allowed ${
                        canSend
                            ? 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
                            : 'bg-black/40 text-white dark:bg-white/40 dark:text-zinc-900'
                    }`}
                >
                    <WhatsAppSendIcon className="h-6 w-6" />
                </button>
            </form>
            {error ? <InputError message={error} className="mt-1 px-1" /> : null}
        </div>
    );
}
