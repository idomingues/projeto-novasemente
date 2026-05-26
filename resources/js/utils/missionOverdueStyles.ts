/** Classes para destacar cadastros com SLA vencido (kanban e lista). */
export function missionOverdueCardClass(isOverdue: boolean): string {
    if (!isOverdue) {
        return 'border-zinc-200/90 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600';
    }

    return 'border-red-300 bg-red-50 ring-1 ring-red-200/70 hover:border-red-400 dark:border-red-800 dark:bg-red-950/45 dark:ring-red-900/50 dark:hover:border-red-700';
}

export function missionOverdueRowClass(isOverdue: boolean): string {
    if (!isOverdue) {
        return 'border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50';
    }

    return 'border-b border-red-200/80 bg-red-50/90 hover:bg-red-100/90 dark:border-red-900/50 dark:bg-red-950/35 dark:hover:bg-red-950/50';
}
