import { Link, usePage } from '@inertiajs/react';
import { ClockIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export interface PastoralAgendaModuleShellProps {
    /** Ligação «atrás» (ex.: lista de pastores); se null, usa o painel. */
    pastoralModuleNavUrl: string | null;
    eyebrow?: string;
    title: string;
    description?: string;
    /** Ação flutuante no canto inferior direito do cartão escuro (ex.: FAB +). */
    headerFab?: ReactNode;
    children: ReactNode;
}

/**
 * Envolvimento visual comum ao módulo «Agenda pastoral» (disponibilidade semanal para agendamentos na app).
 */
export default function PastoralAgendaModuleShell({
    pastoralModuleNavUrl,
    eyebrow = 'Agenda pastoral',
    title,
    description,
    headerFab,
    children,
}: PastoralAgendaModuleShellProps) {
    const canAccessAdminMenu =
        (usePage().props as { auth?: { canAccessAdminMenu?: boolean } }).auth?.canAccessAdminMenu === true;
    const panelFallback = canAccessAdminMenu ? route('dashboard') : route('mobile.home');
    const backHref = pastoralModuleNavUrl ?? panelFallback;
    const backLabel = pastoralModuleNavUrl ? '← Pastores' : canAccessAdminMenu ? '← Painel' : '← Início';

    return (
        <div className="min-w-0 space-y-8 pb-4">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 px-4 pb-14 pt-6 text-white shadow-lg sm:px-8 sm:pb-20 sm:pt-10 dark:border-zinc-700 dark:from-zinc-950 dark:via-zinc-900 dark:to-black md:px-5">
                <div
                    className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl sm:h-64 sm:w-64"
                    aria-hidden
                />
                <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-primary-500/15 blur-3xl" aria-hidden />
                <Link
                    href={backHref}
                    className="relative text-sm font-medium text-zinc-300 transition-colors hover:text-white"
                >
                    {backLabel}
                </Link>
                <div className="relative mt-4 flex flex-wrap items-end gap-3 sm:mt-5 sm:gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
                        <ClockIcon className="h-7 w-7 text-emerald-300 sm:h-8 sm:w-8" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/90">{eyebrow}</p>
                        <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">{title}</h1>
                        {description ? (
                            <p className="mt-2 max-w-5xl text-xs leading-relaxed text-zinc-300 sm:text-sm lg:text-base">{description}</p>
                        ) : null}
                    </div>
                </div>
                {headerFab ? (
                    <div className="pointer-events-auto absolute bottom-4 right-4 z-10 sm:bottom-7 sm:right-8">{headerFab}</div>
                ) : null}
            </div>
            {children}
        </div>
    );
}
