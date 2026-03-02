import { forwardRef, SelectHTMLAttributes, useEffect, useRef } from 'react';

export default forwardRef(function SelectInput(
    { className = '', isFocused = false, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { isFocused?: boolean },
    ref
) {
    const localRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <div className="relative">
            <select
                {...props}
                className={
                    'h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-zinc-900 dark:text-zinc-100 text-sm shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20 ' +
                    className
                }
                ref={localRef}
            >
                {children}
            </select>
        </div>
    );
});
