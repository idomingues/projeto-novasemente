import type { VolunteerSignupInitial } from '@/Pages/Volunteers/PublicSignup';
import {
    hasMinistrySelection,
    isVolunteerSignupFieldVisible,
    type VolunteerSignupLegacyMinistryTexts,
} from '@/utils/volunteerSignupCompletion';

export const MIN_VOLUNTEER_SIGNUP_AGE = 10;

type BoolLike = boolean | null | string | number | undefined;

export type VolunteerSignupFormSlice = VolunteerSignupInitial & {
    photo_file?: File | null;
    password?: string;
    password_confirmation?: string;
    current_password?: string;
};

export function normalizeSignupBool(value: BoolLike): boolean | null {
    if (value === true || value === 1 || value === '1' || value === 'true') return true;
    if (value === false || value === 0 || value === '0' || value === 'false') return false;
    return null;
}

export function maxBirthDateForMinVolunteerAge(minYears: number): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - minYears);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function isBirthDateAtLeastMinAge(birthDate: string, minYears: number): boolean {
    if (!birthDate.trim()) return false;
    return birthDate <= maxBirthDateForMinVolunteerAge(minYears);
}

export function isValidSignupEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function splitVolunteerFullName(fullName: string): { first_name: string; last_name: string } | null {
    const parts = fullName
        .trim()
        .split(/\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length < 2) return null;
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function shouldAskVolunteerWhatsapp(phone: string): boolean {
    return phone.trim() !== '';
}

type PageValidationOptions = {
    page: number;
    data: VolunteerSignupFormSlice;
    isEdit: boolean;
    hasExistingPhoto: boolean;
    focusMissingOnly: boolean;
    missingFields: string[];
    legacyMinistryTexts?: VolunteerSignupLegacyMinistryTexts;
    duplicateHints?: {
        nameHint: string | null;
        emailHint: string | null;
        phoneHint: string | null;
    };
};

/** Valida somente campos obrigatórios da etapa indicada (bloqueio de «Avançar» e envio final). */
export function computeVolunteerSignupPageErrors({
    page,
    data,
    isEdit,
    hasExistingPhoto,
    focusMissingOnly,
    missingFields,
    legacyMinistryTexts,
    duplicateHints = { nameHint: null, emailHint: null, phoneHint: null },
}: PageValidationOptions): Record<string, string> {
    const next: Record<string, string> = {};
    const visible = (fieldKey: string) =>
        !focusMissingOnly || isVolunteerSignupFieldVisible(fieldKey, true, missingFields, data);

    if (page === 0) {
        if (visible('photo_file') && !data.photo_file && !(isEdit && hasExistingPhoto)) {
            next.photo_file = 'Tire ou envie uma foto antes de avançar.';
        }
        if (visible('full_name') && !splitVolunteerFullName(data.full_name)) {
            next.full_name = 'Informe o nome completo (nome e sobrenome).';
        }
        if (visible('birth_date') && !data.birth_date) {
            next.birth_date = 'Informe a data de nascimento.';
        } else if (visible('birth_date') && !isBirthDateAtLeastMinAge(data.birth_date, MIN_VOLUNTEER_SIGNUP_AGE)) {
            next.birth_date = `O voluntário deve ter pelo menos ${MIN_VOLUNTEER_SIGNUP_AGE} anos de idade.`;
        }
        if (visible('has_whatsapp') && shouldAskVolunteerWhatsapp(data.phone) && normalizeSignupBool(data.has_whatsapp) === null) {
            next.has_whatsapp = 'Informe se este número tem WhatsApp.';
        }
        if (visible('email') && !data.email.trim()) {
            next.email = 'Informe o e-mail.';
        } else if (visible('email') && !isValidSignupEmail(data.email)) {
            next.email = 'Informe um e-mail válido.';
        }
        if (visible('has_social_networks') && normalizeSignupBool(data.has_social_networks) === null) {
            next.has_social_networks = 'Informe se você usa redes sociais.';
        }
        if (visible('full_name') && duplicateHints.nameHint) next.full_name = duplicateHints.nameHint;
        if (visible('email') && duplicateHints.emailHint) next.email = duplicateHints.emailHint;
        if (duplicateHints.phoneHint) next.phone = duplicateHints.phoneHint;
        if (!isEdit) {
            if (!data.password) next.password = 'Defina uma senha para acessar o aplicativo.';
            else if ((data.password ?? '').length < 6) next.password = 'A senha deve ter pelo menos 6 caracteres.';
            if (!data.password_confirmation) next.password_confirmation = 'Confirme a senha.';
            if (data.password && data.password_confirmation && data.password !== data.password_confirmation) {
                next.password_confirmation = 'As senhas não coincidem.';
            }
        } else {
            const changingPassword =
                (data.password ?? '').trim() !== '' ||
                (data.password_confirmation ?? '').trim() !== '' ||
                (data.current_password ?? '').trim() !== '';
            if (changingPassword) {
                if (!(data.current_password ?? '').trim()) {
                    next.current_password = 'Informe a senha atual para alterar.';
                }
                if (!(data.password ?? '').trim()) next.password = 'Informe a nova senha.';
                else if ((data.password ?? '').length < 6) next.password = 'A senha deve ter pelo menos 6 caracteres.';
                if (!(data.password_confirmation ?? '').trim()) next.password_confirmation = 'Confirme a nova senha.';
                if (data.password && data.password_confirmation && data.password !== data.password_confirmation) {
                    next.password_confirmation = 'As senhas não coincidem.';
                }
            }
        }
    }

    if (page === 1) {
        if (visible('attendance_duration') && !data.attendance_duration) {
            next.attendance_duration = 'Selecione uma opção.';
        }
        if (visible('is_official_member') && normalizeSignupBool(data.is_official_member) === null) {
            next.is_official_member = 'Selecione uma opção.';
        }
        if (visible('is_official_member') && normalizeSignupBool(data.is_official_member) === true) {
            if (visible('member_record_at_nova_semente') && normalizeSignupBool(data.member_record_at_nova_semente) === null) {
                next.member_record_at_nova_semente = 'Selecione uma opção.';
            }
            if (
                visible('member_record_church') &&
                normalizeSignupBool(data.member_record_at_nova_semente) === false &&
                !data.member_record_church.trim()
            ) {
                next.member_record_church = 'Informe em qual igreja está o seu registro.';
            }
        }
    }

    if (page === 2) {
        if (
            visible('has_previous_ministry_volunteer_experience') &&
            normalizeSignupBool(data.has_previous_ministry_volunteer_experience) === null
        ) {
            next.has_previous_ministry_volunteer_experience = 'Selecione uma opção.';
        }
        if (
            visible('previous_ministry_ids') &&
            normalizeSignupBool(data.has_previous_ministry_volunteer_experience) === true &&
            !hasMinistrySelection(data.previous_ministry_ids, legacyMinistryTexts?.previous_ministry_details)
        ) {
            next.previous_ministry_ids = 'Selecione em quais ministérios você já serviu.';
        }
    }

    if (page === 3) {
        if (visible('is_active_in_ministry') && normalizeSignupBool(data.is_active_in_ministry) === null) {
            next.is_active_in_ministry = 'Selecione uma opção.';
        }
        if (
            visible('active_ministry_ids') &&
            normalizeSignupBool(data.is_active_in_ministry) === true &&
            !hasMinistrySelection(data.active_ministry_ids, legacyMinistryTexts?.ministry_involvement)
        ) {
            next.active_ministry_ids = 'Selecione pelo menos um ministério.';
        }
        if (visible('wants_other_ministry') && normalizeSignupBool(data.wants_other_ministry) === null) {
            next.wants_other_ministry = 'Selecione uma opção.';
        }
        if (
            visible('other_ministry_ids') &&
            normalizeSignupBool(data.wants_other_ministry) === true &&
            !hasMinistrySelection(data.other_ministry_ids, legacyMinistryTexts?.other_ministry_interest)
        ) {
            next.other_ministry_ids = 'Selecione pelo menos um ministério.';
        }
        if (visible('lgpd_data_consent') && normalizeSignupBool(data.lgpd_data_consent) === null) {
            next.lgpd_data_consent = 'Selecione uma opção.';
        }
        if (visible('lgpd_data_consent') && normalizeSignupBool(data.lgpd_data_consent) === false) {
            next.lgpd_data_consent = 'Para continuar, é necessário autorizar o uso dos dados (LGPD).';
        }
    }

    return next;
}

const DRAFT_PREFIX = 'volunteer-signup-draft:';

export function volunteerSignupDraftKey(token: string): string {
    return `${DRAFT_PREFIX}${token || 'public'}`;
}

type DraftPayload = Omit<
    VolunteerSignupFormSlice,
    'photo_file' | 'password' | 'password_confirmation' | 'current_password'
>;

export function readVolunteerSignupDraft(token: string): Partial<DraftPayload> | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(volunteerSignupDraftKey(token));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<DraftPayload>;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

export function writeVolunteerSignupDraft(token: string, data: VolunteerSignupFormSlice): void {
    if (typeof window === 'undefined') return;
    const { photo_file: _photo, password: _p, password_confirmation: _pc, current_password: _cp, ...rest } = data;
    try {
        sessionStorage.setItem(volunteerSignupDraftKey(token), JSON.stringify(rest));
    } catch {
        // quota exceeded — ignorar
    }
}

export function clearVolunteerSignupDraft(token: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(volunteerSignupDraftKey(token));
}

const FULL_NAME_SERVER_MESSAGE = 'Informe o nome completo (nome e sobrenome).';

export function mapVolunteerSignupServerErrors(
    propsErrors: Record<string, string | string[] | undefined>,
): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(propsErrors)) {
        const message = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
        if (message && message.trim() !== '') mapped[key] = message;
    }

    if (mapped.first_name || mapped.last_name || mapped.full_name) {
        mapped.full_name =
            mapped.full_name ?? mapped.first_name ?? mapped.last_name ?? FULL_NAME_SERVER_MESSAGE;
        delete mapped.first_name;
        delete mapped.last_name;
    }

    return mapped;
}
