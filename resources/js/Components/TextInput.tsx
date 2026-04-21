import { forwardRef, InputHTMLAttributes, useEffect, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref
) {
    const localRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                // `text-base` em viewports estreitas evita zoom automático do Safari ao focar (inputs <16px),
                // que “empurra” o layout em modais e formulários longos.
                'h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-base text-zinc-900 dark:text-zinc-100 sm:text-sm shadow-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20 ' +
                className
            }
            ref={localRef}
        />
    );
});
