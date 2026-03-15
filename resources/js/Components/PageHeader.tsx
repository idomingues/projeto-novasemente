import { ReactNode } from 'react';

export default function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
                {children}
            </div>
        </div>
    );
}
