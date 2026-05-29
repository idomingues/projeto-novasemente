/**
 * Salva ações da ficha do voluntário (modal) sem visita Inertia — evita fechar o modal ou resetar a tela.
 */
export type VolunteerModalSaveResult =
    | { ok: true; redirectLocation?: string | null }
    | { ok: false; errors: Record<string, string | string[]>; message?: string };

function normalizeErrors(raw: Record<string, string | string[]> | undefined): Record<string, string | string[]> {
    return raw ?? {};
}

async function parseErrorBody(res: Response): Promise<VolunteerModalSaveResult> {
    try {
        const body = (await res.json()) as { message?: string; errors?: Record<string, string | string[]> };
        return {
            ok: false,
            errors: normalizeErrors(body.errors),
            message: body.message,
        };
    } catch {
        return { ok: false, errors: {}, message: 'Não foi possível salvar. Tente novamente.' };
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
        redirect: 'manual',
    });

    if (res.status === 422) {
        return parseErrorBody(res);
    }

    if (res.status === 302 || res.status === 303 || (res.status >= 200 && res.status < 300)) {
        return { ok: true, redirectLocation: res.headers.get('Location') };
    }

    return parseErrorBody(res);
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
        redirect: 'manual',
    });

    if (res.status === 422) {
        return parseErrorBody(res);
    }

    if (res.status === 302 || res.status === 303 || (res.status >= 200 && res.status < 300)) {
        return { ok: true, redirectLocation: res.headers.get('Location') };
    }

    return parseErrorBody(res);
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
        redirect: 'manual',
    });

    if (res.status === 422) {
        return parseErrorBody(res);
    }

    if (res.status === 302 || res.status === 303 || (res.status >= 200 && res.status < 300)) {
        return { ok: true, redirectLocation: res.headers.get('Location') };
    }

    return parseErrorBody(res);
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

export type VolunteerModalUrlTab = 'ficha' | 'notas' | 'departamentos' | 'historico';

const VALID_TABS = new Set<VolunteerModalUrlTab>(['ficha', 'notas', 'departamentos', 'historico']);

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
