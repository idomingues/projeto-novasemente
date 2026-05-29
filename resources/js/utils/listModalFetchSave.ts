import { router } from '@inertiajs/react';
import {
    applyVolunteerModalFormErrors,
    submitVolunteerModalPost,
    submitVolunteerModalPut,
    type VolunteerModalSaveResult,
} from '@/utils/volunteerPipelineModalSave';

export type ListModalSaveResult = VolunteerModalSaveResult;

export const applyListModalFormErrors = applyVolunteerModalFormErrors;
export const submitListModalPost = submitVolunteerModalPost;
export const submitListModalPut = submitVolunteerModalPut;

/** Atualiza só os props da lista sem visita de formulário — mantém o modal aberto. */
export function reloadListModalProps(only: string[]): Promise<void> {
    return new Promise((resolve) => {
        router.reload({
            only,
            onFinish: () => resolve(),
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
