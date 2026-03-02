import { ReactNode } from 'react';

export default function PageHeader({ title, children }: { title: string, children?: ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {title}
            </h1>
            <div className="flex items-center gap-3">
                {children}
            </div>
        </div>
    );
}
