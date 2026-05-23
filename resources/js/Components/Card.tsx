import { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{ className?: string }> & ComponentPropsWithoutRef<'div'>;

export default function Card({ children, className = '', ...rest }: CardProps) {
    return (
        <div
            className={`rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
}
