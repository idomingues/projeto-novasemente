import { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{ className?: string }> & ComponentPropsWithoutRef<'div'>;

function classHasPadding(className: string): boolean {
    return /(?:^|\s)!?p(?:[xytblr]|ad)?(?:-\d|\[)/.test(className);
}

export default function Card({ children, className = '', ...rest }: CardProps) {
    const paddingClass = classHasPadding(className) ? '' : 'p-8';

    return (
        <div
            className={`rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${paddingClass} ${className}`.trim()}
            {...rest}
        >
            {children}
        </div>
    );
}
