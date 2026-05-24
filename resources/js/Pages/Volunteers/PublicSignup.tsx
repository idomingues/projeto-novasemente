import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import ProfilePhotoPicker from '@/Components/ProfilePhotoPicker';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PasswordInput from '@/Components/PasswordInput';
import TextInput from '@/Components/TextInput';
import MobileLayout from '@/Layouts/MobileLayout';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import {
    describeMissingVolunteerSignupFields,
    isVolunteerSignupFieldVisible,
    mergeVolunteerSignupWithInitial,
    visiblePagesForMissingFields,
} from '@/utils/volunteerSignupCompletion';
import {
    clearVolunteerSignupDraft,
    computeVolunteerSignupPageErrors,
    mapVolunteerSignupServerErrors,
    normalizeSignupBool,
    readVolunteerSignupDraft,
    shouldAskVolunteerWhatsapp,
    splitVolunteerFullName,
    writeVolunteerSignupDraft,
    MIN_VOLUNTEER_SIGNUP_AGE,
    maxBirthDateForMinVolunteerAge,
} from '@/utils/volunteerSignupPageValidation';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { FormEventHandler, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Ministry {
    id: number;
    name: string;
}

export interface VolunteerSignupInitial {
    photo_url?: string | null;
    has_existing_photo?: boolean;
    full_name: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    has_whatsapp: boolean | null;
    email: string;
    phone: string;
    has_social_networks: boolean | null;
    attendance_duration: AttendanceDuration | '';
    is_official_member: boolean | null;
    member_record_at_nova_semente: boolean | null;
    member_record_church: string;
    has_previous_ministry_volunteer_experience: boolean | null;
    previous_ministry_ids: number[];
    is_active_in_ministry: boolean | null;
    active_ministry_ids: number[];
    wants_other_ministry: boolean | null;
    other_ministry_ids: number[];
    gifts_to_develop: string;
    professional_area: string;
    lgpd_data_consent: boolean | null;
}

interface Props {
    mode?: 'signup' | 'edit';
    token?: string;
    churchName: string;
    ministries: Ministry[];
    initial?: VolunteerSignupInitial;
    cancelHref?: string;
    redirectAfterSave?: string;
    focusMissingOnly?: boolean;
    missingFields?: string[];
    signupCompletion?: VolunteerSignupCompletion;
}

type AttendanceDuration =
    | 'less_than_3_months'
    | 'months_3_6'
    | 'months_6_12'
    | 'years_1_3'
    | 'more_than_3_years';

const PAGE_TITLES = ['Dados pessoais', 'Nova Semente', 'Experiência', 'Ministérios'];

const ATTENDANCE_OPTIONS: { value: AttendanceDuration; label: string }[] = [
    { value: 'less_than_3_months', label: 'Menos de 3 meses' },
    { value: 'months_3_6', label: '3–6 meses' },
    { value: 'months_6_12', label: '6–12 meses' },
    { value: 'years_1_3', label: '1–3 anos' },
    { value: 'more_than_3_years', label: '+ 3 anos' },
];

function resolveErrorPage(field: string): number {
    const base = field.split('.')[0];
    const page0 = new Set([
        'photo_file',
        'first_name',
        'last_name',
        'full_name',
        'birth_date',
        'has_whatsapp',
        'email',
        'current_password',
        'password',
        'password_confirmation',
        'phone',
        'has_social_networks',
    ]);
    const page1 = new Set(['attendance_duration', 'is_official_member', 'member_record_at_nova_semente', 'member_record_church']);
    const page2 = new Set(['has_previous_ministry_volunteer_experience', 'previous_ministry_ids']);
    const page3 = new Set([
        'is_active_in_ministry',
        'active_ministry_ids',
        'wants_other_ministry',
        'other_ministry_ids',
        'gifts_to_develop',
        'professional_area',
        'lgpd_data_consent',
    ]);

    if (page0.has(base)) return 0;
    if (page1.has(base)) return 1;
    if (page2.has(base)) return 2;
    if (page3.has(base)) return 3;
    return 3;
}

function stepIndexForPage(visibleSteps: number[], pageNum: number): number {
    const idx = visibleSteps.indexOf(pageNum);
    return idx >= 0 ? idx : 0;
}

function firstErrorMessage(bag: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
    if (!bag) return undefined;
    const value = bag[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim() !== '') return value[0];
    return undefined;
}

const FIELD_SCROLL_TARGETS: Record<string, string> = {
    photo_file: 'volunteer-photo',
    full_name: 'field-full_name',
    birth_date: 'field-birth_date',
    phone: 'field-phone',
    has_whatsapp: 'field-has_whatsapp',
    email: 'field-email',
    has_social_networks: 'field-has_social_networks',
    attendance_duration: 'field-attendance_duration',
    is_official_member: 'field-is_official_member',
    member_record_at_nova_semente: 'field-member_record_at_nova_semente',
    member_record_church: 'field-member_record_church',
    has_previous_ministry_volunteer_experience: 'field-has_previous_ministry_volunteer_experience',
    previous_ministry_ids: 'field-previous_ministry_ids',
    is_active_in_ministry: 'field-is_active_in_ministry',
    active_ministry_ids: 'field-active_ministry_ids',
    wants_other_ministry: 'field-wants_other_ministry',
    other_ministry_ids: 'field-other_ministry_ids',
    lgpd_data_consent: 'field-lgpd_data_consent',
    current_password: 'field-current_password',
    password: 'field-password',
    password_confirmation: 'field-password_confirmation',
};

function scrollToFirstError(errors: Record<string, string>) {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;
    const targetId = FIELD_SCROLL_TARGETS[firstKey] ?? `field-${firstKey}`;
    window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

type BoolLike = boolean | null | string | number | undefined;

const SIGNUP_BOOL_FIELDS = [
    'has_whatsapp',
    'has_social_networks',
    'is_official_member',
    'member_record_at_nova_semente',
    'has_previous_ministry_volunteer_experience',
    'is_active_in_ministry',
    'wants_other_ministry',
    'lgpd_data_consent',
] as const;

function prepareSignupPayload(form: Record<string, unknown>, firstName: string, lastName: string): Record<string, unknown> {
    const out: Record<string, unknown> = { ...form, first_name: firstName, last_name: lastName };

    for (const field of SIGNUP_BOOL_FIELDS) {
        out[field] = normalizeSignupBool(out[field] as BoolLike);
    }

    if (!shouldAskVolunteerWhatsapp(String(out.phone ?? ''))) {
        out.has_whatsapp = false;
    }

    if (normalizeSignupBool(out.is_official_member as BoolLike) !== true) {
        delete out.member_record_at_nova_semente;
        delete out.member_record_church;
    }

    if (normalizeSignupBool(out.has_previous_ministry_volunteer_experience as BoolLike) !== true) {
        out.previous_ministry_ids = [];
    }

    if (normalizeSignupBool(out.is_active_in_ministry as BoolLike) !== true) {
        out.active_ministry_ids = [];
    }

    if (normalizeSignupBool(out.wants_other_ministry as BoolLike) !== true) {
        out.other_ministry_ids = [];
    }

    delete out.full_name;

    return out;
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
                className="h-full rounded-full bg-teal-600 transition-[width] duration-300 ease-out dark:bg-teal-500"
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

function Question({
    number,
    label,
    fieldKey,
    required = true,
    error,
    children,
}: {
    number: number;
    label: string;
    fieldKey?: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    const titleId = fieldKey ? `field-${fieldKey}` : `volunteer-q-${number}`;

    return (
        <section
            id={titleId}
            aria-labelledby={`${titleId}-heading`}
            className={[
                'scroll-mt-32 rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900/60 sm:scroll-mt-36 sm:p-5',
                error
                    ? 'border-red-400 ring-1 ring-red-400/40 dark:border-red-500/70 dark:ring-red-500/30'
                    : 'border-zinc-200/90 dark:border-zinc-700/80',
            ].join(' ')}
        >
            <h3 id={`${titleId}-heading`} className="mb-3 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                <span className="mr-1.5 tabular-nums text-zinc-500 dark:text-zinc-400">{number}.</span>
                {label}
                {required ? <span className="ml-0.5 text-red-600 dark:text-red-400">*</span> : null}
            </h3>
            <div className="space-y-2">{children}</div>
            {error ? <InputError message={error} className="mt-2" /> : null}
        </section>
    );
}

function YesNoRadio({
    name,
    value,
    onChange,
}: {
    name: string;
    value: BoolLike;
    onChange: (v: boolean) => void;
}) {
    const options = ['Não', 'Sim'] as const;
    const normalized = normalizeSignupBool(value);
    const selected = normalized === true ? 'Sim' : normalized === false ? 'Não' : '';

    return (
        <div className="space-y-1.5" role="radiogroup" aria-label={name}>
            {options.map((opt) => {
                const isSelected = selected === opt;
                return (
                    <button
                        key={`${name}-${opt}`}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onChange(opt === 'Sim')}
                        className={[
                            'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 sm:py-3',
                            isSelected
                                ? 'border-teal-500/80 bg-teal-50/90 ring-1 ring-teal-500/30 dark:border-teal-500/50 dark:bg-teal-950/40'
                                : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50',
                        ].join(' ')}
                    >
                        <span
                            className={[
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                isSelected ? 'border-teal-600 dark:border-teal-400' : 'border-zinc-300 dark:border-zinc-600',
                            ].join(' ')}
                            aria-hidden
                        >
                            {isSelected ? <span className="h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-400" /> : null}
                        </span>
                        <span className="text-zinc-800 dark:text-zinc-100">{opt}</span>
                    </button>
                );
            })}
        </div>
    );
}

function MinistryCheckboxList({
    ministries,
    selectedIds,
    onToggle,
    error,
    emptyMessage = 'Nenhum departamento disponível. Entre em contato com a secretaria.',
}: {
    ministries: Ministry[];
    selectedIds: number[];
    onToggle: (id: number) => void;
    error?: string;
    emptyMessage?: string;
}) {
    return (
        <div>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                {ministries.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
                ) : (
                    ministries.map((m) => (
                        <label key={m.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1">
                            <Checkbox checked={selectedIds.includes(m.id)} onChange={() => onToggle(m.id)} />
                            <span className="text-sm text-zinc-900 dark:text-white">{m.name}</span>
                        </label>
                    ))
                )}
            </div>
            {error ? <InputError message={error} className="mt-2" /> : null}
        </div>
    );
}

function FormNav({
    page,
    lastPageIndex,
    onBack,
    onAdvance,
    processing,
    advancing,
    submitLabel = 'Concluir cadastro',
}: {
    page: number;
    lastPageIndex: number;
    onBack: () => void;
    onAdvance: () => void | Promise<void>;
    processing: boolean;
    advancing: boolean;
    submitLabel?: string;
}) {
    const showAdvance = page < lastPageIndex;

    const handleAdvance = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        void onAdvance();
    };

    return (
        <div className="mt-8 border-t border-zinc-200/90 pt-5 dark:border-zinc-800">
            <div className="flex gap-3">
                {page > 0 ? (
                    <SecondaryButton type="button" className="min-w-[7rem] flex-1 sm:flex-none" onClick={onBack}>
                        Voltar
                    </SecondaryButton>
                ) : (
                    <div className="hidden flex-1 sm:block" />
                )}
                <PrimaryButton
                    type="button"
                    className={[
                        'flex-1 sm:min-w-[7rem] sm:flex-none',
                        showAdvance ? '' : 'pointer-events-none invisible absolute w-0 overflow-hidden p-0 opacity-0',
                    ].join(' ')}
                    onClick={handleAdvance}
                    disabled={advancing}
                    tabIndex={showAdvance ? 0 : -1}
                    aria-hidden={!showAdvance}
                >
                    {advancing ? 'Verificando…' : 'Avançar'}
                </PrimaryButton>
                <PrimaryButton
                    type="submit"
                    className={[
                        'flex-1 sm:min-w-[7rem] sm:flex-none',
                        showAdvance ? 'pointer-events-none invisible absolute w-0 overflow-hidden p-0 opacity-0' : '',
                    ].join(' ')}
                    disabled={processing || advancing || showAdvance}
                    tabIndex={showAdvance ? -1 : 0}
                    aria-hidden={showAdvance}
                >
                    {processing ? 'Salvando…' : submitLabel}
                </PrimaryButton>
            </div>
        </div>
    );
}

function buildFormDefaults(
    isEdit: boolean,
    token: string,
    initial: VolunteerSignupInitial | undefined,
    redirectAfterSave: string,
) {
    const draft = !isEdit ? readVolunteerSignupDraft(token) : null;
    const base = initial ?? {
        full_name: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        has_whatsapp: null,
        email: '',
        phone: '',
        has_social_networks: null,
        attendance_duration: '' as AttendanceDuration | '',
        is_official_member: null,
        member_record_at_nova_semente: null,
        member_record_church: '',
        has_previous_ministry_volunteer_experience: null,
        previous_ministry_ids: [],
        is_active_in_ministry: null,
        active_ministry_ids: [],
        wants_other_ministry: null,
        other_ministry_ids: [],
        gifts_to_develop: '',
        professional_area: '',
        lgpd_data_consent: null,
    };

    const merged = draft ? { ...base, ...draft } : base;

    return {
        token: isEdit ? '' : token,
        redirect_after_save: redirectAfterSave,
        photo_file: null as File | null,
        full_name: merged.full_name,
        first_name: merged.first_name,
        last_name: merged.last_name,
        birth_date: merged.birth_date,
        has_whatsapp: merged.has_whatsapp,
        email: merged.email,
        phone: merged.phone,
        has_social_networks: merged.has_social_networks,
        attendance_duration: merged.attendance_duration,
        is_official_member: merged.is_official_member,
        member_record_at_nova_semente: merged.member_record_at_nova_semente,
        member_record_church: merged.member_record_church,
        has_previous_ministry_volunteer_experience: merged.has_previous_ministry_volunteer_experience,
        previous_ministry_ids: merged.previous_ministry_ids ?? [],
        is_active_in_ministry: merged.is_active_in_ministry,
        active_ministry_ids: merged.active_ministry_ids ?? [],
        wants_other_ministry: merged.wants_other_ministry,
        other_ministry_ids: merged.other_ministry_ids ?? [],
        gifts_to_develop: merged.gifts_to_develop,
        professional_area: merged.professional_area,
        lgpd_data_consent: merged.lgpd_data_consent,
        current_password: '',
        password: '',
        password_confirmation: '',
    };
}

export default function PublicSignup({
    mode = 'signup',
    token = '',
    churchName,
    ministries,
    initial,
    cancelHref,
    redirectAfterSave = 'mobile.profile.edit',
    focusMissingOnly = false,
    missingFields: missingFieldsProp = [],
    signupCompletion,
}: Props) {
    const isEdit = mode === 'edit';
    const hasExistingPhoto = initial?.has_existing_photo === true;
    const backHref = cancelHref ?? (isEdit ? route('mobile.profile.edit') : route('more.index'));
    const missingFields = useMemo(() => missingFieldsProp ?? [], [missingFieldsProp]);
    const visiblePages = useMemo(
        () => (focusMissingOnly ? visiblePagesForMissingFields(missingFields) : [0, 1, 2, 3]),
        [focusMissingOnly, missingFields],
    );
    const lastVisiblePageIndex = Math.max(0, visiblePages.length - 1);

    const inertiaPage = usePage();
    const sharedErrors = (inertiaPage.props as { errors?: Record<string, string | string[] | undefined> }).errors;
    const flashError = (inertiaPage.props as { flash?: { error?: string | null } }).flash?.error;

    const formDefaults = useMemo(
        () => buildFormDefaults(isEdit, token, initial, redirectAfterSave),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- valores iniciais só na montagem
        [],
    );

    const { data, setData, post, put, processing, errors, reset, transform, clearErrors } = useForm(formDefaults);

    const showField = useCallback(
        (fieldKey: string) => isVolunteerSignupFieldVisible(fieldKey, focusMissingOnly, missingFields, data),
        [data, focusMissingOnly, missingFields],
    );

    const [pageSlot, setPageSlot] = useState(0);
    const page = visiblePages[pageSlot] ?? 0;
    const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photo_url ?? null);
    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [nameDuplicateHint, setNameDuplicateHint] = useState<string | null>(null);
    const [emailDuplicateHint, setEmailDuplicateHint] = useState<string | null>(null);
    const [phoneDuplicateHint, setPhoneDuplicateHint] = useState<string | null>(null);
    const checkDuplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const [stepBlocked, setStepBlocked] = useState(false);
    const [advancing, setAdvancing] = useState(false);
    const [showSubmitErrors, setShowSubmitErrors] = useState(() => {
        if (!sharedErrors) return false;
        return Object.keys(sharedErrors).some((key) => firstErrorMessage(sharedErrors, key));
    });

    const progress = useMemo(
        () => (visiblePages.length > 0 ? Math.round(((pageSlot + 1) / visiblePages.length) * 100) : 100),
        [pageSlot, visiblePages.length],
    );
    const maxBirthDate = useMemo(() => maxBirthDateForMinVolunteerAge(MIN_VOLUNTEER_SIGNUP_AGE), []);

    const serverErrorKeys = useMemo(() => {
        if (processing || !showSubmitErrors) return [];
        const keys = new Set<string>();
        for (const [key, value] of Object.entries(errors as Record<string, string | undefined>)) {
            if (value) keys.add(key);
        }
        if (sharedErrors) {
            for (const [key, value] of Object.entries(sharedErrors)) {
                const message = firstErrorMessage({ [key]: value }, key);
                if (message) keys.add(key);
            }
        }
        return [...keys];
    }, [errors, sharedErrors, processing, showSubmitErrors]);

    const dismissSubmitErrors = useCallback(() => {
        setShowSubmitErrors(false);
        clearErrors();
    }, [clearErrors]);

    const toggleIds = (field: 'previous_ministry_ids' | 'active_ministry_ids' | 'other_ministry_ids', id: number) => {
        const current = data[field];
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        setData(field, next);
        clearClientError(field);
    };

    useEffect(() => {
        if (isEdit || processing) return;
        writeVolunteerSignupDraft(data.token || token, data);
    }, [data, isEdit, processing, token]);

    const applyServerValidationErrors = useCallback(
        (propsErrors: Record<string, string | string[] | undefined> | Record<string, string>) => {
            const mapped = mapVolunteerSignupServerErrors(propsErrors);
            const keys = Object.keys(mapped);
            if (keys.length === 0) return;

            setShowSubmitErrors(true);
            setClientErrors(mapped);
            setStepBlocked(true);
            const errorPages = keys.map(resolveErrorPage);
            const firstErrorPage = Math.min(...errorPages);
            const slotForPage = visiblePages.indexOf(firstErrorPage);
            setPageSlot(slotForPage >= 0 ? slotForPage : 0);
            scrollToFirstError(mapped);
        },
        [visiblePages],
    );

    const runDuplicateCheck = useCallback(async () => {
        const parts = splitVolunteerFullName(data.full_name);
        const fn = parts?.first_name ?? data.first_name.trim();
        const ln = parts?.last_name ?? data.last_name.trim();
        try {
            const res = await axios.post<{
                duplicate: boolean;
                email_taken?: boolean;
                phone_taken?: boolean;
                message?: string | null;
                email_message?: string | null;
                phone_message?: string | null;
            }>(route('volunteers.self-signup.check-duplicate'), {
                token: data.token,
                first_name: fn,
                last_name: ln,
                email: data.email.trim(),
                phone: data.phone.trim(),
            });
            const nameHint = fn.length >= 1 && ln.length >= 1 && res.data.duplicate && res.data.message ? res.data.message : null;
            const emailHint = res.data.email_taken && res.data.email_message ? res.data.email_message : null;
            const phoneHint = res.data.phone_taken && res.data.phone_message ? res.data.phone_message : null;
            setNameDuplicateHint(nameHint);
            setEmailDuplicateHint(emailHint);
            setPhoneDuplicateHint(phoneHint);
            return { nameHint, emailHint, phoneHint };
        } catch {
            setNameDuplicateHint(null);
            setEmailDuplicateHint(null);
            setPhoneDuplicateHint(null);
            return { nameHint: null, emailHint: null, phoneHint: null };
        }
    }, [data.token, data.full_name, data.first_name, data.last_name, data.email, data.phone]);

    const scheduleDuplicateCheck = () => {
        if (checkDuplicateTimer.current) clearTimeout(checkDuplicateTimer.current);
        checkDuplicateTimer.current = setTimeout(() => void runDuplicateCheck(), 250);
    };

    const syncNameParts = (full: string) => {
        const parts = splitVolunteerFullName(full);
        setData('first_name', parts?.first_name ?? '');
        setData('last_name', parts?.last_name ?? '');
    };

    const onNameBlur = () => {
        syncNameParts(data.full_name);
        scheduleDuplicateCheck();
    };

    const clearClientError = (key: string) => {
        dismissSubmitErrors();
        setStepBlocked(false);
        setClientErrors((cur) => {
            if (!cur[key]) return cur;
            const next = { ...cur };
            delete next[key];
            return next;
        });
    };

    const handlePhotoFileChosen = async (raw: File | null) => {
        setPhotoClientError(null);
        clearClientError('photo_file');
        if (!raw) {
            setData('photo_file', null);
            setPhotoPreview(null);
            return;
        }
        setPhotoPreparing(true);
        try {
            const compressed = await compressImageForUpload(raw);
            setData('photo_file', compressed);
            setPhotoPreview(URL.createObjectURL(compressed));
        } catch (e) {
            const msg = e instanceof ImageCompressError ? e.message : 'Não foi possível preparar a foto.';
            setPhotoClientError(msg);
            setData('photo_file', null);
            setPhotoPreview(null);
        } finally {
            setPhotoPreparing(false);
        }
    };

    const handlePhotoClear = () => {
        setData('photo_file', null);
        setPhotoPreview(null);
        setPhotoClientError(null);
        clearClientError('photo_file');
    };

    const computePageErrors = useCallback(
        (
            p: number,
            duplicateHints: { nameHint: string | null; emailHint: string | null; phoneHint: string | null } = {
                nameHint: nameDuplicateHint,
                emailHint: emailDuplicateHint,
                phoneHint: phoneDuplicateHint,
            },
        ): Record<string, string> =>
            computeVolunteerSignupPageErrors({
                page: p,
                data,
                isEdit,
                hasExistingPhoto,
                focusMissingOnly,
                missingFields,
                duplicateHints,
            }),
        [data, hasExistingPhoto, isEdit, nameDuplicateHint, emailDuplicateHint, phoneDuplicateHint, focusMissingOnly, missingFields],
    );

    const applyPageValidation = useCallback(
        (p: number, duplicateHints?: { nameHint: string | null; emailHint: string | null; phoneHint: string | null }) => {
            const next = computePageErrors(p, duplicateHints);
            setClientErrors(next);
            const valid = Object.keys(next).length === 0;
            if (!valid) {
                setStepBlocked(true);
                scrollToFirstError(next);
            }
            return valid;
        },
        [computePageErrors],
    );

    const tryAdvancePage = async () => {
        if (advancing || processing) return;

        setAdvancing(true);
        try {
            if (page === 0) {
                syncNameParts(data.full_name);
            }

            const duplicateHints = page === 0 && !isEdit ? await runDuplicateCheck() : undefined;
            if (!applyPageValidation(page, duplicateHints)) return;

            setClientErrors({});
            setStepBlocked(false);
            dismissSubmitErrors();
            setPageSlot((current) => Math.min(lastVisiblePageIndex, current + 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setAdvancing(false);
        }
    };

    const goBack = () => {
        setStepBlocked(false);
        setClientErrors({});
        setPageSlot((current) => Math.max(0, current - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitForm = async () => {
        syncNameParts(data.full_name);
        const duplicateHints = isEdit ? { nameHint: null, emailHint: null, phoneHint: null } : await runDuplicateCheck();

        for (let slot = 0; slot <= lastVisiblePageIndex; slot += 1) {
            const pageToValidate = visiblePages[slot] ?? 0;
            const pageErrors = computePageErrors(pageToValidate, duplicateHints);
            if (Object.keys(pageErrors).length > 0) {
                setClientErrors(pageErrors);
                setStepBlocked(true);
                setPageSlot(slot);
                scrollToFirstError(pageErrors);
                return;
            }
        }

        const parts = splitVolunteerFullName(data.full_name);
        if (!parts) {
            setClientErrors({ full_name: 'Informe o nome completo.' });
            setPageSlot(0);
            setStepBlocked(true);
            return;
        }

        setStepBlocked(false);
        setShowSubmitErrors(false);
        clearErrors();

        transform((form) => {
            let prepared = prepareSignupPayload(form as Record<string, unknown>, parts.first_name, parts.last_name);
            if (isEdit) {
                delete prepared.token;
                if (!String(prepared.password ?? '').trim()) {
                    delete prepared.current_password;
                    delete prepared.password;
                    delete prepared.password_confirmation;
                }
            }
            if (focusMissingOnly && initial) {
                prepared = mergeVolunteerSignupWithInitial(prepared, initial, missingFields);
            }
            return prepared;
        });

        const submitOptions = {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onError: (serverErrors: Record<string, string>) => {
                applyServerValidationErrors(serverErrors);
            },
            onSuccess: () => {
                if (!isEdit) {
                    clearVolunteerSignupDraft(data.token || token);
                }
            },
        };

        if (isEdit) {
            put(route('volunteers.self-signup.edit.update'), submitOptions);
        } else {
            post(route('volunteers.self-signup.store'), submitOptions);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        void submitForm();
    };

    const err = (key: string) => {
        if (clientErrors[key]) return clientErrors[key];
        if (!showSubmitErrors || processing) return undefined;
        const formMessage = (errors as Record<string, string | undefined>)[key];
        if (formMessage) return formMessage;
        return firstErrorMessage(sharedErrors, key);
    };

    const hasVisibleServerErrors = serverErrorKeys.length > 0;
    const hasStepErrors = stepBlocked && Object.keys(clientErrors).length > 0;

    let questionNumber = 0;

    return (
        <MobileLayout>
            <Head title={isEdit ? `Cadastro de voluntário — ${churchName}` : `Cadastro Voluntário — ${churchName}`} />

            <div className="mx-auto w-full max-w-3xl px-1 sm:px-0">
                <header className="mb-5">
                    <Link
                        href={backHref}
                        className="mb-4 inline-flex text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                    >
                        Voltar
                    </Link>
                    <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 shadow-sm dark:bg-teal-500">
                            <UserPlusIcon className="size-6 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                                {focusMissingOnly
                                    ? 'Completar cadastro de voluntário'
                                    : isEdit
                                      ? 'Atualizar cadastro de voluntário'
                                      : 'Cadastro voluntário'}
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{churchName}</p>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                {focusMissingOnly ? (
                                    <>
                                        {missingFields.length === 1
                                            ? 'Falta responder 1 item para concluir seu cadastro.'
                                            : `Faltam ${signupCompletion?.missing_count ?? missingFields.length} perguntas para concluir seu cadastro.`}{' '}
                                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                            Pendente: {describeMissingVolunteerSignupFields(missingFields)}.
                                        </span>{' '}
                                        A senha não faz parte deste questionário — para trocá-la, use Editar perfil.
                                    </>
                                ) : isEdit ? (
                                    'Complete ou corrija suas informações de voluntário. Os dados ajudam a equipe a conhecê-lo melhor e encaminhar oportunidades de serviço.'
                                ) : (
                                    'Preencha seus dados para informar seu interesse em ser voluntário da Nova Semente.'
                                )}
                            </p>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        <span className="font-semibold">*</span> Obrigatória
                    </p>
                </header>

                {flashError ? (
                    <div
                        className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                        role="alert"
                    >
                        {flashError}
                    </div>
                ) : null}

                {hasStepErrors ? (
                    <div
                        className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
                        role="alert"
                    >
                        Preencha todos os campos obrigatórios desta etapa antes de continuar.
                    </div>
                ) : null}

                {hasVisibleServerErrors ? (
                    <div
                        className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
                        role="alert"
                    >
                        Não foi possível concluir o envio. Verifique os campos destacados
                        {pageSlot !== lastVisiblePageIndex ? ' na etapa indicada' : ''} e tente novamente.
                    </div>
                ) : null}

                <form
                    onSubmit={submit}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                        if (pageSlot < lastVisiblePageIndex) {
                            e.preventDefault();
                            void tryAdvancePage();
                        }
                    }}
                    className="space-y-4 sm:space-y-5"
                >
                    <div className="rounded-2xl border border-zinc-200/90 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
                                    Etapa {pageSlot + 1} de {visiblePages.length}
                                </p>
                                <p className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">{PAGE_TITLES[page]}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setClientErrors({});
                                    setStepBlocked(false);
                                    setShowSubmitErrors(false);
                                    clearErrors();
                                    setNameDuplicateHint(null);
                                    setEmailDuplicateHint(null);
                                    setPhoneDuplicateHint(null);
                                    setPageSlot(0);
                                    setPhotoPreview(initial?.photo_url ?? null);
                                    if (!isEdit) {
                                        clearVolunteerSignupDraft(data.token || token);
                                    }
                                    reset();
                                }}
                                className="text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
                            >
                                {isEdit ? 'Restaurar' : 'Limpar'}
                            </button>
                        </div>
                        <ProgressBar value={progress} />
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        {page === 0 ? (
                            <>
                                {showField('photo_file') ? (
                                <section
                                    id="volunteer-photo"
                                    className={[
                                        'scroll-mt-32 rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900/60 sm:scroll-mt-36 sm:p-5',
                                        err('photo_file')
                                            ? 'border-red-400 ring-1 ring-red-400/40 dark:border-red-500/70 dark:ring-red-500/30'
                                            : 'border-zinc-200/90 dark:border-zinc-700/80',
                                    ].join(' ')}
                                >
                                    <h3 className="mb-3 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                                        Foto
                                        {!(isEdit && hasExistingPhoto) ? (
                                            <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
                                        ) : null}
                                    </h3>
                                    <ProfilePhotoPicker
                                        previewUrl={photoPreview}
                                        photoPreparing={photoPreparing}
                                        clientError={photoClientError ?? err('photo_file') ?? null}
                                        serverPhotoError={errors.photo_file}
                                        inputId="volunteer_photo"
                                        required={!(isEdit && hasExistingPhoto)}
                                        onPhotoFile={handlePhotoFileChosen}
                                        onClear={handlePhotoClear}
                                    />
                                </section>
                                ) : null}
                                {showField('full_name') ? (
                                <Question
                                    fieldKey="full_name"
                                    number={++questionNumber}
                                    label="Nome completo"
                                    error={err('full_name') || err('first_name') || err('last_name')}
                                >
                                    <TextInput
                                        className="w-full"
                                        value={data.full_name}
                                        autoComplete="name"
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setData('full_name', v);
                                            syncNameParts(v);
                                            setNameDuplicateHint(null);
                                            clearClientError('full_name');
                                        }}
                                        onBlur={onNameBlur}
                                    />
                                </Question>
                                ) : null}
                                {showField('birth_date') ? (
                                <Question fieldKey="birth_date" number={++questionNumber} label="Data de nascimento" error={err('birth_date')}>
                                    <TextInput
                                        type="date"
                                        className="w-full max-w-xs"
                                        value={data.birth_date}
                                        max={maxBirthDate}
                                        onChange={(e) => {
                                            setData('birth_date', e.target.value);
                                            clearClientError('birth_date');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {!focusMissingOnly ? (
                                <Question fieldKey="phone" number={++questionNumber} label="Telefone (WhatsApp)" required={false} error={err('phone')}>
                                    <TextInput
                                        type="tel"
                                        className="w-full"
                                        placeholder="(11) 99999-9999"
                                        value={data.phone}
                                        autoComplete="tel"
                                        inputMode="tel"
                                        onChange={(e) => {
                                            const nextPhone = e.target.value;
                                            setData((d) => ({
                                                ...d,
                                                phone: nextPhone,
                                                has_whatsapp: shouldAskVolunteerWhatsapp(nextPhone) ? d.has_whatsapp : null,
                                            }));
                                            setPhoneDuplicateHint(null);
                                            clearClientError('phone');
                                            if (!shouldAskVolunteerWhatsapp(nextPhone)) {
                                                clearClientError('has_whatsapp');
                                            }
                                        }}
                                        onBlur={scheduleDuplicateCheck}
                                    />
                                </Question>
                                ) : null}
                                {(focusMissingOnly ? showField('has_whatsapp') : shouldAskVolunteerWhatsapp(data.phone)) ? (
                                <Question fieldKey="has_whatsapp" number={++questionNumber} label="Este número tem WhatsApp?" error={err('has_whatsapp')}>
                                    <YesNoRadio
                                        name="has_whatsapp"
                                        value={data.has_whatsapp}
                                        onChange={(v) => {
                                            setData('has_whatsapp', v);
                                            clearClientError('has_whatsapp');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('email') ? (
                                <Question fieldKey="email" number={++questionNumber} label="E-mail" error={err('email')}>
                                    <TextInput
                                        type="email"
                                        className="w-full"
                                        value={data.email}
                                        autoComplete="email"
                                        onChange={(e) => {
                                            setData('email', e.target.value);
                                            setEmailDuplicateHint(null);
                                            clearClientError('email');
                                        }}
                                        onBlur={scheduleDuplicateCheck}
                                    />
                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        {isEdit
                                            ? 'Este e-mail é usado para entrar no aplicativo.'
                                            : 'Use o mesmo e-mail para entrar no aplicativo após o cadastro.'}
                                    </p>
                                </Question>
                                ) : null}
                                {!focusMissingOnly ? (
                                    <>
                                        {isEdit ? (
                                            <Question
                                                fieldKey="current_password"
                                                number={++questionNumber}
                                                label="Senha atual"
                                                required={false}
                                                error={err('current_password')}
                                            >
                                                <PasswordInput
                                                    className="w-full max-w-md"
                                                    value={data.current_password}
                                                    autoComplete="current-password"
                                                    onChange={(e) => {
                                                        setData('current_password', e.target.value);
                                                        clearClientError('current_password');
                                                    }}
                                                />
                                                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                    Preencha somente se quiser trocar a senha. Use o olho para ver o que está digitando.
                                                </p>
                                            </Question>
                                        ) : null}
                                        <Question
                                            fieldKey="password"
                                            number={++questionNumber}
                                            label={isEdit ? 'Nova senha' : 'Senha'}
                                            required={!isEdit}
                                            error={err('password')}
                                        >
                                            <PasswordInput
                                                className="w-full max-w-md"
                                                value={data.password}
                                                autoComplete="new-password"
                                                onChange={(e) => {
                                                    setData('password', e.target.value);
                                                    clearClientError('password');
                                                }}
                                            />
                                        </Question>
                                        <Question
                                            fieldKey="password_confirmation"
                                            number={++questionNumber}
                                            label={isEdit ? 'Confirmar nova senha' : 'Confirmar senha'}
                                            required={!isEdit}
                                            error={err('password_confirmation')}
                                        >
                                            <PasswordInput
                                                className="w-full max-w-md"
                                                value={data.password_confirmation}
                                                autoComplete="new-password"
                                                onChange={(e) => {
                                                    setData('password_confirmation', e.target.value);
                                                    clearClientError('password_confirmation');
                                                }}
                                            />
                                        </Question>
                                    </>
                                ) : null}
                                {showField('has_social_networks') ? (
                                <Question
                                    fieldKey="has_social_networks"
                                    number={++questionNumber}
                                    label="Redes sociais (Instagram, Facebook ou TikTok)"
                                    error={err('has_social_networks')}
                                >
                                    <YesNoRadio
                                        name="has_social_networks"
                                        value={data.has_social_networks}
                                        onChange={(v) => {
                                            setData('has_social_networks', v);
                                            clearClientError('has_social_networks');
                                        }}
                                    />
                                </Question>
                                ) : null}
                            </>
                        ) : null}

                        {page === 1 ? (
                            <>
                                {showField('attendance_duration') ? (
                                <Question fieldKey="attendance_duration" number={++questionNumber} label="Há quanto tempo você frequenta a Nova Semente?" error={err('attendance_duration')}>
                                    <div className="space-y-1.5" role="radiogroup">
                                        {ATTENDANCE_OPTIONS.map((opt) => {
                                            const selected = data.attendance_duration === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={selected}
                                                    onClick={() => {
                                                        setData('attendance_duration', opt.value);
                                                        clearClientError('attendance_duration');
                                                    }}
                                                    className={[
                                                        'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 sm:py-3',
                                                        selected
                                                            ? 'border-teal-500/80 bg-teal-50/90 ring-1 ring-teal-500/30 dark:border-teal-500/50 dark:bg-teal-950/40'
                                                            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50',
                                                    ].join(' ')}
                                                >
                                                    <span
                                                        className={[
                                                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                                            selected ? 'border-teal-600 dark:border-teal-400' : 'border-zinc-300 dark:border-zinc-600',
                                                        ].join(' ')}
                                                        aria-hidden
                                                    >
                                                        {selected ? (
                                                            <span className="h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                                                        ) : null}
                                                    </span>
                                                    <span className="text-zinc-800 dark:text-zinc-100">{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Question>
                                ) : null}
                                {showField('is_official_member') ? (
                                <Question fieldKey="is_official_member" number={++questionNumber} label="Você é membro oficial da igreja adventista?" error={err('is_official_member')}>
                                    <YesNoRadio
                                        name="is_official_member"
                                        value={data.is_official_member}
                                        onChange={(v) => {
                                            setData((d) => ({
                                                ...d,
                                                is_official_member: v,
                                                member_record_at_nova_semente: null,
                                                member_record_church: '',
                                            }));
                                            clearClientError('is_official_member');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {(focusMissingOnly
                                    ? showField('member_record_at_nova_semente') || showField('member_record_church')
                                    : normalizeSignupBool(data.is_official_member) === true) ? (
                                    <>
                                        {showField('member_record_at_nova_semente') ? (
                                        <Question
                                            fieldKey="member_record_at_nova_semente"
                                            number={++questionNumber}
                                            label="Seu registro de membro está na Nova Semente?"
                                            error={err('member_record_at_nova_semente')}
                                        >
                                            <YesNoRadio
                                                name="member_record_at_nova_semente"
                                                value={data.member_record_at_nova_semente}
                                                onChange={(v) => {
                                                    setData((d) => ({
                                                        ...d,
                                                        member_record_at_nova_semente: v,
                                                        member_record_church: v ? '' : d.member_record_church,
                                                    }));
                                                    clearClientError('member_record_at_nova_semente');
                                                }}
                                            />
                                        </Question>
                                        ) : null}
                                        {(focusMissingOnly
                                            ? showField('member_record_church')
                                            : normalizeSignupBool(data.member_record_at_nova_semente) === false) ? (
                                            <Question
                                                fieldKey="member_record_church"
                                                number={++questionNumber}
                                                label="Se não estiver, em qual igreja está?"
                                                error={err('member_record_church')}
                                            >
                                                <TextInput
                                                    className="w-full"
                                                    value={data.member_record_church}
                                                    onChange={(e) => {
                                                        setData('member_record_church', e.target.value);
                                                        clearClientError('member_record_church');
                                                    }}
                                                />
                                            </Question>
                                        ) : null}
                                    </>
                                ) : null}
                            </>
                        ) : null}

                        {page === 2 ? (
                            <>
                                {showField('has_previous_ministry_volunteer_experience') ? (
                                <Question
                                    fieldKey="has_previous_ministry_volunteer_experience"
                                    number={++questionNumber}
                                    label="Você já foi voluntário em algum ministério da igreja?"
                                    error={err('has_previous_ministry_volunteer_experience')}
                                >
                                    <YesNoRadio
                                        name="has_previous_ministry_volunteer_experience"
                                        value={data.has_previous_ministry_volunteer_experience}
                                        onChange={(v) => {
                                            setData((d) => ({
                                                ...d,
                                                has_previous_ministry_volunteer_experience: v,
                                                previous_ministry_ids: v ? d.previous_ministry_ids : [],
                                            }));
                                            clearClientError('has_previous_ministry_volunteer_experience');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {(focusMissingOnly
                                    ? showField('previous_ministry_ids')
                                    : normalizeSignupBool(data.has_previous_ministry_volunteer_experience) === true) ? (
                                    <Question
                                        fieldKey="previous_ministry_ids"
                                        number={++questionNumber}
                                        label="Se sim, quais? Em quais ministérios já serviu?"
                                        error={err('previous_ministry_ids')}
                                    >
                                        <MinistryCheckboxList
                                            ministries={ministries}
                                            selectedIds={data.previous_ministry_ids}
                                            onToggle={(id) => toggleIds('previous_ministry_ids', id)}
                                        />
                                    </Question>
                                ) : null}
                            </>
                        ) : null}

                        {page === 3 ? (
                            <>
                                {showField('is_active_in_ministry') ? (
                                <Question
                                    fieldKey="is_active_in_ministry"
                                    number={++questionNumber}
                                    label="Você é atuante de algum ministério da Nova Semente?"
                                    error={err('is_active_in_ministry')}
                                >
                                    <YesNoRadio
                                        name="is_active_in_ministry"
                                        value={data.is_active_in_ministry}
                                        onChange={(v) => {
                                            setData((d) => ({
                                                ...d,
                                                is_active_in_ministry: v,
                                                active_ministry_ids: v ? d.active_ministry_ids : [],
                                            }));
                                            clearClientError('is_active_in_ministry');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {(focusMissingOnly
                                    ? showField('active_ministry_ids')
                                    : normalizeSignupBool(data.is_active_in_ministry) === true) ? (
                                    <Question fieldKey="active_ministry_ids" number={++questionNumber} label="Selecione os ministérios" error={err('active_ministry_ids')}>
                                        <MinistryCheckboxList
                                            ministries={ministries}
                                            selectedIds={data.active_ministry_ids}
                                            onToggle={(id) => toggleIds('active_ministry_ids', id)}
                                        />
                                    </Question>
                                ) : null}
                                {showField('wants_other_ministry') ? (
                                <Question
                                    fieldKey="wants_other_ministry"
                                    number={++questionNumber}
                                    label="Gostaria de servir em outro ministério?"
                                    error={err('wants_other_ministry')}
                                >
                                    <YesNoRadio
                                        name="wants_other_ministry"
                                        value={data.wants_other_ministry}
                                        onChange={(v) => {
                                            setData((d) => ({
                                                ...d,
                                                wants_other_ministry: v,
                                                other_ministry_ids: v ? d.other_ministry_ids : [],
                                            }));
                                            clearClientError('wants_other_ministry');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {(focusMissingOnly
                                    ? showField('other_ministry_ids')
                                    : normalizeSignupBool(data.wants_other_ministry) === true) ? (
                                    <Question fieldKey="other_ministry_ids" number={++questionNumber} label="Se sim, qual?" error={err('other_ministry_ids')}>
                                        <MinistryCheckboxList
                                            ministries={ministries}
                                            selectedIds={data.other_ministry_ids}
                                            onToggle={(id) => toggleIds('other_ministry_ids', id)}
                                        />
                                    </Question>
                                ) : null}
                                {!focusMissingOnly ? (
                                <Question
                                    number={++questionNumber}
                                    label="Quais dons ou habilidades você gostaria de desenvolver no servir?"
                                    required={false}
                                    error={err('gifts_to_develop')}
                                >
                                    <TextInput
                                        className="w-full"
                                        value={data.gifts_to_develop}
                                        onChange={(e) => setData('gifts_to_develop', e.target.value)}
                                    />
                                </Question>
                                ) : null}
                                {!focusMissingOnly ? (
                                <Question
                                    number={++questionNumber}
                                    label="Qual sua área de atuação profissional?"
                                    required={false}
                                    error={err('professional_area')}
                                >
                                    <TextInput
                                        className="w-full"
                                        value={data.professional_area}
                                        onChange={(e) => setData('professional_area', e.target.value)}
                                    />
                                </Question>
                                ) : null}
                                {showField('lgpd_data_consent') ? (
                                <Question fieldKey="lgpd_data_consent" number={++questionNumber} label="Consentimento para uso de dados" error={err('lgpd_data_consent')}>
                                    <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        Declaro que as informações fornecidas são verdadeiras e autorizo o uso dos meus dados pela Igreja
                                        Adventista Nova Semente exclusivamente para fins de organização do voluntariado e cuidado pastoral,
                                        conforme a LGPD.
                                    </p>
                                    <YesNoRadio
                                        name="lgpd_data_consent"
                                        value={data.lgpd_data_consent}
                                        onChange={(v) => {
                                            setData('lgpd_data_consent', v);
                                            clearClientError('lgpd_data_consent');
                                        }}
                                    />
                                </Question>
                                ) : null}
                            </>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {!isEdit ? (
                            <Link
                                href={route('login')}
                                className="text-center text-sm text-zinc-600 underline underline-offset-2 decoration-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 sm:text-left"
                            >
                                Já tem conta? Entrar
                            </Link>
                        ) : (
                            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 sm:text-left">
                                Alterações em departamentos em que você já serve oficialmente podem exigir confirmação de um líder.
                            </p>
                        )}
                        <FormNav
                            page={pageSlot}
                            lastPageIndex={lastVisiblePageIndex}
                            onBack={goBack}
                            onAdvance={tryAdvancePage}
                            processing={processing}
                            advancing={advancing}
                            submitLabel={focusMissingOnly ? 'Salvar respostas' : isEdit ? 'Salvar cadastro' : 'Concluir cadastro'}
                        />
                    </div>
                </form>

                <footer className="mt-10 hidden pb-6 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                    <div className="flex flex-col items-center gap-2">
                        <span>Nova Semente — Voluntariado</span>
                        <div className="flex items-center gap-3">
                            <Link href={route('more.index')} className="underline">
                                Início
                            </Link>
                            <span className="opacity-40" aria-hidden>
                                ·
                            </span>
                            <Link href={route('mobile.home')} className="underline">
                                App
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </MobileLayout>
    );
}
