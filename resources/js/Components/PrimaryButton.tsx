import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-white px-8 text-sm font-semibold uppercase tracking-widest text-white dark:text-black shadow-sm transition duration-150 ease-in-out hover:bg-zinc-700 dark:hover:bg-zinc-100 hover:shadow-md focus:bg-zinc-800 dark:focus:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 active:bg-zinc-900 dark:active:bg-zinc-300 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
