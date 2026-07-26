import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';

export type VolunteerEditFormData = {
    name: string;
    email: string;
    phone: string;
    ministry_ids: number[];
    active: boolean;
    app_role: string;
    app_ministry_ids: number[];
    is_ministry_leader: boolean;
    app_password: string;
    app_password_confirmation: string;
    user_status: 'active' | 'inactive';
    birth_date: string;
    notify_via_app: boolean;
    notify_via_email: boolean;
    notify_via_whatsapp: boolean;
    photo: File | null;
};

export function volunteerEditFormDataFromDetail(v: VolunteerDetailData): VolunteerEditFormData {
    const roles = (v.user?.roles ?? []).filter((r) => r !== 'lider_ministerio');
    const isSuper = roles.includes('super_admin');
    const isLeader = Boolean(v.user?.is_ministry_leader) || (v.user?.led_ministries?.length ?? 0) > 0;

    return {
        name: v.user?.name ?? v.name ?? '',
        email: (v.display_email ?? v.user?.email ?? v.email ?? '').trim(),
        phone: (v.display_phone ?? v.phone ?? v.user?.phone ?? '').trim(),
        ministry_ids: (v.ministries ?? []).map((m) => m.id),
        active: v.active !== false,
        app_role: isSuper ? '' : roles[0] ?? '',
        app_ministry_ids: (v.user?.led_ministries ?? []).map((m) => m.id),
        is_ministry_leader: isLeader,
        app_password: '',
        app_password_confirmation: '',
        user_status: v.user?.status === 'inactive' ? 'inactive' : 'active',
        birth_date: (v.birth_date ?? v.user?.birth_date ?? '').split('T')[0] ?? '',
        notify_via_app: v.user?.notify_via_app ?? true,
        notify_via_email: v.user?.notify_via_email ?? true,
        notify_via_whatsapp: v.user?.notify_via_whatsapp ?? false,
        photo: null,
    };
}

export function normalizeVolunteerEditRolePayload(data: VolunteerEditFormData): VolunteerEditFormData {
    const ledIds = Array.isArray(data.app_ministry_ids)
        ? data.app_ministry_ids.filter((id) => Number(id) > 0)
        : [];
    const isLeader = ledIds.length > 0 || data.is_ministry_leader;
    const appRole = data.app_role === 'lider_ministerio' ? '' : data.app_role;

    return {
        ...data,
        app_role: appRole,
        is_ministry_leader: isLeader,
        app_ministry_ids: isLeader ? ledIds : [],
    };
}

function appendFormValue(formData: FormData, key: string, value: unknown): void {
    if (value === null || value === undefined) {
        return;
    }
    if (typeof value === 'boolean') {
        formData.append(key, value ? '1' : '0');
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => formData.append(`${key}[]`, String(item)));
        return;
    }
    if (value instanceof File) {
        formData.append(key, value);
        return;
    }
    formData.append(key, String(value));
}

export function buildVolunteerEditFormData(
    data: VolunteerEditFormData,
    options?: { includeServeMinistries?: boolean },
): FormData {
    const normalized = normalizeVolunteerEditRolePayload(data);
    const formData = new FormData();
    const includeServeMinistries = options?.includeServeMinistries !== false;

    appendFormValue(formData, 'name', normalized.name);
    appendFormValue(formData, 'email', normalized.email);
    appendFormValue(formData, 'phone', normalized.phone);
    appendFormValue(formData, 'active', normalized.active);
    appendFormValue(formData, 'app_role', normalized.app_role);
    appendFormValue(formData, 'is_ministry_leader', normalized.is_ministry_leader);
    appendFormValue(formData, 'app_ministry_ids', normalized.app_ministry_ids);
    if (includeServeMinistries) {
        appendFormValue(formData, 'ministry_ids', normalized.ministry_ids);
    }
    appendFormValue(formData, 'user_status', normalized.user_status);
    appendFormValue(formData, 'birth_date', normalized.birth_date);
    appendFormValue(formData, 'notify_via_app', normalized.notify_via_app);
    appendFormValue(formData, 'notify_via_email', normalized.notify_via_email);
    appendFormValue(formData, 'notify_via_whatsapp', normalized.notify_via_whatsapp);

    if (normalized.app_password.trim() !== '') {
        appendFormValue(formData, 'app_password', normalized.app_password);
        appendFormValue(formData, 'app_password_confirmation', normalized.app_password_confirmation);
    }

    if (normalized.photo instanceof File) {
        appendFormValue(formData, 'photo', normalized.photo);
    }

    return formData;
}

export function volunteerUserIsSuperAdmin(v: VolunteerDetailData): boolean {
    return Boolean(v.user?.roles?.includes('super_admin'));
}

export function volunteerUserIsPanelTeam(v: VolunteerDetailData): boolean {
    return Boolean(
        v.user?.roles?.some((r) => ['admin', 'super_admin', 'pastor', 'secretaria'].includes(r)),
    );
}

export function volunteerHasUsuarioAppEmail(v: VolunteerDetailData): boolean {
    return (v.display_email ?? v.user?.email ?? v.email ?? '').trim() !== '';
}

export function volunteerCanUseUsuarioAppForm(v: VolunteerDetailData): boolean {
    return Boolean(v.has_app_account) || volunteerHasUsuarioAppEmail(v);
}
