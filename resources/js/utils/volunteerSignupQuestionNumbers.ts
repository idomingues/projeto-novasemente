import type { VolunteerSignupFormSlice } from '@/utils/volunteerSignupPageValidation';
import { normalizeSignupBool, shouldAskVolunteerWhatsapp } from '@/utils/volunteerSignupPageValidation';
import { VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS } from '@/utils/volunteerSignupPageFields';

export type VolunteerSignupQuestionNumberContext = {
    visiblePages: number[];
    isFieldVisible: (fieldKey: string) => boolean;
    data: VolunteerSignupFormSlice;
    focusMissingOnly: boolean;
    isEdit: boolean;
};

function isSocialProfilesVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return ctx.isFieldVisible('social_network_profiles');
    }

    return normalizeSignupBool(ctx.data.has_social_networks) === true;
}

function isWhatsappVisible(ctx: VolunteerSignupQuestionNumberContext): boolean {
    if (ctx.focusMissingOnly) {
        return ctx.isFieldVisible('has_whatsapp');
    }

    return shouldAskVolunteerWhatsapp(ctx.data.phone);
}

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
                keys.push('password', 'password_confirmation');
            }
            if (ctx.isFieldVisible('has_social_networks')) keys.push('has_social_networks');
            if (isSocialProfilesVisible(ctx)) keys.push('social_network_profiles');
            if (ctx.isFieldVisible('professional_area')) keys.push('professional_area');
            continue;
        }

        if (pageNum === 1) {
            for (const field of VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[1] ?? []) {
                if (ctx.isFieldVisible(field)) keys.push(field);
            }
            continue;
        }

        if (pageNum === 2) {
            for (const field of VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[2] ?? []) {
                if (ctx.isFieldVisible(field)) keys.push(field);
            }
        }
    }

    return keys;
}

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
            pageKeys.push('password', 'password_confirmation');
        }
        if (ctx.isFieldVisible('has_social_networks')) pageKeys.push('has_social_networks');
        if (isSocialProfilesVisible(ctx)) pageKeys.push('social_network_profiles');
        if (ctx.isFieldVisible('professional_area')) pageKeys.push('professional_area');
    } else if (pageNum === 1) {
        for (const field of VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[1] ?? []) {
            if (ctx.isFieldVisible(field)) pageKeys.push(field);
        }
    } else if (pageNum === 2) {
        for (const field of VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[2] ?? []) {
            if (ctx.isFieldVisible(field)) pageKeys.push(field);
        }
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
