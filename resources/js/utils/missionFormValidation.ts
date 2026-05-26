import type { MissionFormData } from '@/Components/Mission/MissionFormBody';

export type MissionValidationIssue = {
    page: number;
    message: string;
};

export function findMissionFormIssue(data: MissionFormData): MissionValidationIssue | null {
    if (!data.photo) {
        return { page: 0, message: 'Envie uma foto antes de enviar.' };
    }
    if (!data.full_name.trim()) {
        return { page: 0, message: 'Informe o nome completo.' };
    }
    if (!data.birth_date) {
        return { page: 0, message: 'Informe a data de nascimento.' };
    }
    if (!data.phone.trim()) {
        return { page: 0, message: 'Informe o telefone.' };
    }
    if (!data.full_address.trim()) {
        return { page: 0, message: 'Informe o endereço completo.' };
    }
    if (!data.profession) {
        return { page: 1, message: 'Selecione sua profissão.' };
    }
    if (data.has_belief === null) {
        return { page: 2, message: 'Responda se você tem alguma crença.' };
    }
    if (data.has_belief && !data.belief_which) {
        return { page: 2, message: 'Selecione qual crença.' };
    }
    if (data.has_belief && data.belief_which === 'Outra' && !data.belief_which_other.trim()) {
        return { page: 2, message: 'Especifique sua crença.' };
    }
    if (data.participates_religion === null) {
        return { page: 2, message: 'Responda se participa de uma religião.' };
    }
    if (data.participates_religion && !data.religion_which) {
        return { page: 3, message: 'Selecione qual religião.' };
    }
    if (data.participates_religion && data.religion_which === 'Outra' && !data.religion_which_other.trim()) {
        return { page: 3, message: 'Especifique a religião.' };
    }
    if (data.baptized === null) {
        return { page: 3, message: 'Responda se já foi batizado.' };
    }
    if (!data.seeks_in_community) {
        return { page: 4, message: 'Selecione o que busca em uma comunidade.' };
    }
    if (data.seeks_in_community === 'Outra' && !data.seeks_in_community_other.trim()) {
        return { page: 4, message: 'Especifique o que busca na comunidade.' };
    }
    if (!data.studied_bible) {
        return { page: 4, message: 'Responda se já estudou a Bíblia.' };
    }
    if (data.studied_bible_structured === null) {
        return { page: 4, message: 'Responda se já estudou a Bíblia de forma estruturada.' };
    }
    if (data.first_time_nova_semente === null) {
        return { page: 5, message: 'Responda se é sua primeira vez na Nova Semente.' };
    }
    if (!data.first_contact_via) {
        return { page: 5, message: 'Selecione como foi seu primeiro contato.' };
    }
    if (data.first_contact_via === 'Outra' && !data.first_contact_via_other.trim()) {
        return { page: 5, message: 'Especifique como foi o contato.' };
    }
    if (!data.wants_bible_study_partner) {
        return { page: 5, message: 'Responda se gostaria de ter alguém para estudar a Bíblia.' };
    }
    if (!data.lgpd_consent) {
        return { page: 5, message: 'Aceite o uso dos dados (LGPD) para enviar.' };
    }

    return null;
}

/** Página do wizard (0–5) com o primeiro erro do servidor. */
export function missionErrorPage(errors: Partial<Record<keyof MissionFormData, string>>): number | null {
    const pageFields: (keyof MissionFormData)[][] = [
        ['photo', 'full_name', 'birth_date', 'phone', 'full_address'],
        ['profession'],
        ['has_belief', 'belief_which', 'belief_which_other', 'participates_religion'],
        ['religion_which', 'religion_which_other', 'baptized'],
        ['seeks_in_community', 'seeks_in_community_other', 'studied_bible', 'studied_bible_structured'],
        [
            'first_time_nova_semente',
            'first_contact_via',
            'first_contact_via_other',
            'wants_bible_study_partner',
            'lgpd_consent',
        ],
    ];

    for (let i = 0; i < pageFields.length; i++) {
        if (pageFields[i].some((field) => Boolean(errors[field]))) {
            return i;
        }
    }

    return null;
}
