import { PropsWithChildren } from 'react';

export default function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
    return (
        <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm ${className}`}>
            {children}
        </div>
    );
}
