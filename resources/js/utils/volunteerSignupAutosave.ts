import type { VolunteerSignupInitial } from '@/Pages/Volunteers/PublicSignup';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import type { VolunteerSignupFormSlice } from '@/utils/volunteerSignupPageValidation';
import { normalizeSignupBool, splitVolunteerFullName } from '@/utils/volunteerSignupPageValidation';
import { hasServiceEaseAreaSelection } from '@/utils/volunteerSignupOptions';
import axios from 'axios';

export type VolunteerSignupAutosaveResponse = {
    message: string;
    completion: VolunteerSignupCompletion;
    initial: VolunteerSignupInitial;
};

/**
 * Campos com seleção múltipla (checkboxes): não disparam autosave por clique;
 * salvam ao tocar em «Continuar» na etapa.
 */
export const VOLUNTEER_SIGNUP_MULTI_SELECT_FIELD_KEYS = [
    'service_ease_areas',
    'active_ministry_ids',
    'previous_ministry_ids',
    'other_ministry_ids',
] as const;

export type VolunteerSignupMultiSelectFieldKey = (typeof VOLUNTEER_SIGNUP_MULTI_SELECT_FIELD_KEYS)[number];

export function volunteerSignupFieldIsMultiSelect(fieldKey: string): boolean {
    return (VOLUNTEER_SIGNUP_MULTI_SELECT_FIELD_KEYS as readonly string[]).includes(fieldKey);
}

export function volunteerSignupMultiSelectFieldsOnPage(page: number): string[] {
    const keys = VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[page] ?? [];

    return keys.filter((key) => volunteerSignupFieldIsMultiSelect(key));
}

export const VOLUNTEER_SIGNUP_MULTI_SELECT_CONTINUE_HINT =
    'Marque todas as opções que se aplicam. As respostas são salvas ao tocar em Continuar.';

/** Campos por etapa do questionário (índice 0–2). */
export const VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS: Record<number, string[]> = {
    0: [
        'photo_file',
        'full_name',
        'birth_date',
        'phone',
        'has_whatsapp',
        'email',
        'has_social_networks',
        'social_network_profiles',
        'professional_area',
    ],
    1: [
        'attendance_duration',
        'is_official_member',
        'volunteer_phase',
        'service_ease_areas',
        'comfortable_with_digital_tools',
    ],
    2: ['service_greatest_strength', 'service_greatest_challenge', 'lgpd_data_consent'],
};

export function collectVolunteerSignupAutosaveFields(
    page: number,
    isFieldVisible: (fieldKey: string) => boolean,
    data: VolunteerSignupFormSlice,
): string[] {
    const keys = VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[page] ?? [];
    const fields: string[] = [];

    for (const key of keys) {
        if (!isFieldVisible(key)) continue;

        if (key === 'full_name') {
            fields.push('first_name', 'last_name');
            continue;
        }

        if (key === 'photo_file') {
            if (data.photo_file) fields.push('photo_file');
            continue;
        }

        if (key === 'social_network_profiles') {
            if (normalizeSignupBool(data.has_social_networks) === true) {
                fields.push('social_network_profiles');
            }
            continue;
        }

        fields.push(key);
    }

    return [...new Set(fields)];
}

function appendFormValue(formData: FormData, key: string, value: unknown): void {
    if (value === undefined) return;
    if (value === null) {
        formData.append(key, '');
        return;
    }
    if (value instanceof File) {
        formData.append(key, value);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            formData.append(`${key}[${index}]`, String(item));
        });
        return;
    }
    if (typeof value === 'boolean') {
        formData.append(key, value ? '1' : '0');
        return;
    }
    formData.append(key, String(value));
}

export async function postVolunteerSignupAutosave(
    payload: Record<string, unknown>,
    autosaveFields: string[],
): Promise<VolunteerSignupAutosaveResponse> {
    const formData = new FormData();
    const fieldsToSend = new Set(autosaveFields);

    const first = String(payload.first_name ?? '').trim();
    const last = String(payload.last_name ?? '').trim();
    if (first !== '' && last !== '') {
        fieldsToSend.add('first_name');
        fieldsToSend.add('last_name');
    }

    formData.append('autosave_fields', JSON.stringify([...fieldsToSend]));

    for (const field of fieldsToSend) {
        if (field === 'photo_file' && payload.photo_file instanceof File) {
            formData.append('photo_file', payload.photo_file);
            continue;
        }
        if (field === 'first_name' || field === 'last_name') {
            appendFormValue(formData, field, payload[field]);
            continue;
        }
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
            appendFormValue(formData, field, payload[field]);
        }
    }

    const { data } = await axios.post<VolunteerSignupAutosaveResponse>(
        route('volunteers.self-signup.autosave'),
        formData,
        {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
        },
    );

    return data;
}

export function volunteerSignupAutosaveFieldsReady(
    page: number,
    pageErrors: Record<string, string>,
    isFieldVisible: (fieldKey: string) => boolean,
    data: VolunteerSignupFormSlice,
): string[] {
    const candidates = collectVolunteerSignupAutosaveFields(page, isFieldVisible, data);
    const blocked = new Set(Object.keys(pageErrors));

    return candidates.filter((field) => {
        if (field === 'first_name' || field === 'last_name') {
            return !blocked.has('full_name') && !blocked.has('first_name') && !blocked.has('last_name');
        }
        return !blocked.has(field);
    });
}

export function fieldTriggersImmediateAutosave(fieldKey: string): boolean {
    if (volunteerSignupFieldIsMultiSelect(fieldKey)) {
        return false;
    }

    return [
        'attendance_duration',
        'is_official_member',
        'volunteer_phase',
        'has_whatsapp',
        'has_social_networks',
        'comfortable_with_digital_tools',
        'lgpd_data_consent',
    ].includes(fieldKey);
}

function normalizeMultiSelectValues(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return [...value].map((item) => String(item)).filter((item) => item !== '').sort();
}

/** Verifica se há seleções locais ainda não refletidas no payload vindo do servidor. */
export function volunteerSignupMultiSelectDiffersOnPage(
    localPayload: Record<string, unknown>,
    serverInitial: Record<string, unknown>,
    page: number,
): boolean {
    for (const field of volunteerSignupMultiSelectFieldsOnPage(page)) {
        const localValues = normalizeMultiSelectValues(localPayload[field]);
        const serverValues = normalizeMultiSelectValues(serverInitial[field]);
        if (JSON.stringify(localValues) !== JSON.stringify(serverValues)) {
            return true;
        }
    }

    return false;
}

export function isVolunteerSignupFieldAnswered(fieldKey: string, data: VolunteerSignupFormSlice): boolean {
    switch (fieldKey) {
        case 'full_name':
            return splitVolunteerFullName(data.full_name) !== null;
        case 'birth_date':
            return data.birth_date.trim() !== '';
        case 'email':
            return data.email.trim() !== '';
        case 'phone':
            return data.phone.trim() !== '';
        case 'attendance_duration':
            return data.attendance_duration !== '';
        case 'volunteer_phase':
            return data.volunteer_phase !== '';
        case 'service_ease_areas':
            return hasServiceEaseAreaSelection(data.service_ease_areas);
        case 'social_network_profiles':
            return data.social_network_profiles.trim() !== '';
        case 'professional_area':
        case 'service_greatest_strength':
        case 'service_greatest_challenge':
            return data[fieldKey].trim() !== '';
        case 'photo_file':
            return data.photo_file !== null;
        default:
            return normalizeSignupBool(data[fieldKey as keyof VolunteerSignupFormSlice] as boolean | null) !== null;
    }
}
