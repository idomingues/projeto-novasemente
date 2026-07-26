import { router } from '@inertiajs/react';
import {
    applyVolunteerModalFormErrors,
    submitVolunteerModalDelete,
    submitVolunteerModalPatch,
    submitVolunteerModalPost,
    submitVolunteerModalPut,
    type VolunteerModalSaveResult,
} from '@/utils/volunteerPipelineModalSave';

export type ListModalSaveResult = VolunteerModalSaveResult;

export const applyListModalFormErrors = applyVolunteerModalFormErrors;
export const submitListModalPost = submitVolunteerModalPost;
export const submitListModalPut = submitVolunteerModalPut;
export const submitListModalPatch = submitVolunteerModalPatch;
export const submitListModalDelete = submitVolunteerModalDelete;

/** Atualiza só os props da lista sem visita de formulário — mantém o modal aberto. */
export function reloadListModalProps(only: string[], timeoutMs = 12000): Promise<void> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) {
                return;
            }
            settled = true;
            resolve();
        };
        const timer = window.setTimeout(finish, timeoutMs);
        router.reload({
            only,
            onFinish: () => {
                window.clearTimeout(timer);
                finish();
            },
            onCancel: () => {
                window.clearTimeout(timer);
                finish();
            },
        });
    });
}

/** Lê `?modal=edit&id=` do Location após criar registro (redirect do backend). */
export function editIdFromListModalRedirect(location: string | null): number | null {
    if (!location) {
        return null;
    }
    try {
        const url = location.startsWith('http') ? new URL(location) : new URL(location, window.location.origin);
        if (url.searchParams.get('modal') !== 'edit') {
            return null;
        }
        const id = Number(url.searchParams.get('id'));
        return Number.isNaN(id) || id <= 0 ? null : id;
    } catch {
        return null;
    }
}
