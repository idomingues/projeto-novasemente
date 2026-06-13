import { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    icon?: ReactNode;
    tone?: 'default' | 'danger';
};

export default function ListCardTextActionButton({
    children,
    icon,
    tone = 'default',
    className = '',
    type = 'button',
    disabled,
    ...props
}: Props) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled}
            className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium normal-case tracking-normal shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40 dark:focus:ring-offset-zinc-900 ${
                tone === 'danger'
                    ? 'border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-900/20'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700'
            } ${disabled ? 'opacity-40' : ''} ${className}`.trim()}
        >
            {icon}
            {children}
        </button>
    );
}
