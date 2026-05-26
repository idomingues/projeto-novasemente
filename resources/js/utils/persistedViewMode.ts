export type ListKanbanViewMode = 'list' | 'kanban';

export function readPersistedViewMode(storageKey: string, fallback: ListKanbanViewMode = 'list'): ListKanbanViewMode {
    if (typeof window === 'undefined') {
        return fallback;
    }
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw === 'list' || raw === 'kanban') {
            return raw;
        }
    } catch {
        /* ignore quota / private mode */
    }

    return fallback;
}

export function writePersistedViewMode(storageKey: string, mode: ListKanbanViewMode): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(storageKey, mode);
    } catch {
        /* ignore */
    }
}
