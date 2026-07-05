import type { MissionFormData } from '@/Components/Mission/MissionFormBody';
import type { MissionVolunteerDetail } from '@/utils/missionVolunteerDetailRows';

function appendBool(formData: FormData, key: string, value: boolean | null): void {
    formData.append(key, value === true ? '1' : '0');
}

export function missionVolunteerDetailToFormData(v: MissionVolunteerDetail): MissionFormData {
    return {
        photo: null,
        full_name: v.fullName?.trim() ?? '',
        birth_date: v.birthDate ?? '',
        email: v.email?.trim() ?? '',
        phone: v.phone?.trim() ?? '',
        full_address: v.fullAddress?.trim() ?? '',
        profession: v.profession?.trim() ?? '',
        profession_other: v.professionOther?.trim() ?? '',
        has_belief: v.hasBelief ?? null,
        belief_which: v.beliefWhich?.trim() ?? '',
        belief_which_other: v.beliefWhichOther?.trim() ?? '',
        participates_religion: v.participatesReligion ?? null,
        religion_which: v.religionWhich?.trim() ?? '',
        religion_which_other: v.religionWhichOther?.trim() ?? '',
        baptized: v.baptized ?? null,
        seeks_in_community: v.seeksInCommunity?.[0]?.trim() ?? '',
        seeks_in_community_other: v.seeksInCommunityOther?.trim() ?? '',
        studied_bible: v.studiedBible?.trim() ?? '',
        studied_bible_structured: v.studiedBibleStructured ?? null,
        first_time_nova_semente: v.firstTimeNovaSemente ?? null,
        first_contact_via: v.firstContactVia?.trim() ?? '',
        first_contact_via_other: v.firstContactViaOther?.trim() ?? '',
        wants_bible_study_partner: v.wantsBibleStudyPartner?.trim() ?? '',
        spiritual_journey: v.spiritualJourney?.trim() ?? '',
        comfortable_environment: v.comfortableEnvironment?.trim() ?? '',
        group_project_preference: v.groupProjectPreference?.trim() ?? '',
        interest_areas: [...(v.interestAreas ?? [])],
        learning_style: v.learningStyle?.trim() ?? '',
        personalized_bible_study_interest: v.personalizedBibleStudyInterest?.trim() ?? '',
        mission_social_projects_interest: v.missionSocialProjectsInterest?.trim() ?? '',
        start_area_preference: v.startAreaPreference?.trim() ?? '',
        talents_for_god: v.talentsForGod?.trim() ?? '',
        team_support_notes: v.teamSupportNotes?.trim() ?? '',
        lgpd_consent: v.lgpdConsent ?? false,
        wants_app_account: null,
        app_email: '',
        app_password: '',
        app_password_confirmation: '',
    };
}

export function buildMissionVolunteerUpdateFormData(data: MissionFormData): FormData {
    const formData = new FormData();

    if (data.photo) {
        formData.append('photo', data.photo);
    }

    formData.append('full_name', data.full_name);
    formData.append('birth_date', data.birth_date);
    formData.append('email', data.email.trim());
    formData.append('phone', data.phone);
    formData.append('full_address', data.full_address);
    formData.append('profession', data.profession);
    if (data.profession_other.trim() !== '') {
        formData.append('profession_other', data.profession_other);
    }

    appendBool(formData, 'has_belief', data.has_belief);
    if (data.has_belief === true) {
        formData.append('belief_which', data.belief_which);
        if (data.belief_which === 'Outra' && data.belief_which_other.trim() !== '') {
            formData.append('belief_which_other', data.belief_which_other);
        }
    }

    appendBool(formData, 'participates_religion', data.participates_religion);
    if (data.participates_religion === true) {
        formData.append('religion_which', data.religion_which);
        if (data.religion_which === 'Outra' && data.religion_which_other.trim() !== '') {
            formData.append('religion_which_other', data.religion_which_other);
        }
    }

    appendBool(formData, 'baptized', data.baptized);

    if (data.seeks_in_community.trim() !== '') {
        formData.append('seeks_in_community[]', data.seeks_in_community);
        if (data.seeks_in_community === 'Outra' && data.seeks_in_community_other.trim() !== '') {
            formData.append('seeks_in_community_other', data.seeks_in_community_other);
        }
    }

    formData.append('studied_bible', data.studied_bible);
    appendBool(formData, 'studied_bible_structured', data.studied_bible_structured);
    appendBool(formData, 'first_time_nova_semente', data.first_time_nova_semente);

    formData.append('first_contact_via', data.first_contact_via);
    if (data.first_contact_via === 'Outra' && data.first_contact_via_other.trim() !== '') {
        formData.append('first_contact_via_other', data.first_contact_via_other);
    }

    formData.append('wants_bible_study_partner', data.wants_bible_study_partner);
    formData.append('spiritual_journey', data.spiritual_journey);
    formData.append('comfortable_environment', data.comfortable_environment);
    formData.append('group_project_preference', data.group_project_preference);

    data.interest_areas.forEach((area) => {
        formData.append('interest_areas[]', area);
    });

    formData.append('learning_style', data.learning_style);
    formData.append('personalized_bible_study_interest', data.personalized_bible_study_interest);
    formData.append('mission_social_projects_interest', data.mission_social_projects_interest);
    formData.append('start_area_preference', data.start_area_preference);

    if (data.talents_for_god.trim() !== '') {
        formData.append('talents_for_god', data.talents_for_god);
    }
    if (data.team_support_notes.trim() !== '') {
        formData.append('team_support_notes', data.team_support_notes);
    }

    return formData;
}

export type MissionVolunteerFormErrors = Partial<Record<keyof MissionFormData | 'photo', string>>;

export function mapMissionVolunteerUpdateErrors(raw: Record<string, string[] | string> | undefined): MissionVolunteerFormErrors {
    if (!raw) {
        return {};
    }

    const mapped: MissionVolunteerFormErrors = {};
    for (const [key, value] of Object.entries(raw)) {
        const message = Array.isArray(value) ? value[0] : value;
        if (!message) continue;

        const normalized = key.replace(/\.\d+$/, '').replace(/\.\*$/, '');
        if (normalized === 'seeks_in_community') {
            mapped.seeks_in_community = message;
        } else if (normalized === 'interest_areas') {
            mapped.interest_areas = message;
        } else if (normalized in mapped || normalized in ({} as MissionFormData)) {
            mapped[normalized as keyof MissionFormData] = message;
        } else {
            mapped[normalized as keyof MissionFormData] = message;
        }
    }

    return mapped;
}
