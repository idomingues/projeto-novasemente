import { useCallback, useState } from 'react';
import {
    readPersistedViewMode,
    writePersistedViewMode,
    type ListKanbanViewMode,
} from '@/utils/persistedViewMode';

export function usePersistedViewMode(storageKey: string, fallback: ListKanbanViewMode = 'list') {
    const [viewMode, setViewModeState] = useState<ListKanbanViewMode>(() =>
        readPersistedViewMode(storageKey, fallback),
    );

    const setViewMode = useCallback(
        (mode: ListKanbanViewMode) => {
            writePersistedViewMode(storageKey, mode);
            setViewModeState(mode);
        },
        [storageKey],
    );

    return [viewMode, setViewMode] as const;
}
