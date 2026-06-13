import type { VolunteerSignupInitial } from '@/Pages/Volunteers/PublicSignup';
import { hasServiceEaseAreaSelection, isValidVolunteerPhase } from '@/utils/volunteerSignupOptions';
import { isVolunteerSignupFieldVisible } from '@/utils/volunteerSignupCompletion';

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

/** Normaliza espaços invisíveis (iOS/autocomplete) para validação do nome completo. */
export function normalizeVolunteerFullName(fullName: string): string {
    return fullName
        .normalize('NFKC')
        .replace(/[\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function splitVolunteerFullName(fullName: string): { first_name: string; last_name: string } | null {
    const normalized = normalizeVolunteerFullName(fullName);
    if (!normalized) return null;

    const parts = normalized.split(' ').filter(Boolean);
    if (parts.length < 2) return null;

    const first_name = parts[0];
    const last_name = parts.slice(1).join(' ');
    if (!first_name || !last_name) return null;

    return { first_name, last_name };
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
    pinnedMultiSelectFields?: string[];
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
    pinnedMultiSelectFields = [],
    duplicateHints = { nameHint: null, emailHint: null, phoneHint: null },
}: PageValidationOptions): Record<string, string> {
    const next: Record<string, string> = {};
    const visible = (fieldKey: string) =>
        !focusMissingOnly
        || isVolunteerSignupFieldVisible(fieldKey, true, missingFields, data, pinnedMultiSelectFields);

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
        if (
            visible('social_network_profiles') &&
            normalizeSignupBool(data.has_social_networks) === true &&
            !data.social_network_profiles.trim()
        ) {
            next.social_network_profiles = 'Informe o nome do seu perfil nas redes sociais.';
        }
        if (visible('professional_area') && !data.professional_area.trim()) {
            next.professional_area = 'Informe sua área de atuação profissional.';
        }
        if (visible('full_name') && duplicateHints.nameHint) next.full_name = duplicateHints.nameHint;
        if (visible('email') && duplicateHints.emailHint) next.email = duplicateHints.emailHint;
        if (duplicateHints.phoneHint) next.phone = duplicateHints.phoneHint;
        if (!isEdit && !focusMissingOnly) {
            if (!data.password) next.password = 'Defina uma senha para acessar o aplicativo.';
            else if ((data.password ?? '').length < 6) next.password = 'A senha deve ter pelo menos 6 caracteres.';
            if (!data.password_confirmation) next.password_confirmation = 'Confirme a senha.';
            if (data.password && data.password_confirmation && data.password !== data.password_confirmation) {
                next.password_confirmation = 'As senhas não coincidem.';
            }
        } else if (!focusMissingOnly) {
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
        if (visible('volunteer_phase') && !isValidVolunteerPhase(data.volunteer_phase)) {
            next.volunteer_phase = 'Selecione sua fase no voluntariado.';
        }
        if (visible('service_ease_areas') && !hasServiceEaseAreaSelection(data.service_ease_areas)) {
            next.service_ease_areas = 'Marque pelo menos uma área em que você tem facilidade para servir.';
        }
        if (visible('comfortable_with_digital_tools') && normalizeSignupBool(data.comfortable_with_digital_tools) === null) {
            next.comfortable_with_digital_tools = 'Selecione uma opção.';
        }
    }

    if (page === 2) {
        if (visible('service_greatest_strength') && !data.service_greatest_strength.trim()) {
            next.service_greatest_strength = 'Descreva seu maior ponto forte no serviço.';
        }
        if (visible('service_greatest_challenge') && !data.service_greatest_challenge.trim()) {
            next.service_greatest_challenge = 'Descreva seu maior desafio ao servir.';
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

export {
    canStoreVolunteerSignupPhotoPreview,
    clearVolunteerSignupDraft,
    readVolunteerSignupDraft,
    readVolunteerSignupDraftState,
    volunteerSignupDraftHasAnswers,
    volunteerSignupDraftKey,
    writeVolunteerSignupDraft,
} from '@/utils/volunteerSignupLocalDraft';
export type { VolunteerSignupDraftEnvelope, VolunteerSignupDraftState } from '@/utils/volunteerSignupLocalDraft';

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
