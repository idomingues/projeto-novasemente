import { clearStuckUiOverlays } from '@/utils/clearStuckUiOverlays';

/** Incrementar após correções de overlay/modal para forçar 1 reload em sessões com JS antigo. */
export const APP_UI_VERSION = '386';

const STORAGE_KEY = 'ns-app-ui-version';

/**
 * Limpa overlays presos e, se o bundle mudou desde a última visita, recarrega uma vez.
 */
export function bootstrapAppUiVersion(): void {
    if (typeof window === 'undefined') {
        return;
    }

    clearStuckUiOverlays();

    const previous = window.localStorage.getItem(STORAGE_KEY);
    if (previous !== null && previous !== APP_UI_VERSION) {
        window.localStorage.setItem(STORAGE_KEY, APP_UI_VERSION);
        window.location.reload();
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, APP_UI_VERSION);
}
