import type { VolunteerSignupInitial } from '@/Pages/Volunteers/PublicSignup';
import { hasServiceActivityTypeSelection, hasServiceEaseAreaSelection, isValidVolunteerPhase } from '@/utils/volunteerSignupOptions';
import { normalizeVolunteerFullName } from '@/utils/volunteerSignupPageValidation';

export type VolunteerSignupCompletion = {
    is_complete: boolean;
    missing_count: number;
    total_required: number;
    percent: number;
    missing_fields: string[];
};

/** Rótulo de progresso «10 de 20» (respondidas de total obrigatório). */
export function formatVolunteerSignupProgressLabel(completion: Pick<VolunteerSignupCompletion, 'missing_count' | 'total_required'>): string {
    const total = Math.max(0, completion.total_required);
    const answered = Math.max(0, Math.min(total, total - completion.missing_count));

    return `${answered} de ${total}`;
}

const MIN_VOLUNTEER_AGE = 10;

/** Campos que não entram no alerta de cadastro incompleto (espelha backend). */
export const VOLUNTEER_SIGNUP_OPTIONAL_FIELD_KEYS = ['phone', 'password', 'password_confirmation', 'current_password'] as const;

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
    'social_network_profiles',
    'professional_area',
    'attendance_duration',
    'is_official_member',
    'volunteer_phase',
    'desired_ministry_ids',
    'service_ease_areas',
    'comfortable_with_digital_tools',
    'service_activity_types',
    'service_greatest_strength',
    'service_greatest_challenge',
    'lgpd_data_consent',
] as const;

const MISSING_FIELD_MESSAGES: Record<string, string> = {
    photo_file: 'Tire ou envie uma foto antes de concluir.',
    full_name: 'Informe o nome completo (nome e sobrenome).',
    birth_date: 'Informe uma data de nascimento válida (mínimo 10 anos).',
    has_whatsapp: 'Informe se este número tem WhatsApp.',
    email: 'Informe um e-mail válido.',
    has_social_networks: 'Informe se você usa redes sociais.',
    social_network_profiles: 'Informe o perfil do Instagram/Facebook.',
    professional_area: 'Informe sua área de atuação profissional.',
    attendance_duration: 'Selecione há quanto tempo frequenta a Nova Semente.',
    is_official_member: 'Informe se você é membro oficial da Igreja Adventista do 7º dia.',
    volunteer_phase: 'Informe sua fase atual no voluntariado da Nova Semente.',
    service_ease_areas: 'Marque pelo menos uma área em que você tem facilidade para servir.',
    comfortable_with_digital_tools: 'Informe se você se sente confortável com ferramentas digitais.',
    service_activity_types: 'Marque pelo menos um tipo de atividade em que você rende melhor.',
    service_greatest_strength: 'Descreva seu maior ponto forte no serviço.',
    service_greatest_challenge: 'Descreva seu maior desafio ao servir.',
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

    if (normalizeBool(out.has_social_networks as BoolLike) !== true) {
        out.social_network_profiles = '';
    }

    if (!hasServiceEaseAreaSelection(out.service_ease_areas)) {
        out.service_ease_areas = [];
    }

    if (!hasServiceActivityTypeSelection(out.service_activity_types)) {
        out.service_activity_types = [];
    }

    return out;
}

/** Monta o snapshot usado pelo cálculo de pendências a partir do payload enviado. */
export function buildVolunteerSignupCompletionInput(
    payload: Record<string, unknown>,
    options: { hasExistingPhoto: boolean },
): VolunteerSignupInitial {
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
        social_network_profiles: String(payload.social_network_profiles ?? ''),
        professional_area: String(payload.professional_area ?? ''),
        attendance_duration: (payload.attendance_duration as VolunteerSignupInitial['attendance_duration']) ?? '',
        is_official_member: normalizeBool(payload.is_official_member as BoolLike),
        volunteer_phase: (payload.volunteer_phase as VolunteerSignupInitial['volunteer_phase']) ?? '',
        desired_ministry_ids: Array.isArray(payload.desired_ministry_ids)
            ? (payload.desired_ministry_ids as number[])
            : [],
        service_ease_areas: Array.isArray(payload.service_ease_areas)
            ? (payload.service_ease_areas as string[])
            : [],
        comfortable_with_digital_tools: normalizeBool(payload.comfortable_with_digital_tools as BoolLike),
        service_activity_types: Array.isArray(payload.service_activity_types)
            ? (payload.service_activity_types as string[])
            : [],
        service_greatest_strength: String(payload.service_greatest_strength ?? ''),
        service_greatest_challenge: String(payload.service_greatest_challenge ?? ''),
        lgpd_data_consent: normalizeBool(payload.lgpd_data_consent as BoolLike),
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

    track('photo_file', true, initial.has_existing_photo === true);
    track('full_name', true, splitFullName(initial.full_name) !== null);
    track('birth_date', true, isBirthDateAtLeastMinAge(initial.birth_date, MIN_VOLUNTEER_AGE));

    const phoneFilled = initial.phone.trim() !== '';
    track('has_whatsapp', phoneFilled, phoneFilled ? isBoolSet(initial.has_whatsapp) : true);

    track('email', true, initial.email.trim() !== '' && isValidEmail(initial.email));

    const hasSocialNetworks = normalizeBool(initial.has_social_networks);
    track('has_social_networks', true, hasSocialNetworks !== null);

    if (hasSocialNetworks === true) {
        track('social_network_profiles', true, initial.social_network_profiles.trim() !== '');
    }

    track('professional_area', true, initial.professional_area.trim() !== '');
    track('attendance_duration', true, initial.attendance_duration.trim() !== '');
    track('is_official_member', true, normalizeBool(initial.is_official_member) !== null);
    track('volunteer_phase', true, isValidVolunteerPhase(initial.volunteer_phase));
    track('service_ease_areas', true, hasServiceEaseAreaSelection(initial.service_ease_areas));
    track('comfortable_with_digital_tools', true, isBoolSet(initial.comfortable_with_digital_tools));
    track('service_activity_types', true, hasServiceActivityTypeSelection(initial.service_activity_types));
    track('service_greatest_strength', true, initial.service_greatest_strength.trim() !== '');
    track('service_greatest_challenge', true, initial.service_greatest_challenge.trim() !== '');
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
        'social_network_profiles',
        'professional_area',
        'current_password',
        'password',
        'password_confirmation',
    ]);
    const page1 = new Set([
        'attendance_duration',
        'is_official_member',
        'volunteer_phase',
        'service_ease_areas',
        'comfortable_with_digital_tools',
    ]);
    const page2 = new Set([
        'service_activity_types',
        'service_greatest_strength',
        'service_greatest_challenge',
        'lgpd_data_consent',
    ]);

    if (page0.has(base)) return 0;
    if (page1.has(base)) return 1;
    if (page2.has(base)) return 2;
    return 2;
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
    'phone' | 'has_social_networks' | 'is_official_member'
>;

/** Campo visível no modo «só perguntas faltantes» (inclui perguntas condicionais abertas na etapa). */
export function isVolunteerSignupFieldVisible(
    fieldKey: string,
    focusMissingOnly: boolean,
    missingFields: string[],
    data: SignupFormSlice,
    pinnedMultiSelectFields: string[] = [],
): boolean {
    if (!focusMissingOnly) {
        return true;
    }

    if (pinnedMultiSelectFields.includes(fieldKey)) {
        return true;
    }

    if (fieldKey === 'phone') {
        return missingFields.includes('has_whatsapp') && data.phone.trim() !== '';
    }

    if (fieldKey === 'social_network_profiles') {
        if (missingFields.includes('social_network_profiles')) {
            return normalizeBool(data.has_social_networks) === true;
        }
        if (
            missingFields.includes('has_social_networks') &&
            normalizeBool(data.has_social_networks) === true
        ) {
            return true;
        }
        return false;
    }

    if (missingFields.includes(fieldKey)) {
        return true;
    }

    return false;
}

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
    options?: { focusMissingOnly?: boolean },
): Record<string, unknown> {
    const focusMissingOnly = options?.focusMissingOnly ?? false;
    if (missingFields.length === 0 && !focusMissingOnly) {
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
    keep('social_network_profiles', initial.social_network_profiles);
    keep('professional_area', initial.professional_area);
    keep('attendance_duration', initial.attendance_duration);
    keep('is_official_member', initial.is_official_member);
    keep('volunteer_phase', initial.volunteer_phase);
    keep('service_ease_areas', initial.service_ease_areas);
    keep('comfortable_with_digital_tools', initial.comfortable_with_digital_tools);
    keep('service_activity_types', initial.service_activity_types);
    keep('service_greatest_strength', initial.service_greatest_strength);
    keep('service_greatest_challenge', initial.service_greatest_challenge);
    keep('lgpd_data_consent', initial.lgpd_data_consent);

    if (focusMissingOnly) {
        applyVolunteerSignupFormBranchingPreferences(out, prepared);
    }

    return applyVolunteerSignupBranchingCleanup(out);
}

function applyVolunteerSignupFormBranchingPreferences(
    out: Record<string, unknown>,
    prepared: Record<string, unknown>,
): void {
    const boolFields = [
        'has_social_networks',
        'is_official_member',
        'comfortable_with_digital_tools',
        'lgpd_data_consent',
    ] as const;

    for (const key of boolFields) {
        const formVal = normalizeBool(prepared[key] as BoolLike);
        if (formVal !== null) {
            out[key] = formVal;
        }
    }

    if (String(prepared.social_network_profiles ?? '').trim() !== '') {
        out.social_network_profiles = prepared.social_network_profiles;
    }

    if (hasServiceEaseAreaSelection(prepared.service_ease_areas)) {
        out.service_ease_areas = prepared.service_ease_areas;
    }

    if (hasServiceActivityTypeSelection(prepared.service_activity_types)) {
        out.service_activity_types = prepared.service_activity_types;
    }

    for (const key of ['volunteer_phase', 'professional_area', 'service_greatest_strength', 'service_greatest_challenge'] as const) {
        if (String(prepared[key] ?? '').trim() !== '') {
            out[key] = prepared[key];
        }
    }
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
    return !Number.isNaN(page) && page >= 0 && page <= 2 ? page : null;
}

export function writeVolunteerSignupStoredPage(page: number): void {
    if (typeof window === 'undefined' || page < 0 || page > 2) {
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

const VOLUNTEER_SIGNUP_INITIAL_FORM_KEYS = [
    'full_name',
    'first_name',
    'last_name',
    'birth_date',
    'has_whatsapp',
    'email',
    'phone',
    'has_social_networks',
    'social_network_profiles',
    'professional_area',
    'attendance_duration',
    'is_official_member',
    'volunteer_phase',
    'desired_ministry_ids',
    'service_ease_areas',
    'comfortable_with_digital_tools',
    'service_activity_types',
    'service_greatest_strength',
    'service_greatest_challenge',
    'lgpd_data_consent',
] as const;

function volunteerSignupFormPatchAllFromInitial(initial: VolunteerSignupInitial): Record<string, unknown> {
    return {
        full_name: initial.full_name,
        first_name: initial.first_name,
        last_name: initial.last_name,
        birth_date: initial.birth_date,
        has_whatsapp: initial.has_whatsapp,
        email: initial.email,
        phone: initial.phone,
        has_social_networks: initial.has_social_networks,
        social_network_profiles: initial.social_network_profiles,
        professional_area: initial.professional_area,
        attendance_duration: initial.attendance_duration,
        is_official_member: initial.is_official_member,
        volunteer_phase: initial.volunteer_phase,
        desired_ministry_ids: initial.desired_ministry_ids ?? [],
        service_ease_areas: initial.service_ease_areas ?? [],
        comfortable_with_digital_tools: initial.comfortable_with_digital_tools,
        service_activity_types: initial.service_activity_types ?? [],
        service_greatest_strength: initial.service_greatest_strength,
        service_greatest_challenge: initial.service_greatest_challenge,
        lgpd_data_consent: initial.lgpd_data_consent,
    };
}

export function volunteerSignupFormPatchFromInitial(initial: VolunteerSignupInitial): Record<string, unknown> {
    return volunteerSignupFormPatchAllFromInitial(initial);
}

export function volunteerSignupFormPatchFromInitialFields(
    initial: VolunteerSignupInitial,
    savedFields: string[],
): Record<string, unknown> {
    const all = volunteerSignupFormPatchAllFromInitial(initial);
    const patch: Record<string, unknown> = {};
    const saved = new Set(savedFields);

    if (saved.has('first_name') || saved.has('last_name')) {
        patch.full_name = all.full_name;
        patch.first_name = all.first_name;
        patch.last_name = all.last_name;
    }

    for (const key of VOLUNTEER_SIGNUP_INITIAL_FORM_KEYS) {
        if (key === 'full_name' || key === 'first_name' || key === 'last_name') {
            continue;
        }
        if (saved.has(key)) {
            patch[key] = all[key];
        }
    }

    return patch;
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
    social_network_profiles: 'Perfil do Instagram/Facebook',
    professional_area: 'Área de atuação profissional',
    attendance_duration: 'Tempo de frequência na Nova Semente',
    is_official_member: 'Membro oficial da Igreja Adventista do 7º dia',
    volunteer_phase: 'Fase no voluntariado da Nova Semente',
    service_ease_areas: 'Áreas de facilidade para servir',
    comfortable_with_digital_tools: 'Conforto com ferramentas digitais',
    service_activity_types: 'Tipos de atividade em que você rende melhor',
    service_greatest_strength: 'Maior ponto forte no serviço',
    service_greatest_challenge: 'Maior desafio ao servir',
    lgpd_data_consent: 'Consentimento LGPD',
};

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
