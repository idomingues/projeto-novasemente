import { ReactNode } from 'react';

/**
 * Cabeçalho padronizado de listas/admin: distância ao topo vem do layout (pt-6); aqui só margem inferior.
 * Linha 1 opcional: `lead` (ex.: « Voltar »). Linha 2: título + `actions` (ex.: Novo pedido). Depois subtítulo e conteúdo extra.
 */
export default function PageHeader({
    lead,
    title,
    subtitle,
    actions,
    children,
}: {
    lead?: ReactNode;
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <header className="mb-6 min-w-0 space-y-3">
            {lead ? <div className="min-w-0">{lead}</div> : null}
            <div className="flex min-w-0 items-center justify-between gap-3">
                <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                    {title}
                </h1>
                {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
            </div>
            {subtitle != null && subtitle !== '' ? (
                <div className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-700 dark:[&_strong]:text-zinc-300">
                    {subtitle}
                </div>
            ) : null}
            {children ? <div className="min-w-0 space-y-3 pt-0.5">{children}</div> : null}
        </header>
    );
}
