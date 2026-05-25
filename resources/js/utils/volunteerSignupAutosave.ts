import type { VolunteerSignupInitial } from '@/Pages/Volunteers/PublicSignup';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import type { VolunteerSignupFormSlice } from '@/utils/volunteerSignupPageValidation';
import { normalizeSignupBool, splitVolunteerFullName } from '@/utils/volunteerSignupPageValidation';
import axios from 'axios';

export type VolunteerSignupAutosaveResponse = {
    message: string;
    completion: VolunteerSignupCompletion;
    initial: VolunteerSignupInitial;
};

/** Campos por etapa do questionário (índice 0–3). */
export const VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS: Record<number, string[]> = {
    0: ['photo_file', 'full_name', 'birth_date', 'phone', 'has_whatsapp', 'email', 'has_social_networks'],
    1: ['attendance_duration', 'is_official_member', 'member_record_at_nova_semente', 'member_record_church'],
    2: ['has_previous_ministry_volunteer_experience', 'previous_ministry_ids'],
    3: ['is_active_in_ministry', 'active_ministry_ids', 'wants_other_ministry', 'other_ministry_ids', 'lgpd_data_consent'],
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

    // Sempre enviar nome e sobrenome do formulário quando existirem (evita gravar cadastro antigo sem sobrenome).
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

/** Campos da etapa sem erro de validação local (prontos para gravar). */
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
    return [
        'attendance_duration',
        'is_official_member',
        'member_record_at_nova_semente',
        'has_previous_ministry_volunteer_experience',
        'is_active_in_ministry',
        'wants_other_ministry',
        'has_whatsapp',
        'has_social_networks',
        'lgpd_data_consent',
    ].includes(fieldKey);
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
        case 'member_record_church':
            return data.member_record_church.trim() !== '';
        case 'previous_ministry_ids':
        case 'active_ministry_ids':
        case 'other_ministry_ids':
            return data[fieldKey].length > 0;
        case 'photo_file':
            return data.photo_file !== null;
        default:
            return normalizeSignupBool(data[fieldKey as keyof VolunteerSignupFormSlice] as boolean | null) !== null;
    }
}
