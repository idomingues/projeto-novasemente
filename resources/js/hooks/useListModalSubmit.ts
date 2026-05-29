import {
    applyListModalFormErrors,
    editIdFromListModalRedirect,
    reloadListModalProps,
    submitListModalPost,
    submitListModalPut,
} from '@/utils/listModalFetchSave';
import { usePage } from '@inertiajs/react';
import { useCallback, useState } from 'react';

type Options = {
    /** Props Inertia a recarregar após salvar (ex.: `['rooms', 'byFloor']`). */
    reloadOnly: string[];
    setError: (field: string, message: string) => void;
    clearErrors: () => void;
};

export type ListModalSaveOutcome =
    | { ok: true; createdId: number | null }
    | { ok: false };

/**
 * Salva formulário de modal sobre lista via fetch (sem visita Inertia do POST/PUT).
 * Evita fechar o modal quando o backend redireciona de volta ao índice.
 */
export function useListModalSubmit({ reloadOnly, setError, clearErrors }: Options) {
    const csrf = (usePage().props as { csrf_token?: string }).csrf_token ?? '';
    const [saving, setSaving] = useState(false);

    const save = useCallback(
        async (
            isEditing: boolean,
            editingId: number | null,
            payload: Record<string, unknown>,
            storeUrl: string,
            updateUrl: (id: number) => string,
        ): Promise<ListModalSaveOutcome> => {
            if (saving) {
                return { ok: false };
            }
            clearErrors();
            setSaving(true);
            try {
                const result =
                    isEditing && editingId != null
                        ? await submitListModalPut(updateUrl(editingId), payload, csrf)
                        : await submitListModalPost(storeUrl, payload, csrf);

                if (!result.ok) {
                    applyListModalFormErrors(result.errors, setError);
                    return { ok: false };
                }

                await reloadListModalProps(reloadOnly);
                const createdId = isEditing ? null : editIdFromListModalRedirect(result.redirectLocation ?? null);
                return { ok: true, createdId };
            } finally {
                setSaving(false);
            }
        },
        [clearErrors, csrf, reloadOnly, saving, setError],
    );

    return { saving, save };
}
