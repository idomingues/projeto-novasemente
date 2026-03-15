import { ReactNode } from 'react';

/** Título e ações (ex.: botão +) sempre na mesma linha e altura, em todas as telas. */
export default function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
    return (
        <div className="flex flex-row items-center justify-between gap-3 mt-6 mb-8 flex-nowrap">
            <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                    {title}
                </h1>
                {subtitle && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{subtitle}</p>}
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
                {children}
            </div>
        </div>
    );
}
