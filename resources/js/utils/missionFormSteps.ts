import type { MissionFormData } from '@/Components/Mission/MissionFormBody';

export type MissionStepId =
    | 'photo'
    | 'full_name'
    | 'birth_date'
    | 'email'
    | 'phone'
    | 'full_address'
    | 'profession'
    | 'has_belief'
    | 'belief_which'
    | 'participates_religion'
    | 'religion_which'
    | 'baptized'
    | 'seeks_in_community'
    | 'studied_bible'
    | 'studied_bible_structured'
    | 'first_time_nova_semente'
    | 'first_contact_via'
    | 'wants_bible_study_partner'
    | 'spiritual_journey'
    | 'comfortable_environment'
    | 'group_project_preference'
    | 'interest_areas'
    | 'learning_style'
    | 'personalized_bible_study_interest'
    | 'mission_social_projects_interest'
    | 'start_area_preference'
    | 'talents_for_god'
    | 'team_support_notes'
    | 'lgpd_consent'
    | 'app_account_choice'
    | 'app_account_credentials';

export const MISSION_STEP_ORDER: MissionStepId[] = [
    'photo',
    'full_name',
    'birth_date',
    'email',
    'phone',
    'full_address',
    'profession',
    'has_belief',
    'belief_which',
    'participates_religion',
    'religion_which',
    'baptized',
    'seeks_in_community',
    'studied_bible',
    'studied_bible_structured',
    'first_time_nova_semente',
    'first_contact_via',
    'wants_bible_study_partner',
    'spiritual_journey',
    'comfortable_environment',
    'group_project_preference',
    'interest_areas',
    'learning_style',
    'personalized_bible_study_interest',
    'mission_social_projects_interest',
    'start_area_preference',
    'talents_for_god',
    'team_support_notes',
    'lgpd_consent',
    'app_account_choice',
    'app_account_credentials',
];

export function isMissionStepVisible(step: MissionStepId, data: MissionFormData, offerAppAccount = false): boolean {
    if (step === 'app_account_choice') {
        return offerAppAccount;
    }
    if (step === 'app_account_credentials') {
        return offerAppAccount && data.wants_app_account === true;
    }
    if (step === 'belief_which') {
        return data.has_belief === true;
    }
    if (step === 'religion_which') {
        return data.participates_religion === true;
    }

    return true;
}

export function visibleMissionSteps(data: MissionFormData, offerAppAccount = false): MissionStepId[] {
    return MISSION_STEP_ORDER.filter((step) => isMissionStepVisible(step, data, offerAppAccount));
}

export function isMissionRegistrationSubmitStep(
    step: MissionStepId,
    data: MissionFormData,
    offerAppAccount = false,
): boolean {
    const visible = visibleMissionSteps(data, offerAppAccount);

    return visible[visible.length - 1] === step;
}

export function missionStepSectionTitle(step: MissionStepId): string {
    switch (step) {
        case 'photo':
        case 'full_name':
        case 'birth_date':
        case 'email':
        case 'phone':
        case 'full_address':
            return 'Dados pessoais';
        case 'profession':
            return 'Profissão';
        case 'has_belief':
        case 'belief_which':
            return 'Fé e crença';
        case 'participates_religion':
        case 'religion_which':
        case 'baptized':
            return 'Religião';
        case 'seeks_in_community':
        case 'studied_bible':
        case 'studied_bible_structured':
            return 'Comunidade e Bíblia';
        case 'first_time_nova_semente':
        case 'first_contact_via':
        case 'wants_bible_study_partner':
            return 'Nova Semente';
        case 'spiritual_journey':
        case 'comfortable_environment':
        case 'group_project_preference':
            return 'Caminhada e convivência';
        case 'interest_areas':
        case 'learning_style':
        case 'personalized_bible_study_interest':
        case 'mission_social_projects_interest':
        case 'start_area_preference':
            return 'Interesses';
        case 'app_account_choice':
        case 'app_account_credentials':
            return 'Conta no app';
        default:
            return 'Compartilhe mais';
    }
}

export function missionStepQuestionNumber(step: MissionStepId): number {
    const map: Record<MissionStepId, number> = {
        photo: 0,
        full_name: 1,
        birth_date: 2,
        email: 3,
        phone: 4,
        full_address: 5,
        profession: 6,
        has_belief: 7,
        belief_which: 8,
        participates_religion: 9,
        religion_which: 10,
        baptized: 11,
        seeks_in_community: 12,
        studied_bible: 13,
        studied_bible_structured: 14,
        first_time_nova_semente: 15,
        first_contact_via: 16,
        wants_bible_study_partner: 17,
        spiritual_journey: 18,
        comfortable_environment: 19,
        group_project_preference: 20,
        interest_areas: 21,
        learning_style: 22,
        personalized_bible_study_interest: 23,
        mission_social_projects_interest: 24,
        start_area_preference: 25,
        talents_for_god: 26,
        team_support_notes: 27,
        lgpd_consent: 28,
        app_account_choice: 29,
        app_account_credentials: 30,
    };

    return map[step];
}

export function isMissionStepOptional(step: MissionStepId): boolean {
    return step === 'talents_for_god' || step === 'team_support_notes';
}

export function validateMissionStep(step: MissionStepId, data: MissionFormData): string | null {
    if (isMissionStepOptional(step)) {
        return null;
    }

    switch (step) {
        case 'photo':
            return data.photo ? null : 'Envie uma foto antes de avançar.';
        case 'full_name':
            return data.full_name.trim() ? null : 'Informe o nome completo.';
        case 'birth_date':
            return data.birth_date ? null : 'Informe a data de nascimento.';
        case 'email':
            if (!data.email.trim()) return 'Informe seu e-mail.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return 'Informe um e-mail válido.';
            return null;
        case 'phone':
            return data.phone.trim() ? null : 'Informe o telefone.';
        case 'full_address':
            return data.full_address.trim() ? null : 'Informe o endereço completo.';
        case 'profession':
            if (!data.profession) return 'Selecione sua profissão.';
            if (data.profession === 'Outra' && !data.profession_other.trim()) return 'Especifique sua profissão.';
            return null;
        case 'has_belief':
            return data.has_belief === null ? 'Responda se você tem alguma crença.' : null;
        case 'belief_which':
            if (!data.belief_which) return 'Selecione qual crença.';
            if (data.belief_which === 'Outra' && !data.belief_which_other.trim()) return 'Especifique sua crença.';
            return null;
        case 'participates_religion':
            return data.participates_religion === null ? 'Responda se participa de uma religião.' : null;
        case 'religion_which':
            if (!data.religion_which) return 'Selecione qual religião.';
            if (data.religion_which === 'Outra' && !data.religion_which_other.trim()) return 'Especifique a religião.';
            return null;
        case 'baptized':
            return data.baptized === null ? 'Responda se já foi batizado.' : null;
        case 'seeks_in_community':
            if (!data.seeks_in_community) return 'Selecione o que busca em uma comunidade.';
            if (data.seeks_in_community === 'Outra' && !data.seeks_in_community_other.trim()) {
                return 'Especifique o que busca na comunidade.';
            }
            return null;
        case 'studied_bible':
            return data.studied_bible ? null : 'Responda se já estudou a Bíblia.';
        case 'studied_bible_structured':
            return data.studied_bible_structured === null
                ? 'Responda se já estudou a Bíblia de forma estruturada.'
                : null;
        case 'first_time_nova_semente':
            return data.first_time_nova_semente === null ? 'Responda se é sua primeira vez na Nova Semente.' : null;
        case 'first_contact_via':
            if (!data.first_contact_via) return 'Selecione como foi seu primeiro contato.';
            if (data.first_contact_via === 'Outra' && !data.first_contact_via_other.trim()) {
                return 'Especifique como foi o contato.';
            }
            return null;
        case 'wants_bible_study_partner':
            return data.wants_bible_study_partner ? null : 'Responda se gostaria de ter alguém para estudar a Bíblia.';
        case 'spiritual_journey':
            return data.spiritual_journey ? null : 'Descreva sua caminhada espiritual hoje.';
        case 'comfortable_environment':
            return data.comfortable_environment ? null : 'Selecione em qual ambiente você se sente mais confortável.';
        case 'group_project_preference':
            return data.group_project_preference
                ? null
                : 'Selecione como você normalmente prefere participar de grupos ou projetos.';
        case 'interest_areas':
            if (!Array.isArray(data.interest_areas) || data.interest_areas.length === 0) {
                return 'Escolha ao menos uma atividade que desperta seu interesse.';
            }
            if (data.interest_areas.length > 3) return 'Escolha no máximo três atividades de interesse.';
            return null;
        case 'learning_style':
            return data.learning_style ? null : 'Selecione como você aprende melhor.';
        case 'personalized_bible_study_interest':
            return data.personalized_bible_study_interest
                ? null
                : 'Responda se teria interesse em estudar a Bíblia de maneira personalizada.';
        case 'mission_social_projects_interest':
            return data.mission_social_projects_interest
                ? null
                : 'Responda como você se sente em relação a projetos missionários ou ações sociais.';
        case 'start_area_preference':
            return data.start_area_preference
                ? null
                : 'Selecione uma área para começar sua caminhada na Nova Semente.';
        case 'lgpd_consent':
            return data.lgpd_consent ? null : 'Aceite o uso dos dados (LGPD) para enviar.';
        case 'app_account_choice':
            return data.wants_app_account === null ? 'Responda se deseja criar conta no aplicativo.' : null;
        case 'app_account_credentials': {
            const appEmail = data.app_email.trim() || data.email.trim();
            if (!appEmail) return 'Informe seu e-mail.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appEmail)) return 'Informe um e-mail válido.';
            if (!data.app_password) return 'Informe uma senha.';
            if (data.app_password !== data.app_password_confirmation) return 'As senhas não conferem.';
            return null;
        }
        default:
            return null;
    }
}

export function missionStepIndexForField(
    field: keyof MissionFormData,
    data: MissionFormData,
    offerAppAccount = false,
): number | null {
    const fieldToStep: Partial<Record<keyof MissionFormData, MissionStepId>> = {
        photo: 'photo',
        full_name: 'full_name',
        birth_date: 'birth_date',
        email: 'email',
        phone: 'phone',
        full_address: 'full_address',
        profession: 'profession',
        profession_other: 'profession',
        has_belief: 'has_belief',
        belief_which: 'belief_which',
        belief_which_other: 'belief_which',
        participates_religion: 'participates_religion',
        religion_which: 'religion_which',
        religion_which_other: 'religion_which',
        baptized: 'baptized',
        seeks_in_community: 'seeks_in_community',
        seeks_in_community_other: 'seeks_in_community',
        studied_bible: 'studied_bible',
        studied_bible_structured: 'studied_bible_structured',
        first_time_nova_semente: 'first_time_nova_semente',
        first_contact_via: 'first_contact_via',
        first_contact_via_other: 'first_contact_via',
        wants_bible_study_partner: 'wants_bible_study_partner',
        spiritual_journey: 'spiritual_journey',
        comfortable_environment: 'comfortable_environment',
        group_project_preference: 'group_project_preference',
        interest_areas: 'interest_areas',
        learning_style: 'learning_style',
        personalized_bible_study_interest: 'personalized_bible_study_interest',
        mission_social_projects_interest: 'mission_social_projects_interest',
        start_area_preference: 'start_area_preference',
        talents_for_god: 'talents_for_god',
        team_support_notes: 'team_support_notes',
        lgpd_consent: 'lgpd_consent',
        wants_app_account: 'app_account_choice',
        app_email: 'app_account_credentials',
        app_password: 'app_account_credentials',
        app_password_confirmation: 'app_account_credentials',
    };

    const step = fieldToStep[field];
    if (!step) return null;

    const visible = visibleMissionSteps(data, offerAppAccount);
    const index = visible.indexOf(step);

    return index >= 0 ? index : null;
}

export function missionErrorStepIndex(
    errors: Partial<Record<keyof MissionFormData, string>>,
    data: MissionFormData,
    offerAppAccount = false,
): number | null {
    for (const field of Object.keys(errors) as (keyof MissionFormData)[]) {
        if (!errors[field]) continue;
        const index = missionStepIndexForField(field, data, offerAppAccount);
        if (index !== null) return index;
    }

    return null;
}

export function buildMissionStepPayload(step: MissionStepId, data: MissionFormData): FormData {
    const formData = new FormData();
    formData.append('step', step);

    const append = (key: string, value: string | boolean) => {
        formData.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : value);
    };

    switch (step) {
        case 'photo':
            if (data.photo) formData.append('photo', data.photo);
            break;
        case 'full_name':
            append('full_name', data.full_name);
            break;
        case 'birth_date':
            append('birth_date', data.birth_date);
            break;
        case 'email':
            append('email', data.email.trim());
            break;
        case 'phone':
            append('phone', data.phone);
            break;
        case 'full_address':
            append('full_address', data.full_address);
            break;
        case 'profession':
            append('profession', data.profession);
            append('profession_other', data.profession_other);
            break;
        case 'has_belief':
            append('has_belief', data.has_belief === true);
            break;
        case 'belief_which':
            append('belief_which', data.belief_which);
            append('belief_which_other', data.belief_which_other);
            break;
        case 'participates_religion':
            append('participates_religion', data.participates_religion === true);
            break;
        case 'religion_which':
            append('religion_which', data.religion_which);
            append('religion_which_other', data.religion_which_other);
            break;
        case 'baptized':
            append('baptized', data.baptized === true);
            break;
        case 'seeks_in_community':
            append('seeks_in_community', data.seeks_in_community);
            append('seeks_in_community_other', data.seeks_in_community_other);
            break;
        case 'studied_bible':
            append('studied_bible', data.studied_bible);
            break;
        case 'studied_bible_structured':
            append('studied_bible_structured', data.studied_bible_structured === true);
            break;
        case 'first_time_nova_semente':
            append('first_time_nova_semente', data.first_time_nova_semente === true);
            break;
        case 'first_contact_via':
            append('first_contact_via', data.first_contact_via);
            append('first_contact_via_other', data.first_contact_via_other);
            break;
        case 'wants_bible_study_partner':
            append('wants_bible_study_partner', data.wants_bible_study_partner);
            break;
        case 'spiritual_journey':
            append('spiritual_journey', data.spiritual_journey);
            break;
        case 'comfortable_environment':
            append('comfortable_environment', data.comfortable_environment);
            break;
        case 'group_project_preference':
            append('group_project_preference', data.group_project_preference);
            break;
        case 'interest_areas':
            data.interest_areas.forEach((value) => formData.append('interest_areas[]', value));
            break;
        case 'learning_style':
            append('learning_style', data.learning_style);
            break;
        case 'personalized_bible_study_interest':
            append('personalized_bible_study_interest', data.personalized_bible_study_interest);
            break;
        case 'mission_social_projects_interest':
            append('mission_social_projects_interest', data.mission_social_projects_interest);
            break;
        case 'start_area_preference':
            append('start_area_preference', data.start_area_preference);
            break;
        case 'talents_for_god':
            append('talents_for_god', data.talents_for_god);
            break;
        case 'team_support_notes':
            append('team_support_notes', data.team_support_notes);
            break;
        case 'lgpd_consent':
            append('lgpd_consent', data.lgpd_consent);
            break;
        default:
            break;
    }

    return formData;
}
