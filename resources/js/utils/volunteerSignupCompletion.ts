import type { VolunteerSignupInitial } from '@/Pages/Volunteers/PublicSignup';
import { normalizeVolunteerFullName } from '@/utils/volunteerSignupPageValidation';

export type VolunteerSignupCompletion = {
    is_complete: boolean;
    missing_count: number;
    total_required: number;
    percent: number;
    missing_fields: string[];
};

const MIN_VOLUNTEER_AGE = 10;

/** Campos que não entram no alerta de cadastro incompleto (espelha backend). */
export const VOLUNTEER_SIGNUP_OPTIONAL_FIELD_KEYS = [
    'phone',
    'gifts_to_develop',
    'professional_area',
    'password',
    'password_confirmation',
    'current_password',
] as const;

export function hasMinistrySelection(ids: unknown, storedText?: string | null): boolean {
    if (hasPositiveIds(ids)) return true;
    const text = (storedText ?? '').trim();
    return text !== '' && text.toLowerCase() !== 'não';
}

export type VolunteerSignupLegacyMinistryTexts = {
    ministry_involvement?: string;
    previous_ministry_details?: string;
    other_ministry_interest?: string;
};

/** Ordem estável para rolar/destacar o primeiro erro (todas as etapas). */
export const VOLUNTEER_SIGNUP_FIELD_ORDER = [
    'photo_file',
    'full_name',
    'birth_date',
    'phone',
    'has_whatsapp',
    'email',
    'current_password',
    'password',
    'password_confirmation',
    'has_social_networks',
    'attendance_duration',
    'is_official_member',
    'member_record_at_nova_semente',
    'member_record_church',
    'has_previous_ministry_volunteer_experience',
    'previous_ministry_ids',
    'is_active_in_ministry',
    'active_ministry_ids',
    'wants_other_ministry',
    'other_ministry_ids',
    'lgpd_data_consent',
] as const;

const MISSING_FIELD_MESSAGES: Record<string, string> = {
    photo_file: 'Tire ou envie uma foto antes de concluir.',
    full_name: 'Informe o nome completo (nome e sobrenome).',
    birth_date: 'Informe uma data de nascimento válida (mínimo 10 anos).',
    has_whatsapp: 'Informe se este número tem WhatsApp.',
    email: 'Informe um e-mail válido.',
    has_social_networks: 'Informe se você usa redes sociais.',
    attendance_duration: 'Selecione há quanto tempo frequenta a igreja.',
    is_official_member: 'Informe se você é membro oficial da igreja.',
    member_record_at_nova_semente: 'Informe se seu registro de membro está na Nova Semente.',
    member_record_church: 'Informe em qual igreja está o seu registro de membro.',
    has_previous_ministry_volunteer_experience: 'Informe se você já foi voluntário em algum ministério.',
    previous_ministry_ids: 'Selecione em quais ministérios você já serviu.',
    is_active_in_ministry: 'Informe se você é atuante em algum ministério.',
    active_ministry_ids: 'Selecione pelo menos um ministério em que é atuante.',
    wants_other_ministry: 'Informe se gostaria de servir em outro ministério.',
    other_ministry_ids: 'Selecione pelo menos um ministério de interesse.',
    lgpd_data_consent: 'Para continuar, autorize o uso dos dados (LGPD).',
};

export function firstVolunteerSignupErrorKey(errors: Record<string, string>): string | undefined {
    for (const key of VOLUNTEER_SIGNUP_FIELD_ORDER) {
        if (errors[key]) return key;
    }
    return Object.keys(errors)[0];
}

export function volunteerSignupErrorsForMissingFields(missingFields: string[]): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const field of missingFields) {
        errors[field] = MISSING_FIELD_MESSAGES[field] ?? 'Responda esta pergunta para continuar.';
    }
    return errors;
}

/** Remove campos de ramificações inativas (mesma regra do envio). */
export function applyVolunteerSignupBranchingCleanup(payload: Record<string, unknown>): Record<string, unknown> {
    const out = { ...payload };

    if (normalizeBool(out.is_official_member as BoolLike) !== true) {
        delete out.member_record_at_nova_semente;
        delete out.member_record_church;
    } else if (normalizeBool(out.member_record_at_nova_semente as BoolLike) !== false) {
        delete out.member_record_church;
    }

    if (normalizeBool(out.has_previous_ministry_volunteer_experience as BoolLike) !== true) {
        out.previous_ministry_ids = [];
    }

    if (normalizeBool(out.is_active_in_ministry as BoolLike) !== true) {
        out.active_ministry_ids = [];
    }

    if (normalizeBool(out.wants_other_ministry as BoolLike) !== true) {
        out.other_ministry_ids = [];
    }

    return out;
}

/** Monta o snapshot usado pelo cálculo de pendências a partir do payload enviado. */
export function buildVolunteerSignupCompletionInput(
    payload: Record<string, unknown>,
    options: { hasExistingPhoto: boolean; legacy?: VolunteerSignupLegacyMinistryTexts },
): VolunteerSignupInitial & VolunteerSignupLegacyMinistryTexts {
    const legacy = options.legacy ?? {};

    return {
        has_existing_photo: options.hasExistingPhoto,
        full_name: `${String(payload.first_name ?? '').trim()} ${String(payload.last_name ?? '').trim()}`.trim(),
        first_name: String(payload.first_name ?? ''),
        last_name: String(payload.last_name ?? ''),
        birth_date: String(payload.birth_date ?? ''),
        has_whatsapp: (payload.has_whatsapp as boolean | null | undefined) ?? null,
        email: String(payload.email ?? ''),
        phone: String(payload.phone ?? ''),
        has_social_networks: (payload.has_social_networks as boolean | null | undefined) ?? null,
        attendance_duration: (payload.attendance_duration as VolunteerSignupInitial['attendance_duration']) ?? '',
        is_official_member: normalizeBool(payload.is_official_member as BoolLike),
        member_record_at_nova_semente: normalizeBool(payload.member_record_at_nova_semente as BoolLike),
        member_record_church: String(payload.member_record_church ?? ''),
        has_previous_ministry_volunteer_experience: normalizeBool(
            payload.has_previous_ministry_volunteer_experience as BoolLike,
        ),
        previous_ministry_ids: Array.isArray(payload.previous_ministry_ids)
            ? (payload.previous_ministry_ids as number[])
            : [],
        is_active_in_ministry: normalizeBool(payload.is_active_in_ministry as BoolLike),
        active_ministry_ids: Array.isArray(payload.active_ministry_ids) ? (payload.active_ministry_ids as number[]) : [],
        wants_other_ministry: normalizeBool(payload.wants_other_ministry as BoolLike),
        other_ministry_ids: Array.isArray(payload.other_ministry_ids) ? (payload.other_ministry_ids as number[]) : [],
        gifts_to_develop: String(payload.gifts_to_develop ?? ''),
        professional_area: String(payload.professional_area ?? ''),
        lgpd_data_consent: normalizeBool(payload.lgpd_data_consent as BoolLike),
        ministry_involvement: legacy.ministry_involvement,
        previous_ministry_details: legacy.previous_ministry_details,
        other_ministry_interest: legacy.other_ministry_interest,
    };
}

type BoolLike = boolean | null | string | number | undefined;

function normalizeBool(value: BoolLike): boolean | null {
    if (value === true || value === 1 || value === '1' || value === 'true') return true;
    if (value === false || value === 0 || value === '0' || value === 'false') return false;
    return null;
}

function isBoolSet(value: BoolLike): boolean {
    return normalizeBool(value) !== null;
}

function maxBirthDateForMinAge(minYears: number): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - minYears);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function isBirthDateAtLeastMinAge(birthDate: string, minYears: number): boolean {
    if (!birthDate.trim()) return false;
    return birthDate <= maxBirthDateForMinAge(minYears);
}

function hasPositiveIds(ids: unknown): boolean {
    if (!Array.isArray(ids)) return false;
    return ids.some((id) => Number(id) > 0);
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function splitFullName(fullName: string): { first_name: string; last_name: string } | null {
    const normalized = normalizeVolunteerFullName(fullName);
    if (!normalized) return null;
    const parts = normalized.split(' ').filter(Boolean);
    if (parts.length < 2) return null;
    const last_name = parts.slice(1).join(' ');
    if (!parts[0] || !last_name) return null;
    return { first_name: parts[0], last_name };
}

/** Espelha `App\Support\VolunteerSignupCompletion` para uso no frontend. */
export function computeVolunteerSignupCompletion(initial: VolunteerSignupInitial): VolunteerSignupCompletion {
    const applicable: string[] = [];
    const missing: string[] = [];

    const track = (field: string, isApplicable: boolean, isFilled: boolean) => {
        if (!isApplicable) return;
        applicable.push(field);
        if (!isFilled) missing.push(field);
    };

    const hasExistingPhoto = initial.has_existing_photo === true;
    track('photo_file', true, hasExistingPhoto);

    track('full_name', true, splitFullName(initial.full_name) !== null);

    track('birth_date', true, isBirthDateAtLeastMinAge(initial.birth_date, MIN_VOLUNTEER_AGE));

    const phoneFilled = initial.phone.trim() !== '';
    track('has_whatsapp', phoneFilled, phoneFilled ? isBoolSet(initial.has_whatsapp) : true);

    track('email', true, initial.email.trim() !== '' && isValidEmail(initial.email));

    track('has_social_networks', true, isBoolSet(initial.has_social_networks));

    track('attendance_duration', true, initial.attendance_duration.trim() !== '');

    const isOfficialMember = normalizeBool(initial.is_official_member);
    track('is_official_member', true, isOfficialMember !== null);

    if (isOfficialMember === true) {
        const memberAtNovaSemente = normalizeBool(initial.member_record_at_nova_semente);
        track('member_record_at_nova_semente', true, memberAtNovaSemente !== null);

        if (memberAtNovaSemente === false) {
            track('member_record_church', true, initial.member_record_church.trim() !== '');
        }
    }

    const hasPrevious = normalizeBool(initial.has_previous_ministry_volunteer_experience);
    track('has_previous_ministry_volunteer_experience', true, hasPrevious !== null);

    const previousDetails = (initial as VolunteerSignupInitial & { previous_ministry_details?: string })
        .previous_ministry_details;
    if (hasPrevious === true) {
        track('previous_ministry_ids', true, hasMinistrySelection(initial.previous_ministry_ids, previousDetails));
    }

    const isActive = normalizeBool(initial.is_active_in_ministry);
    track('is_active_in_ministry', true, isActive !== null);

    const ministryInvolvement = (initial as VolunteerSignupInitial & { ministry_involvement?: string }).ministry_involvement;
    if (isActive === true) {
        track('active_ministry_ids', true, hasMinistrySelection(initial.active_ministry_ids, ministryInvolvement));
    }

    const wantsOther = normalizeBool(initial.wants_other_ministry);
    track('wants_other_ministry', true, wantsOther !== null);

    const otherInterest = (initial as VolunteerSignupInitial & { other_ministry_interest?: string }).other_ministry_interest;
    if (wantsOther === true) {
        track('other_ministry_ids', true, hasMinistrySelection(initial.other_ministry_ids, otherInterest));
    }

    track('lgpd_data_consent', true, normalizeBool(initial.lgpd_data_consent) === true);

    const totalRequired = applicable.length;
    const missingCount = missing.length;
    const percent = totalRequired > 0 ? Math.round(((totalRequired - missingCount) / totalRequired) * 100) : 100;

    return {
        is_complete: missingCount === 0,
        missing_count: missingCount,
        total_required: totalRequired,
        percent: Math.min(100, Math.max(0, percent)),
        missing_fields: missing,
    };
}

export function resolveVolunteerSignupFieldPage(field: string): number {
    const base = field.split('.')[0];
    const page0 = new Set([
        'photo_file',
        'first_name',
        'last_name',
        'full_name',
        'birth_date',
        'has_whatsapp',
        'email',
        'phone',
        'has_social_networks',
    ]);
    const page1 = new Set(['attendance_duration', 'is_official_member', 'member_record_at_nova_semente', 'member_record_church']);
    const page2 = new Set(['has_previous_ministry_volunteer_experience', 'previous_ministry_ids']);
    const page3 = new Set([
        'is_active_in_ministry',
        'active_ministry_ids',
        'wants_other_ministry',
        'other_ministry_ids',
        'gifts_to_develop',
        'professional_area',
        'lgpd_data_consent',
    ]);

    if (page0.has(base)) return 0;
    if (page1.has(base)) return 1;
    if (page2.has(base)) return 2;
    if (page3.has(base)) return 3;
    return 3;
}

export function visiblePagesForMissingFields(missingFields: string[]): number[] {
    const pages = new Set(missingFields.map((field) => resolveVolunteerSignupFieldPage(field)));
    return [...pages].sort((a, b) => a - b);
}

export function shouldShowVolunteerSignupField(fieldKey: string, missingFields: string[]): boolean {
    return missingFields.includes(fieldKey);
}

type SignupFormSlice = Pick<
    VolunteerSignupInitial,
    | 'phone'
    | 'is_official_member'
    | 'member_record_at_nova_semente'
    | 'has_previous_ministry_volunteer_experience'
    | 'is_active_in_ministry'
    | 'wants_other_ministry'
>;

/** Campo visível no modo «só perguntas faltantes» (inclui perguntas condicionais abertas na etapa). */
export function isVolunteerSignupFieldVisible(
    fieldKey: string,
    focusMissingOnly: boolean,
    missingFields: string[],
    data: SignupFormSlice,
): boolean {
    if (!focusMissingOnly) {
        return true;
    }

    if (fieldKey === 'phone') {
        return missingFields.includes('has_whatsapp') && data.phone.trim() !== '';
    }

    if (missingFields.includes(fieldKey)) {
        if (fieldKey === 'member_record_at_nova_semente') {
            return normalizeBool(data.is_official_member) === true;
        }
        if (fieldKey === 'member_record_church') {
            return (
                normalizeBool(data.is_official_member) === true &&
                normalizeBool(data.member_record_at_nova_semente) === false
            );
        }
        if (fieldKey === 'previous_ministry_ids') {
            return normalizeBool(data.has_previous_ministry_volunteer_experience) === true;
        }
        if (fieldKey === 'active_ministry_ids') {
            return normalizeBool(data.is_active_in_ministry) === true;
        }
        if (fieldKey === 'other_ministry_ids') {
            return normalizeBool(data.wants_other_ministry) === true;
        }
        return true;
    }

    if (
        fieldKey === 'previous_ministry_ids' &&
        missingFields.includes('has_previous_ministry_volunteer_experience') &&
        normalizeBool(data.has_previous_ministry_volunteer_experience) === true
    ) {
        return true;
    }

    if (
        fieldKey === 'member_record_at_nova_semente' &&
        missingFields.includes('is_official_member') &&
        normalizeBool(data.is_official_member) === true
    ) {
        return true;
    }

    if (fieldKey === 'member_record_church') {
        if (
            missingFields.includes('member_record_at_nova_semente') &&
            normalizeBool(data.member_record_at_nova_semente) === false
        ) {
            return true;
        }
        if (
            missingFields.includes('is_official_member') &&
            normalizeBool(data.is_official_member) === true &&
            normalizeBool(data.member_record_at_nova_semente) === false
        ) {
            return true;
        }
    }

    if (
        fieldKey === 'active_ministry_ids' &&
        missingFields.includes('is_active_in_ministry') &&
        normalizeBool(data.is_active_in_ministry) === true
    ) {
        return true;
    }

    if (
        fieldKey === 'other_ministry_ids' &&
        missingFields.includes('wants_other_ministry') &&
        normalizeBool(data.wants_other_ministry) === true
    ) {
        return true;
    }

    return false;
}

/** Evita reenviar sobrenome vazio do cadastro antigo quando o nome completo não está na tela. */
function reconcileVolunteerSignupMergedName(
    out: Record<string, unknown>,
    prepared: Record<string, unknown>,
    initial: VolunteerSignupInitial,
    missingFields: string[],
): void {
    const nameTouched = ['full_name', 'first_name', 'last_name'].some((field) => missingFields.includes(field));

    const preparedFirst = String(prepared.first_name ?? '').trim();
    const preparedLast = String(prepared.last_name ?? '').trim();
    const preparedParts =
        splitFullName(`${preparedFirst} ${preparedLast}`.trim()) ??
        (preparedFirst && preparedLast ? { first_name: preparedFirst, last_name: preparedLast } : null);

    if (nameTouched && preparedParts) {
        out.first_name = preparedParts.first_name;
        out.last_name = preparedParts.last_name;
        return;
    }

    if (preparedParts) {
        out.first_name = preparedParts.first_name;
        out.last_name = preparedParts.last_name;
        return;
    }

    if (!nameTouched) {
        const initialParts = splitFullName(initial.full_name);
        if (initialParts) {
            out.first_name = initialParts.first_name;
            out.last_name = initialParts.last_name;
        }
    }
}

/** Mescla respostas já salvas para envio quando o usuário vê só campos faltantes. */
export function mergeVolunteerSignupWithInitial(
    prepared: Record<string, unknown>,
    initial: VolunteerSignupInitial,
    missingFields: string[],
): Record<string, unknown> {
    if (missingFields.length === 0) {
        return prepared;
    }

    const out = { ...prepared };
    const keep = (formKey: string, value: unknown) => {
        if (!missingFields.includes(formKey)) {
            out[formKey] = value;
        }
    };

    reconcileVolunteerSignupMergedName(out, prepared, initial, missingFields);
    keep('birth_date', initial.birth_date);
    keep('has_whatsapp', initial.has_whatsapp);
    keep('email', initial.email);
    keep('phone', initial.phone);
    keep('has_social_networks', initial.has_social_networks);
    keep('attendance_duration', initial.attendance_duration);
    keep('is_official_member', initial.is_official_member);
    keep('member_record_at_nova_semente', initial.member_record_at_nova_semente);
    keep('member_record_church', initial.member_record_church);
    keep('has_previous_ministry_volunteer_experience', initial.has_previous_ministry_volunteer_experience);
    keep('previous_ministry_ids', initial.previous_ministry_ids);
    keep('is_active_in_ministry', initial.is_active_in_ministry);
    keep('active_ministry_ids', initial.active_ministry_ids);
    keep('wants_other_ministry', initial.wants_other_ministry);
    keep('other_ministry_ids', initial.other_ministry_ids);
    keep('gifts_to_develop', initial.gifts_to_develop);
    keep('professional_area', initial.professional_area);
    keep('lgpd_data_consent', initial.lgpd_data_consent);

    return applyVolunteerSignupBranchingCleanup(out);
}

export const VOLUNTEER_SIGNUP_PAGE_STORAGE_KEY = 'volunteer-signup-active-page';

export function readVolunteerSignupStoredPage(): number | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const raw = sessionStorage.getItem(VOLUNTEER_SIGNUP_PAGE_STORAGE_KEY);
    if (raw === null) {
        return null;
    }
    const page = parseInt(raw, 10);
    return !Number.isNaN(page) && page >= 0 && page <= 3 ? page : null;
}

export function writeVolunteerSignupStoredPage(page: number): void {
    if (typeof window === 'undefined' || page < 0 || page > 3) {
        return;
    }
    sessionStorage.setItem(VOLUNTEER_SIGNUP_PAGE_STORAGE_KEY, String(page));
}

export function pageSlotForVolunteerSignupPage(visiblePages: number[], page: number): number {
    const slot = visiblePages.indexOf(page);
    return slot >= 0 ? slot : 0;
}

export function resolveVolunteerSignupInitialPageSlot(
    visiblePages: number[],
    resumePage?: number | null,
): number {
    if (resumePage !== null && resumePage !== undefined && visiblePages.includes(resumePage)) {
        return pageSlotForVolunteerSignupPage(visiblePages, resumePage);
    }
    const stored = readVolunteerSignupStoredPage();
    if (stored !== null && visiblePages.includes(stored)) {
        return pageSlotForVolunteerSignupPage(visiblePages, stored);
    }
    return 0;
}

export function volunteerSignupMissingOnlyHref(): string {
    return `${route('volunteers.self-signup.edit')}?missing=1`;
}

export function volunteerSignupFullEditHref(): string {
    return route('volunteers.self-signup.edit');
}

const MISSING_FIELD_LABELS: Record<string, string> = {
    photo_file: 'Foto',
    full_name: 'Nome completo',
    birth_date: 'Data de nascimento válida (mínimo 10 anos)',
    has_whatsapp: 'WhatsApp no telefone',
    email: 'E-mail',
    has_social_networks: 'Uso de redes sociais',
    attendance_duration: 'Tempo de frequência na igreja',
    is_official_member: 'Membro oficial da igreja',
    member_record_at_nova_semente: 'Registro de membro na Nova Semente',
    member_record_church: 'Igreja do registro de membro',
    has_previous_ministry_volunteer_experience: 'Experiência anterior como voluntário',
    previous_ministry_ids: 'Ministérios em que já serviu',
    is_active_in_ministry: 'Atuação em ministério',
    active_ministry_ids: 'Ministérios em que é atuante',
    wants_other_ministry: 'Interesse em outro ministério',
    other_ministry_ids: 'Ministérios de interesse',
    lgpd_data_consent: 'Consentimento LGPD',
};

/** Rótulos legíveis das perguntas ainda pendentes (para avisos e modo «só faltantes»). */
export function describeMissingVolunteerSignupFields(missingFields: string[]): string {
    if (missingFields.length === 0) {
        return '';
    }

    const labels = missingFields.map((field) => MISSING_FIELD_LABELS[field] ?? field);

    if (labels.length === 1) {
        return labels[0];
    }

    if (labels.length === 2) {
        return `${labels[0]} e ${labels[1]}`;
    }

    return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}
