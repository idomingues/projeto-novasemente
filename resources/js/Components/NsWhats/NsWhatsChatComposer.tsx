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
}: Props) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const canSend = value.trim().length > 0 && !processing && !disabled;

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
        <div className="shrink-0 bg-[#efeae2] px-2 py-1.5 dark:bg-zinc-950">
            <form onSubmit={onSubmit} className="flex items-end gap-2">
                <div className="flex min-h-[44px] min-w-0 flex-1 items-center rounded-[22px] bg-white px-3.5 py-2 shadow-sm dark:bg-zinc-800">
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
                        className="max-h-[120px] min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-6 text-zinc-900 shadow-none outline-none ring-0 placeholder:text-zinc-400 focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="Enviar"
                    title="Enviar"
                    className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 disabled:cursor-not-allowed ${
                        canSend
                            ? 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
                            : 'bg-black/40 text-white dark:bg-white/40 dark:text-zinc-900'
                    }`}
                >
                    <WhatsAppSendIcon className="h-[22px] w-[22px]" />
                </button>
            </form>
            {error ? <InputError message={error} className="mt-1 px-1" /> : null}
        </div>
    );
}
