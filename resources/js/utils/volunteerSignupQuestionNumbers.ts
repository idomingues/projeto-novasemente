import type { VolunteerSignupFormSlice } from '@/utils/volunteerSignupPageValidation';
import { normalizeSignupBool, shouldAskVolunteerWhatsapp } from '@/utils/volunteerSignupPageValidation';
import { VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS } from '@/utils/volunteerSignupAutosave';

export type VolunteerSignupQuestionNumberContext = {
    visiblePages: number[];
    isFieldVisible: (fieldKey: string) => boolean;
    data: VolunteerSignupFormSlice;
    focusMissingOnly: boolean;
    isEdit: boolean;
};

function isMemberBranchVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return (
            ctx.isFieldVisible('member_record_at_nova_semente') || ctx.isFieldVisible('member_record_church')
        );
    }

    return normalizeSignupBool(ctx.data.is_official_member) === true;
}

function isMemberChurchVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return ctx.isFieldVisible('member_record_church');
    }

    return (
        normalizeSignupBool(ctx.data.is_official_member) === true &&
        normalizeSignupBool(ctx.data.member_record_at_nova_semente) === false
    );
}

function isPreviousMinistriesVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return ctx.isFieldVisible('previous_ministry_ids');
    }

    return normalizeSignupBool(ctx.data.has_previous_ministry_volunteer_experience) === true;
}

function isActiveMinistriesVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return ctx.isFieldVisible('active_ministry_ids');
    }

    return normalizeSignupBool(ctx.data.is_active_in_ministry) === true;
}

function isOtherMinistriesVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return ctx.isFieldVisible('other_ministry_ids');
    }

    return normalizeSignupBool(ctx.data.wants_other_ministry) === true;
}

function isWhatsappVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return ctx.isFieldVisible('has_whatsapp');
    }

    return shouldAskVolunteerWhatsapp(ctx.data.phone);
}

/** Lista ordenada de blocos visíveis do questionário (todas as etapas). */
export function listVisibleVolunteerSignupQuestionKeys(ctx: VolunteerSignupQuestionNumberContext): string[] {
    const keys: string[] = [];

    for (const pageNum of ctx.visiblePages) {
        if (pageNum === 0) {
            if (ctx.isFieldVisible('photo_file')) keys.push('photo_file');
            if (ctx.isFieldVisible('full_name')) keys.push('full_name');
            if (ctx.isFieldVisible('birth_date')) keys.push('birth_date');
            if (ctx.isFieldVisible('phone')) keys.push('phone');
            if (isWhatsappVisible(ctx)) keys.push('has_whatsapp');
            if (ctx.isFieldVisible('email')) keys.push('email');
            if (!ctx.focusMissingOnly) {
                if (ctx.isEdit) keys.push('current_password');
                keys.push('password', 'password_confirmation');
            }
            if (ctx.isFieldVisible('has_social_networks')) keys.push('has_social_networks');
            continue;
        }

        if (pageNum === 1) {
            for (const field of VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[1] ?? []) {
                if (field === 'member_record_at_nova_semente' || field === 'member_record_church') {
                    continue;
                }
                if (ctx.isFieldVisible(field)) keys.push(field);
            }
            if (isMemberBranchVisible(ctx)) {
                if (ctx.isFieldVisible('member_record_at_nova_semente')) {
                    keys.push('member_record_at_nova_semente');
                }
                if (isMemberChurchVisible(ctx)) {
                    keys.push('member_record_church');
                }
            }
            continue;
        }

        if (pageNum === 2) {
            if (ctx.isFieldVisible('has_previous_ministry_volunteer_experience')) {
                keys.push('has_previous_ministry_volunteer_experience');
            }
            if (isPreviousMinistriesVisible(ctx)) {
                keys.push('previous_ministry_ids');
            }
            continue;
        }

        if (pageNum === 3) {
            if (ctx.isFieldVisible('is_active_in_ministry')) keys.push('is_active_in_ministry');
            if (isActiveMinistriesVisible(ctx)) keys.push('active_ministry_ids');
            if (ctx.isFieldVisible('wants_other_ministry')) keys.push('wants_other_ministry');
            if (isOtherMinistriesVisible(ctx)) keys.push('other_ministry_ids');
            if (!ctx.focusMissingOnly) {
                keys.push('gifts_to_develop', 'professional_area');
            }
            if (ctx.isFieldVisible('lgpd_data_consent')) keys.push('lgpd_data_consent');
        }
    }

    return keys;
}

/** Numeração contínua (1…N) em todas as etapas visíveis do questionário. */
export function buildVolunteerSignupQuestionNumbers(
    ctx: VolunteerSignupQuestionNumberContext,
): Record<string, number> {
    const keys = listVisibleVolunteerSignupQuestionKeys(ctx);
    const map: Record<string, number> = {};
    keys.forEach((key, index) => {
        map[key] = index + 1;
    });

    return map;
}

export function totalVisibleVolunteerSignupQuestions(ctx: VolunteerSignupQuestionNumberContext): number {
    return listVisibleVolunteerSignupQuestionKeys(ctx).length;
}

/** Intervalo de numeração das perguntas da etapa atual (ex.: 4–6 de 12). */
export function questionRangeForPage(
    ctx: VolunteerSignupQuestionNumberContext,
    pageNum: number,
): { start: number; end: number; total: number } | null {
    const numbers = buildVolunteerSignupQuestionNumbers(ctx);
    const pageKeys: string[] = [];

    if (pageNum === 0) {
        if (ctx.isFieldVisible('photo_file')) pageKeys.push('photo_file');
        if (ctx.isFieldVisible('full_name')) pageKeys.push('full_name');
        if (ctx.isFieldVisible('birth_date')) pageKeys.push('birth_date');
        if (ctx.isFieldVisible('phone')) pageKeys.push('phone');
        if (isWhatsappVisible(ctx)) pageKeys.push('has_whatsapp');
        if (ctx.isFieldVisible('email')) pageKeys.push('email');
        if (!ctx.focusMissingOnly) {
            if (ctx.isEdit) pageKeys.push('current_password');
            pageKeys.push('password', 'password_confirmation');
        }
        if (ctx.isFieldVisible('has_social_networks')) pageKeys.push('has_social_networks');
    } else if (pageNum === 1) {
        for (const field of VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[1] ?? []) {
            if (field === 'member_record_at_nova_semente' || field === 'member_record_church') continue;
            if (ctx.isFieldVisible(field)) pageKeys.push(field);
        }
        if (isMemberBranchVisible(ctx)) {
            if (ctx.isFieldVisible('member_record_at_nova_semente')) pageKeys.push('member_record_at_nova_semente');
            if (isMemberChurchVisible(ctx)) pageKeys.push('member_record_church');
        }
    } else if (pageNum === 2) {
        if (ctx.isFieldVisible('has_previous_ministry_volunteer_experience')) {
            pageKeys.push('has_previous_ministry_volunteer_experience');
        }
        if (isPreviousMinistriesVisible(ctx)) pageKeys.push('previous_ministry_ids');
    } else if (pageNum === 3) {
        if (ctx.isFieldVisible('is_active_in_ministry')) pageKeys.push('is_active_in_ministry');
        if (isActiveMinistriesVisible(ctx)) pageKeys.push('active_ministry_ids');
        if (ctx.isFieldVisible('wants_other_ministry')) pageKeys.push('wants_other_ministry');
        if (isOtherMinistriesVisible(ctx)) pageKeys.push('other_ministry_ids');
        if (!ctx.focusMissingOnly) pageKeys.push('gifts_to_develop', 'professional_area');
        if (ctx.isFieldVisible('lgpd_data_consent')) pageKeys.push('lgpd_data_consent');
    }

    const values = pageKeys.map((k) => numbers[k]).filter((n) => n > 0);
    if (values.length === 0) return null;

    const total = totalVisibleVolunteerSignupQuestions(ctx);

    return {
        start: Math.min(...values),
        end: Math.max(...values),
        total,
    };
}
