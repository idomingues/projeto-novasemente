/**
 * Fonte única: qual campo pertence a qual etapa do questionário (índice 0–2).
 * Usado por validação, autosave, navegação de erros e numeração de perguntas.
 */
export const VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS: Record<number, readonly string[]> = {
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
        'desired_ministry_ids',
        'service_ease_areas',
        'comfortable_with_digital_tools',
    ],
    2: ['service_activity_types', 'service_greatest_strength', 'service_greatest_challenge', 'lgpd_data_consent'],
};

/** Campos extras da etapa 0 (senha) — não entram no autosave. */
const VOLUNTEER_SIGNUP_PAGE_0_PASSWORD_FIELDS = new Set([
    'password',
    'password_confirmation',
]);

const FIELD_TO_PAGE: Record<string, number> = (() => {
    const map: Record<string, number> = {};
    for (const [pageKey, fields] of Object.entries(VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS)) {
        const page = Number(pageKey);
        for (const field of fields) {
            map[field] = page;
        }
    }
    map.first_name = 0;
    map.last_name = 0;
    for (const field of VOLUNTEER_SIGNUP_PAGE_0_PASSWORD_FIELDS) {
        map[field] = 0;
    }
    return map;
})();

export function resolveVolunteerSignupFieldPage(field: string): number {
    const base = field.split('.')[0];
    return FIELD_TO_PAGE[base] ?? 2;
}

export function volunteerSignupFieldsOnPage(page: number): readonly string[] {
    return VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[page] ?? [];
}

export function visiblePagesForMissingFields(missingFields: string[]): number[] {
    const pages = new Set(missingFields.map((field) => resolveVolunteerSignupFieldPage(field)));
    return [...pages].sort((a, b) => a - b);
}
