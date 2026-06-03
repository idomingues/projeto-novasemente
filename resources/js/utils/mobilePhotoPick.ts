/** MIME e extensões para galeria no celular (inclui HEIC/HEIF do iOS). Sem `capture` no input. */
export const GALLERY_IMAGE_ACCEPT =
    'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

/** Celular / app nativo (Capacitor): abrir câmera costuma recarregar o WebView. */
export function prefersGalleryPhotoPicker(): boolean {
    if (typeof window === 'undefined') {
        return true;
    }
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia('(max-width: 768px)').matches;
    const cap = typeof (window as Window & { Capacitor?: unknown }).Capacitor !== 'undefined';

    return cap || coarse || narrow;
}

const PHOTO_PICK_SESSION_KEY = 'ns-photo-pick-pending';

export function markPhotoPickStarted(): void {
    try {
        sessionStorage.setItem(PHOTO_PICK_SESSION_KEY, String(Date.now()));
    } catch {
        /* quota / modo privado */
    }
}

/** @deprecated Use markPhotoPickStarted */
export const markVolunteerPhotoPickStarted = markPhotoPickStarted;

export function clearPhotoPickPending(): void {
    try {
        sessionStorage.removeItem(PHOTO_PICK_SESSION_KEY);
    } catch {
        /* ignore */
    }
}

/** @deprecated Use clearPhotoPickPending */
export const clearVolunteerPhotoPickPending = clearPhotoPickPending;

/** True se a página provavelmente recarregou ao voltar da câmera sem foto aplicada. */
export function shouldWarnPhotoPickReload(hasPhotoInForm: boolean): boolean {
    if (hasPhotoInForm) {
        clearPhotoPickPending();
        return false;
    }
    try {
        const raw = sessionStorage.getItem(PHOTO_PICK_SESSION_KEY);
        if (!raw) {
            return false;
        }
        const ts = Number(raw);
        if (Number.isNaN(ts) || Date.now() - ts > 15 * 60 * 1000) {
            clearPhotoPickPending();
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

/** @deprecated Use shouldWarnPhotoPickReload */
export const shouldWarnVolunteerPhotoPickReload = shouldWarnPhotoPickReload;

export function revokeBlobPreviewUrl(ref: { current: string | null }): void {
    if (ref.current?.startsWith('blob:')) {
        URL.revokeObjectURL(ref.current);
    }
    ref.current = null;
}
