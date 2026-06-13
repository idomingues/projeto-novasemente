import type { VolunteerSignupFormSlice } from '@/utils/volunteerSignupPageValidation';

const DRAFT_PREFIX = 'volunteer-signup-draft:';
const DRAFT_VERSION = 1;
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Limite aproximado para foto em base64 no rascunho (evita estourar quota do localStorage). */
const DRAFT_MAX_PHOTO_PREVIEW_CHARS = 350_000;

type DraftFields = Omit<
    VolunteerSignupFormSlice,
    'photo_file' | 'password' | 'password_confirmation' | 'current_password'
>;

export type VolunteerSignupDraftEnvelope = {
    v: typeof DRAFT_VERSION;
    savedAt: string;
    page: number;
    fields: Partial<DraftFields>;
    photoPreview?: string | null;
};

export type VolunteerSignupDraftState = {
    fields: Partial<DraftFields> | null;
    page: number | null;
    photoPreview: string | null;
};

export function volunteerSignupDraftKey(token: string): string {
    return `${DRAFT_PREFIX}${token || 'public'}`;
}

function stripDraftFields(data: VolunteerSignupFormSlice): Partial<DraftFields> {
    const { photo_file: _photo, password: _p, password_confirmation: _pc, current_password: _cp, ...rest } = data;
    return rest;
}

export function canStoreVolunteerSignupPhotoPreview(preview: string | null | undefined): boolean {
    if (!preview || !preview.startsWith('data:image/')) {
        return false;
    }
    return preview.length <= DRAFT_MAX_PHOTO_PREVIEW_CHARS;
}

function isDraftExpired(savedAt: string | undefined): boolean {
    if (!savedAt) {
        return true;
    }
    const ts = Date.parse(savedAt);
    if (Number.isNaN(ts)) {
        return true;
    }
    return Date.now() - ts > DRAFT_MAX_AGE_MS;
}

function parseEnvelope(raw: string): VolunteerSignupDraftEnvelope | null {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        if ((parsed as VolunteerSignupDraftEnvelope).v === DRAFT_VERSION) {
            const env = parsed as VolunteerSignupDraftEnvelope;
            if (isDraftExpired(env.savedAt)) {
                return null;
            }
            const page = typeof env.page === 'number' ? env.page : 0;
            return {
                v: DRAFT_VERSION,
                savedAt: env.savedAt,
                page: page >= 0 && page <= 2 ? page : 0,
                fields: env.fields && typeof env.fields === 'object' ? env.fields : {},
                photoPreview:
                    typeof env.photoPreview === 'string' && canStoreVolunteerSignupPhotoPreview(env.photoPreview)
                        ? env.photoPreview
                        : null,
            };
        }
        const legacy = parsed as Partial<DraftFields>;
        return {
            v: DRAFT_VERSION,
            savedAt: new Date().toISOString(),
            page: 0,
            fields: legacy,
            photoPreview: null,
        };
    } catch {
        return null;
    }
}

function readEnvelope(token: string): VolunteerSignupDraftEnvelope | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const key = volunteerSignupDraftKey(token);

    try {
        const fromLocal = localStorage.getItem(key);
        if (fromLocal) {
            const env = parseEnvelope(fromLocal);
            if (env) {
                return env;
            }
            localStorage.removeItem(key);
        }
    } catch {
        // ignorar
    }

    try {
        const fromSession = sessionStorage.getItem(key);
        if (!fromSession) {
            return null;
        }
        const env = parseEnvelope(fromSession);
        sessionStorage.removeItem(key);
        if (env) {
            writeVolunteerSignupDraft(token, env.fields as VolunteerSignupFormSlice, {
                page: env.page,
                photoPreview: env.photoPreview,
            });
        }
        return env;
    } catch {
        return null;
    }
}

export function readVolunteerSignupDraft(token: string): Partial<DraftFields> | null {
    const env = readEnvelope(token);
    return env?.fields ?? null;
}

export function readVolunteerSignupDraftState(token: string): VolunteerSignupDraftState {
    const env = readEnvelope(token);
    if (!env) {
        return { fields: null, page: null, photoPreview: null };
    }
    return {
        fields: env.fields,
        page: env.page,
        photoPreview: env.photoPreview ?? null,
    };
}

export function volunteerSignupDraftHasAnswers(fields: Partial<DraftFields> | null | undefined): boolean {
    if (!fields) {
        return false;
    }
    if (fields.full_name?.trim() || fields.email?.trim() || fields.phone?.trim() || fields.birth_date?.trim()) {
        return true;
    }
    if (fields.attendance_duration) {
        return true;
    }
    const boolFields = [
        fields.has_whatsapp,
        fields.has_social_networks,
        fields.is_official_member,
        fields.comfortable_with_digital_tools,
        fields.lgpd_data_consent,
    ];
    if (boolFields.some((v) => v === true || v === false)) {
        return true;
    }
    if ((fields.service_ease_areas?.length ?? 0) > 0) {
        return true;
    }
    return Boolean(
        fields.social_network_profiles?.trim() ||
            fields.professional_area?.trim() ||
            fields.service_greatest_strength?.trim() ||
            fields.service_greatest_challenge?.trim() ||
            fields.volunteer_phase,
    );
}

export function writeVolunteerSignupDraft(
    token: string,
    data: VolunteerSignupFormSlice,
    options?: { page?: number; photoPreview?: string | null },
): void {
    if (typeof window === 'undefined') {
        return;
    }

    const key = volunteerSignupDraftKey(token);
    const existing = readEnvelope(token);

    let photoPreview = existing?.photoPreview ?? null;
    if (options && 'photoPreview' in options) {
        const candidate = options.photoPreview;
        photoPreview = candidate && canStoreVolunteerSignupPhotoPreview(candidate) ? candidate : null;
    }

    const page = options?.page ?? existing?.page ?? 0;

    const envelope: VolunteerSignupDraftEnvelope = {
        v: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        page: page >= 0 && page <= 2 ? page : 0,
        fields: stripDraftFields(data),
        ...(photoPreview ? { photoPreview } : {}),
    };

    try {
        localStorage.setItem(key, JSON.stringify(envelope));
    } catch {
        try {
            const withoutPhoto: VolunteerSignupDraftEnvelope = {
                ...envelope,
                photoPreview: undefined,
            };
            localStorage.setItem(key, JSON.stringify(withoutPhoto));
        } catch {
            // quota exceeded — ignorar
        }
    }
}

export function clearVolunteerSignupDraft(token: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    const key = volunteerSignupDraftKey(token);
    try {
        localStorage.removeItem(key);
    } catch {
        // ignorar
    }
    try {
        sessionStorage.removeItem(key);
    } catch {
        // ignorar
    }
}
