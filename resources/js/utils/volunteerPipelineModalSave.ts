/**
 * Salva ações da ficha do voluntário (modal) sem visita Inertia — evita fechar o modal ou resetar a tela.
 */
export type VolunteerLeaderNoteJson = {
    id: number;
    body: string;
    authorName: string;
    createdAt: string;
    destroyUrl?: string | null;
};

export type VolunteerModalSaveResult =
    | { ok: true; redirectLocation?: string | null; note?: VolunteerLeaderNoteJson }
    | { ok: false; errors: Record<string, string | string[]>; message?: string };

function normalizeErrors(raw: Record<string, string | string[]> | undefined): Record<string, string | string[]> {
    return raw ?? {};
}

function redirectLocationFromResponse(res: Response): string | null {
    if (res.redirected && res.url) {
        return res.url;
    }

    return res.headers.get('Location');
}

async function resolveFetchSaveResponse(
    res: Response,
    options?: { parseNote?: boolean },
): Promise<VolunteerModalSaveResult> {
    if (res.status === 422) {
        return parseErrorBody(res);
    }

    const contentType = res.headers.get('content-type') ?? '';

    if (contentType.includes('application/json') && (res.ok || res.status === 201)) {
        try {
            const body = (await res.json()) as {
                redirect?: string;
                message?: string;
                note?: VolunteerLeaderNoteJson;
            };

            if (body.redirect) {
                return {
                    ok: true,
                    redirectLocation: body.redirect,
                    ...(options?.parseNote && body.note ? { note: body.note } : {}),
                };
            }

            if (options?.parseNote && body.note) {
                return { ok: true, redirectLocation: null, note: body.note };
            }

            // Sucesso JSON sem redirect (ex.: incluir usuário no perfil).
            return {
                ok: true,
                redirectLocation: null,
                ...(options?.parseNote && body.note ? { note: body.note } : {}),
            };
        } catch {
            // Resposta JSON inválida — trata como erro abaixo.
        }
    }

    if (res.status === 0 && res.type === 'opaqueredirect') {
        return { ok: true, redirectLocation: null };
    }

    if (res.status === 0) {
        return {
            ok: false,
            errors: {},
            message:
                'Conexão interrompida ao enviar. Verifique se o servidor está em execução (npm run serve) e tente novamente.',
        };
    }

    if (res.ok || res.status === 302 || res.status === 303) {
        if (options?.parseNote && contentType.includes('application/json')) {
            const { note } = await parseSuccessBody(res);
            return { ok: true, redirectLocation: redirectLocationFromResponse(res), note };
        }

        return { ok: true, redirectLocation: redirectLocationFromResponse(res) };
    }

    return parseErrorBody(res);
}

async function parseErrorBody(res: Response): Promise<VolunteerModalSaveResult> {
    if (res.status === 419) {
        return {
            ok: false,
            errors: {},
            message: 'A sessão expirou. Atualize a página e tente novamente.',
        };
    }

    if (res.status === 403) {
        return {
            ok: false,
            errors: {},
            message: 'Você não tem permissão para salvar esta publicação.',
        };
    }

    if (res.status === 413) {
        return {
            ok: false,
            errors: {},
            message:
                'Arquivo grande demais para o servidor (413). PDF até 12 MB — use «npm run serve» localmente ou aumente upload_max_filesize/post_max_size no PHP.',
        };
    }

    if (res.status >= 500) {
        return {
            ok: false,
            errors: {},
            message:
                'Erro no servidor ao salvar. Se o resumo/apresentação estiver muito longo, use no máximo 500 caracteres.',
        };
    }

    try {
        const body = (await res.json()) as { message?: string; errors?: Record<string, string | string[]> };
        return {
            ok: false,
            errors: normalizeErrors(body.errors),
            message: body.message,
        };
    } catch {
        const text = await res.text().catch(() => '');
        if (text.includes('Page Expired')) {
            return {
                ok: false,
                errors: {},
                message: 'A sessão expirou. Atualize a página e tente novamente.',
            };
        }

        return {
            ok: false,
            errors: {},
            message: `Não foi possível salvar (HTTP ${res.status}). Atualize a página e tente novamente.`,
        };
    }
}

export async function submitVolunteerModalPatch(
    url: string,
    data: Record<string, unknown>,
    csrf: string,
): Promise<VolunteerModalSaveResult> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrf,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ ...data, _method: 'PATCH' }),
    });

    return resolveFetchSaveResponse(res);
}

export async function submitVolunteerModalPut(
    url: string,
    data: Record<string, unknown>,
    csrf: string,
): Promise<VolunteerModalSaveResult> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrf,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ ...data, _method: 'PUT' }),
    });

    return resolveFetchSaveResponse(res);
}

async function submitVolunteerModalFormData(
    url: string,
    formData: FormData,
    csrf: string,
    method?: 'PUT' | 'PATCH',
): Promise<VolunteerModalSaveResult> {
    if (method === 'PUT' || method === 'PATCH') {
        formData.append('_method', method);
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrf,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: formData,
    });

    return resolveFetchSaveResponse(res);
}

export async function submitVolunteerModalFormDataPut(
    url: string,
    formData: FormData,
    csrf: string,
): Promise<VolunteerModalSaveResult> {
    return submitVolunteerModalFormData(url, formData, csrf, 'PUT');
}

export async function submitVolunteerModalFormDataPost(
    url: string,
    formData: FormData,
    csrf: string,
): Promise<VolunteerModalSaveResult> {
    return submitVolunteerModalFormData(url, formData, csrf);
}

export async function submitVolunteerModalFormDataPatch(
    url: string,
    formData: FormData,
    csrf: string,
): Promise<VolunteerModalSaveResult> {
    return submitVolunteerModalFormData(url, formData, csrf, 'PATCH');
}

async function parseSuccessBody(res: Response): Promise<{ note?: VolunteerLeaderNoteJson }> {
    try {
        const body = (await res.json()) as { note?: VolunteerLeaderNoteJson };
        return body?.note ? { note: body.note } : {};
    } catch {
        return {};
    }
}

export async function submitVolunteerModalPost(
    url: string,
    data: Record<string, unknown>,
    csrf: string,
): Promise<VolunteerModalSaveResult> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrf,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify(data),
    });

    return resolveFetchSaveResponse(res, { parseNote: true });
}

export async function submitVolunteerModalDelete(
    url: string,
    csrf: string,
): Promise<VolunteerModalSaveResult> {
    const res = await fetch(url, {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrf,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    });

    return resolveFetchSaveResponse(res);
}

export function parseDepartmentEditModalFromUrl(search: string): { id: number } | null {
    const params = new URLSearchParams(search);
    if (params.get('modal') !== 'edit') {
        return null;
    }
    const id = Number(params.get('id'));
    if (Number.isNaN(id) || id <= 0) {
        return null;
    }
    return { id };
}

export function departmentIdFromRedirectLocation(location: string | null): number | null {
    if (!location) {
        return null;
    }
    try {
        const url = location.startsWith('http') ? new URL(location) : new URL(location, window.location.origin);
        return parseDepartmentEditModalFromUrl(url.search)?.id ?? null;
    } catch {
        return null;
    }
}

export function syncDepartmentEditModalUrl(id: number | null): void {
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
}

export type VolunteerModalUrlTab = 'ficha' | 'usuario' | 'notas' | 'departamentos' | 'historico';

const VALID_TABS = new Set<VolunteerModalUrlTab>([
    'ficha',
    'usuario',
    'notas',
    'departamentos',
    'historico',
]);

export function parseVolunteerModalFromUrl(search: string): { id: number; tab: VolunteerModalUrlTab } | null {
    const params = new URLSearchParams(search);
    if (params.get('modal') !== 'volunteer') {
        return null;
    }
    const id = Number(params.get('id'));
    if (Number.isNaN(id) || id <= 0) {
        return null;
    }
    const rawTab = params.get('tab');
    const tab =
        rawTab && VALID_TABS.has(rawTab as VolunteerModalUrlTab) ? (rawTab as VolunteerModalUrlTab) : 'ficha';
    return { id, tab };
}

export function syncVolunteerModalUrl(id: number | null, tab: VolunteerModalUrlTab | null): void {
    if (typeof window === 'undefined') {
        return;
    }
    const params = new URLSearchParams(window.location.search);
    if (id != null && id > 0) {
        params.set('modal', 'volunteer');
        params.set('id', String(id));
        if (tab) {
            params.set('tab', tab);
        }
    } else {
        params.delete('modal');
        params.delete('id');
        params.delete('tab');
    }
    const q = params.toString();
    const next = `${window.location.pathname}${q ? `?${q}` : ''}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) {
        window.history.replaceState({}, '', next);
    }
}

export function applyVolunteerModalFormErrors(
    errors: Record<string, string | string[]>,
    setError: (field: string, message: string) => void,
): void {
    for (const [field, message] of Object.entries(errors)) {
        const text = Array.isArray(message) ? message[0] : message;
        if (text) {
            setError(field, text);
        }
    }
}
