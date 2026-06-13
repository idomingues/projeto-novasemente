import { ButtonHTMLAttributes, ReactNode } from 'react';

export const listCardIconActionClass =
    'inline-flex min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation items-center justify-center rounded-xl p-3 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40';

export const listCardIconActionDangerClass =
    'hover:text-red-600 dark:hover:text-red-400';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    icon: ReactNode;
    tone?: 'default' | 'danger';
};

export default function ListCardIconActionButton({
    label,
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
            aria-label={label}
            title={label}
            className={`${listCardIconActionClass} ${tone === 'danger' ? listCardIconActionDangerClass : ''} ${className}`.trim()}
        >
            {icon}
        </button>
    );
}
