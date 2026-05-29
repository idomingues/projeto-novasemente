import { useCallback, useEffect, useRef } from 'react';

export function useListModalEditUrl() {
    const syncListModalEditUrl = useCallback((id: number | null) => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (id != null && id > 0) {
            params.set('modal', 'edit');
            params.set('id', String(id));
        } else {
            params.delete('modal');
            params.delete('id');
        }
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next !== current) {
            window.history.replaceState({}, '', next);
        }
    }, []);

    return { syncListModalEditUrl };
}

/** Abre modal de edição quando a URL tem `?modal=edit&id=`. */
export function useListModalFromUrl<T extends { id: number }>(
    items: T[],
    isModalOpen: boolean,
    editingId: number | null,
    openEdit: (item: T) => void,
) {
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get('modal') !== 'edit') {
            return;
        }
        const id = Number(params.get('id'));
        if (Number.isNaN(id) || id <= 0) {
            return;
        }
        const item = items.find((i) => i.id === id);
        if (!item) {
            return;
        }
        if (!isModalOpen || editingId !== id) {
            openEdit(item);
        }
    }, [items, isModalOpen, editingId, openEdit]);
}

/** Sincroniza formulário com item recém-criado após `reloadListModalProps`. */
export function useSyncFormAfterListReload<T extends { id: number }>(
    items: T[],
    editingId: number | null,
    isModalOpen: boolean,
    applyItem: (item: T) => void,
) {
    const syncFormAfterReloadRef = useRef(false);

    const markSyncAfterReload = useCallback(() => {
        syncFormAfterReloadRef.current = true;
    }, []);

    useEffect(() => {
        if (!syncFormAfterReloadRef.current || editingId == null || !isModalOpen) {
            return;
        }
        const item = items.find((i) => i.id === editingId);
        if (!item) {
            return;
        }
        applyItem(item);
        syncFormAfterReloadRef.current = false;
    }, [items, editingId, isModalOpen, applyItem]);

    return { markSyncAfterReload };
}

export function useListModalSaveMessage() {
    const showSaveMessage = useCallback((setMessage: (v: string | null) => void, message: string) => {
        setMessage(message);
        window.setTimeout(() => setMessage(null), 5000);
    }, []);

    return showSaveMessage;
}
