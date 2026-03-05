import { forwardRef, TextareaHTMLAttributes } from 'react';

export default forwardRef(function Textarea(
    { className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>,
    ref: React.Ref<HTMLTextAreaElement>
) {
    return (
        <textarea
            {...props}
            ref={ref}
            className={
                'w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-sm shadow-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20 ' +
                className
            }
        />
    );
});
