import Checkbox from '@/Components/Checkbox';
import VolunteerSignupMultiCheckboxField from '@/Components/Volunteers/VolunteerSignupMultiCheckboxField';
import InputError from '@/Components/InputError';
import ProfilePhotoPicker from '@/Components/ProfilePhotoPicker';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PasswordInput from '@/Components/PasswordInput';
import BrDateInput from '@/Components/BrDateInput';
import TextInput from '@/Components/TextInput';
import MobileLayout from '@/Layouts/MobileLayout';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import {
    clearPhotoPickPending,
    markPhotoPickStarted,
    revokeBlobPreviewUrl,
    shouldWarnPhotoPickReload,
} from '@/utils/mobilePhotoPick';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import {
    buildVolunteerSignupCompletionInput,
    computeVolunteerSignupCompletion,
    firstVolunteerSignupErrorKey,
    isVolunteerSignupFieldVisible,
    mergeVolunteerSignupWithInitial,
    resolveVolunteerSignupFieldPage,
    resolveVolunteerSignupInitialPageSlot,
    visiblePagesForMissingFields,
    volunteerSignupErrorsForMissingFields,
    volunteerSignupFormPatchFromInitialFields,
    writeVolunteerSignupStoredPage,
} from '@/utils/volunteerSignupCompletion';
import {
    clearVolunteerSignupDraft,
    computeVolunteerSignupPageErrors,
    draftPhotoPreviewToFile,
    fileToDraftPhotoPreview,
    mapVolunteerSignupServerErrors,
    normalizeSignupBool,
    readVolunteerSignupDraft,
    readVolunteerSignupDraftState,
    shouldAskVolunteerWhatsapp,
    splitVolunteerFullName,
    volunteerSignupDraftHasAnswers,
    writeVolunteerSignupDraft,
    MIN_VOLUNTEER_SIGNUP_AGE,
    maxBirthDateForMinVolunteerAge,
} from '@/utils/volunteerSignupPageValidation';
import {
    collectVolunteerSignupAutosaveFields,
    fieldTriggersImmediateAutosave,
    isVolunteerSignupFieldAnswered,
    postVolunteerSignupAutosave,
    VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS,
    volunteerSignupFieldIsMultiSelect,
    volunteerSignupMultiSelectDiffersOnPage,
    type VolunteerSignupAutosaveResponse,
} from '@/utils/volunteerSignupAutosave';
import {
    ATTENDANCE_DURATION_OPTIONS,
    SERVICE_ACTIVITY_TYPE_OPTIONS,
    SERVICE_EASE_AREA_OPTIONS,
    VOLUNTEER_PHASE_OPTIONS,
    type AttendanceDuration,
    type VolunteerPhase,
} from '@/utils/volunteerSignupOptions';
import {
    buildVolunteerSignupQuestionNumbers,
    questionRangeForPage,
} from '@/utils/volunteerSignupQuestionNumbers';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { UserPlusIcon } from '@heroicons/react/24/outline';
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
    social_network_profiles: string;
    professional_area: string;
    attendance_duration: AttendanceDuration | '';
    is_official_member: boolean | null;
    volunteer_phase: VolunteerPhase | '';
    desired_ministry_ids: number[];
    service_ease_areas: string[];
    comfortable_with_digital_tools: boolean | null;
    service_activity_types: string[];
    service_greatest_strength: string;
    service_greatest_challenge: string;
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
    /** Etapa lógica do questionário (0–2) vinda de `?etapa=` após salvar. */
    resumePage?: number | null;
    /** Aviso fixo: usuário já tem cadastro e está em modo de atualização. */
    existingRegistrationNotice?: boolean;
    /** E-mail confirmado na etapa de identificação (novo cadastro). */
    prefillEmail?: string | null;
    /** Pré-cadastro da equipe sem conta no app — conclui acesso sem criar outro voluntário. */
    completingPreRegistration?: boolean;
}

const PAGE_TITLES = ['Dados pessoais', 'Nova Semente', 'Sobre o serviço'];

const SIGNUP_COMPLETE_SUBMIT_HINT = 'Cadastro completo. Toque em Concluir cadastro para finalizar.';

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
    social_network_profiles: 'field-social_network_profiles',
    professional_area: 'field-professional_area',
    attendance_duration: 'field-attendance_duration',
    is_official_member: 'field-is_official_member',
    volunteer_phase: 'field-volunteer_phase',
    desired_ministry_ids: 'field-desired_ministry_ids',
    service_ease_areas: 'field-service_ease_areas',
    comfortable_with_digital_tools: 'field-comfortable_with_digital_tools',
    service_activity_types: 'field-service_activity_types',
    service_greatest_strength: 'field-service_greatest_strength',
    service_greatest_challenge: 'field-service_greatest_challenge',
    lgpd_data_consent: 'field-lgpd_data_consent',
    password: 'field-password',
    password_confirmation: 'field-password_confirmation',
};

function toggleVolunteerMinistryId(current: number[], id: number): number[] {
    const numericId = Number(id);
    const normalized = current.map((value) => Number(value)).filter((value) => value > 0);
    if (!Number.isFinite(numericId) || numericId <= 0) {
        return normalized;
    }

    return normalized.includes(numericId)
        ? normalized.filter((value) => value !== numericId)
        : [...normalized, numericId];
}

function scrollToFirstError(errors: Record<string, string>) {
    const firstKey = firstVolunteerSignupErrorKey(errors);
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
    'comfortable_with_digital_tools',
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

    if (normalizeSignupBool(out.has_social_networks as BoolLike) !== true) {
        out.social_network_profiles = '';
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
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onChange(opt === 'Sim');
                        }}
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
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                Marque todas as opções que se aplicam. As respostas são salvas ao tocar em Continuar.
            </p>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                {ministries.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
                ) : (
                    ministries.map((m) => (
                        <label key={m.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1">
                            <Checkbox
                                checked={selectedIds.some((selectedId) => Number(selectedId) === Number(m.id))}
                                onChange={() => onToggle(m.id)}
                            />
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
    autosaving = false,
    submitLabel = 'Concluir cadastro',
}: {
    page: number;
    lastPageIndex: number;
    onBack: () => void;
    onAdvance: () => void | Promise<void>;
    processing: boolean;
    advancing: boolean;
    /** Autosave em curso — evita toque acidental em Continuar/Concluir durante «Salvando resposta…». */
    autosaving?: boolean;
    submitLabel?: string;
}) {
    const showAdvance = page < lastPageIndex;
    const busy = processing || advancing || autosaving;

    const handleAdvance = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        void onAdvance();
    };

    return (
        <div className="relative sticky bottom-0 z-20 -mx-1 mt-8 border-t border-zinc-200/90 bg-white/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95 sm:mx-0 sm:px-0">
            <div className="flex gap-3">
                {page > 0 ? (
                    <SecondaryButton type="button" className="min-w-[7rem] flex-1 sm:flex-none" onClick={onBack} disabled={busy}>
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
                    disabled={busy}
                    tabIndex={showAdvance ? 0 : -1}
                    aria-hidden={!showAdvance}
                >
                    {advancing ? 'Verificando…' : autosaving ? 'Salvando…' : 'Avançar'}
                </PrimaryButton>
                <PrimaryButton
                    type="submit"
                    className={[
                        'flex-1 sm:min-w-[7rem] sm:flex-none',
                        showAdvance ? 'pointer-events-none invisible absolute w-0 overflow-hidden p-0 opacity-0' : '',
                    ].join(' ')}
                    disabled={busy || showAdvance}
                    tabIndex={showAdvance ? -1 : 0}
                    aria-hidden={showAdvance}
                >
                    {processing || autosaving ? 'Salvando…' : submitLabel}
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
    draftFields: ReturnType<typeof readVolunteerSignupDraft> | null,
    prefillEmail?: string | null,
) {
    const draft = !isEdit ? draftFields : null;
    const base = initial ?? {
        full_name: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        has_whatsapp: null,
        email: '',
        phone: '',
        has_social_networks: null,
        social_network_profiles: '',
        professional_area: '',
        attendance_duration: '' as AttendanceDuration | '',
        is_official_member: null,
        volunteer_phase: '' as VolunteerPhase | '',
        desired_ministry_ids: [] as number[],
        service_ease_areas: [] as string[],
        comfortable_with_digital_tools: null,
        service_activity_types: [] as string[],
        service_greatest_strength: '',
        service_greatest_challenge: '',
        lgpd_data_consent: null,
    };

    const merged = draft ? { ...base, ...draft } : base;
    const draftEmail = typeof merged.email === 'string' ? merged.email.trim() : '';
    const identifiedEmail = typeof prefillEmail === 'string' ? prefillEmail.trim() : '';
    const email = draftEmail !== '' ? draftEmail : identifiedEmail;

    return {
        token: isEdit ? '' : token,
        redirect_after_save: redirectAfterSave,
        photo_file: null as File | null,
        full_name: merged.full_name,
        first_name: merged.first_name,
        last_name: merged.last_name,
        birth_date: merged.birth_date,
        has_whatsapp: merged.has_whatsapp,
        email,
        phone: merged.phone,
        has_social_networks: merged.has_social_networks,
        social_network_profiles: merged.social_network_profiles,
        professional_area: merged.professional_area,
        attendance_duration: merged.attendance_duration,
        is_official_member: merged.is_official_member,
        volunteer_phase: merged.volunteer_phase,
        desired_ministry_ids: merged.desired_ministry_ids ?? [],
        service_ease_areas: merged.service_ease_areas ?? [],
        comfortable_with_digital_tools: merged.comfortable_with_digital_tools,
        service_activity_types: merged.service_activity_types ?? [],
        service_greatest_strength: merged.service_greatest_strength,
        service_greatest_challenge: merged.service_greatest_challenge,
        lgpd_data_consent: merged.lgpd_data_consent,
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
    redirectAfterSave = 'mobile.home',
    focusMissingOnly = false,
    missingFields: missingFieldsProp = [],
    signupCompletion,
    resumePage = null,
    existingRegistrationNotice = false,
    prefillEmail = null,
    completingPreRegistration = false,
}: Props) {
    const isEdit = mode === 'edit';
    const signupToken = token || '';
    const guestDraftState = useMemo(
        () => (isEdit ? null : readVolunteerSignupDraftState(signupToken)),
        [isEdit, signupToken],
    );
    const hasExistingPhoto = initial?.has_existing_photo === true;
    const backHref = cancelHref ?? (isEdit ? route('mobile.profile.edit') : route('volunteers.self-signup', { token: signupToken }));
    const savedInitialRef = useRef(initial);
    const [liveMissingFields, setLiveMissingFields] = useState<string[]>(missingFieldsProp ?? []);
    const [pinnedMultiSelectFields, setPinnedMultiSelectFields] = useState<string[]>([]);
    const [liveSignupCompletion, setLiveSignupCompletion] = useState(signupCompletion);
    const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [autosaveMessage, setAutosaveMessage] = useState<string | null>(null);
    const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autosaveInFlightRef = useRef(false);
    const autosaveInFlightPromiseRef = useRef<Promise<boolean> | null>(null);
    const pendingSubmitAfterAutosaveRef = useRef(false);
    const submitFormRef = useRef<(() => void | Promise<void>) | null>(null);
    const [pendingNavigateField, setPendingNavigateField] = useState<string | null>(null);

    const queueNavigateToField = useCallback((fieldKey: string) => {
        setPendingNavigateField(fieldKey);
    }, []);

    useEffect(() => {
        savedInitialRef.current = initial;
    }, [initial]);

    useEffect(() => {
        setLiveMissingFields(missingFieldsProp ?? []);
        setLiveSignupCompletion(signupCompletion);
    }, [missingFieldsProp, signupCompletion]);

    const missingFields = liveMissingFields;
    const visiblePages = useMemo(
        () => (focusMissingOnly ? visiblePagesForMissingFields(missingFields) : [0, 1, 2]),
        [focusMissingOnly, missingFields],
    );
    const lastVisiblePageIndex = Math.max(0, visiblePages.length - 1);

    const inertiaPage = usePage();
    const sharedErrors = (inertiaPage.props as { errors?: Record<string, string | string[] | undefined> }).errors;
    const flashError = (inertiaPage.props as { flash?: { error?: string | null } }).flash?.error;

    const formDefaults = useMemo(
        () =>
            buildFormDefaults(
                isEdit,
                signupToken,
                initial,
                redirectAfterSave,
                guestDraftState?.fields ?? null,
                prefillEmail,
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- valores iniciais só na montagem
        [],
    );

    const { data, setData, post, put, processing, errors, reset, transform, clearErrors } = useForm(formDefaults);
    const dataRef = useRef(data);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const showField = useCallback(
        (fieldKey: string) =>
            isVolunteerSignupFieldVisible(fieldKey, focusMissingOnly, missingFields, data, pinnedMultiSelectFields),
        [data, focusMissingOnly, missingFields, pinnedMultiSelectFields],
    );

    const questionNumberContext = useMemo(
        () => ({
            visiblePages,
            isFieldVisible: showField,
            data,
            focusMissingOnly,
            isEdit,
        }),
        [visiblePages, showField, data, focusMissingOnly, isEdit],
    );

    const questionNumbers = useMemo(
        () => buildVolunteerSignupQuestionNumbers(questionNumberContext),
        [questionNumberContext],
    );

    const qn = (fieldKey: string) => questionNumbers[fieldKey] ?? 0;

    const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
        if (isEdit) {
            return initial?.photo_url ?? null;
        }
        return guestDraftState?.photoPreview ?? null;
    });
    const [showDraftRestoredBanner, setShowDraftRestoredBanner] = useState(
        () => !isEdit && volunteerSignupDraftHasAnswers(guestDraftState?.fields),
    );
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [pageSlot, setPageSlot] = useState(() => {
        const draftPage = guestDraftState?.page;
        if (
            !isEdit &&
            (resumePage === null || resumePage === undefined) &&
            draftPage !== null &&
            draftPage !== undefined &&
            visiblePages.includes(draftPage)
        ) {
            return visiblePages.indexOf(draftPage);
        }
        return resolveVolunteerSignupInitialPageSlot(visiblePages, resumePage);
    });
    const page = visiblePages[pageSlot] ?? 0;
    const activePageRef = useRef(page);

    useEffect(() => {
        if (!focusMissingOnly) {
            setPinnedMultiSelectFields([]);
            return;
        }

        const multiOnPage = (VOLUNTEER_SIGNUP_PAGE_FIELD_KEYS[page] ?? []).filter((fieldKey) =>
            volunteerSignupFieldIsMultiSelect(fieldKey),
        );
        setPinnedMultiSelectFields((current) => {
            const withoutThisPage = current.filter((fieldKey) => resolveVolunteerSignupFieldPage(fieldKey) !== page);
            const toPin = multiOnPage.filter((fieldKey) => missingFields.includes(fieldKey));

            return [...withoutThisPage, ...toPin];
        });
    }, [focusMissingOnly, missingFields, page]);

    const questionRange = useMemo(
        () => questionRangeForPage(questionNumberContext, page),
        [questionNumberContext, page],
    );

    const goToPageSlot = useCallback(
        (slot: number) => {
            const clamped = Math.max(0, Math.min(lastVisiblePageIndex, slot));
            const pageNum = visiblePages[clamped] ?? 0;
            activePageRef.current = pageNum;
            if (isEdit) {
                writeVolunteerSignupStoredPage(pageNum);
            } else {
                writeVolunteerSignupDraft(signupToken, data, { page: pageNum, photoPreview });
            }
            setPageSlot(clamped);
        },
        [data, isEdit, lastVisiblePageIndex, photoPreview, signupToken, visiblePages],
    );

    useEffect(() => {
        activePageRef.current = page;
    }, [page]);

    useEffect(() => {
        if (!pendingNavigateField) {
            return;
        }

        const fieldKey = pendingNavigateField;
        const pageNum = resolveVolunteerSignupFieldPage(fieldKey);
        const slot = visiblePages.indexOf(pageNum);
        if (slot < 0) {
            setPendingNavigateField(null);
            return;
        }

        goToPageSlot(slot);
        setPendingNavigateField(null);
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const targetId = FIELD_SCROLL_TARGETS[fieldKey] ?? `field-${fieldKey}`;
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [pendingNavigateField, goToPageSlot, visiblePages]);

    useEffect(() => {
        if (resumePage === null || resumePage === undefined) {
            return;
        }
        const slot = visiblePages.indexOf(resumePage);
        if (slot >= 0) {
            goToPageSlot(slot);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao carregar com ?etapa=
    }, []);

    useEffect(() => {
        if (!isEdit) {
            return;
        }
        const targetPage = activePageRef.current;
        const slot = visiblePages.indexOf(targetPage);
        if (slot >= 0) {
            setPageSlot((current) => (current === slot ? current : slot));
            return;
        }
        setPageSlot((current) => Math.min(current, lastVisiblePageIndex));
    }, [isEdit, lastVisiblePageIndex, visiblePages]);

    useEffect(() => {
        if (!isEdit) return;

        if (splitVolunteerFullName(data.full_name)) {
            setClientErrors((cur) => {
                if (!cur.full_name && !cur.first_name && !cur.last_name) return cur;
                const next = { ...cur };
                delete next.full_name;
                delete next.first_name;
                delete next.last_name;
                return next;
            });
            return;
        }

        if (!initial?.full_name || splitVolunteerFullName(initial.full_name)) return;

        setClientErrors((cur) =>
            cur.full_name
                ? cur
                : {
                      ...cur,
                      full_name:
                          'Seu cadastro precisa de nome e sobrenome (ex.: João Silva). Atualize o campo abaixo.',
                  },
        );
        setStepBlocked(true);
    }, [isEdit, initial?.full_name, data.full_name]);
    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [photoReloadWarning, setPhotoReloadWarning] = useState(false);
    const [photoPendingServerSave, setPhotoPendingServerSave] = useState(false);
    const photoPreviewObjectUrlRef = useRef<string | null>(null);
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
        () => (visiblePages.length > 0 ? Math.round(((pageSlot + 1) / visiblePages.length) * 100) : 0),
        [pageSlot, visiblePages.length],
    );
    const visiblePageCount = Math.max(1, visiblePages.length);
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

    const flushGuestDraft = useCallback(() => {
        if (isEdit || processing) return;
        writeVolunteerSignupDraft(signupToken, data, {
            page: visiblePages[pageSlot] ?? 0,
            photoPreview,
        });
    }, [data, isEdit, pageSlot, photoPreview, processing, signupToken, visiblePages]);

    useEffect(() => {
        if (isEdit || processing) return;
        if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = setTimeout(() => flushGuestDraft(), 400);
        return () => {
            if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
        };
    }, [flushGuestDraft, isEdit, processing]);

    useEffect(() => {
        if (isEdit) return;
        const onHide = () => flushGuestDraft();
        window.addEventListener('pagehide', onHide);
        window.addEventListener('beforeunload', onHide);
        return () => {
            window.removeEventListener('pagehide', onHide);
            window.removeEventListener('beforeunload', onHide);
        };
    }, [flushGuestDraft, isEdit]);

    const buildPreparedPayload = useCallback(
        (formData: typeof data = dataRef.current) => {
            const parts = splitVolunteerFullName(formData.full_name);
            if (!parts) return null;

            let prepared = prepareSignupPayload(
                { ...formData, photo_file: formData.photo_file } as Record<string, unknown>,
                parts.first_name,
                parts.last_name,
            );

            if (isEdit) {
                delete prepared.token;
                if (!String(prepared.password ?? '').trim()) {
                    delete prepared.password;
                    delete prepared.password_confirmation;
                }
            }

            const baseline = savedInitialRef.current ?? initial;
            if (focusMissingOnly && baseline) {
                prepared = mergeVolunteerSignupWithInitial(prepared, baseline, missingFields, { focusMissingOnly: true });
            }

            return prepared;
        },
        [focusMissingOnly, initial, isEdit, missingFields],
    );

    const applyAutosaveResponse = useCallback(
        (response: VolunteerSignupAutosaveResponse, savedFields: string[]) => {
            savedInitialRef.current = response.initial;
            setLiveMissingFields(response.completion.missing_fields);
            setLiveSignupCompletion(response.completion);
            setData((current) => {
                const patch = volunteerSignupFormPatchFromInitialFields(response.initial, savedFields);
                const saved = new Set(savedFields);
                if (
                    saved.has('has_social_networks') &&
                    normalizeSignupBool(current.has_social_networks) === true &&
                    normalizeSignupBool(patch.has_social_networks as BoolLike) !== true
                ) {
                    delete patch.has_social_networks;
                }
                // Evita o autosave “desmarcar” Sim/Não se a resposta do servidor vier atrasada/stale.
                if (
                    saved.has('has_whatsapp') &&
                    normalizeSignupBool(current.has_whatsapp) !== null &&
                    normalizeSignupBool(patch.has_whatsapp as BoolLike) === null
                ) {
                    delete patch.has_whatsapp;
                }
                return {
                    ...current,
                    ...patch,
                    photo_file: current.photo_file,
                };
            });

            if (response.completion.is_complete) {
                const localPayload = dataRef.current as unknown as Record<string, unknown>;
                const serverInitial = response.initial as unknown as Record<string, unknown>;
                if (volunteerSignupMultiSelectDiffersOnPage(localPayload, serverInitial, activePageRef.current)) {
                    setAutosaveMessage('Há opções marcadas ainda sendo salvas. Aguarde um instante…');
                    setAutosaveStatus('saved');
                    return;
                }

                setClientErrors({});
                setStepBlocked(false);
                setAutosaveStatus('saved');
                setAutosaveMessage(SIGNUP_COMPLETE_SUBMIT_HINT);
                return;
            }

            setClientErrors((current) => {
                const stillMissing = new Set(response.completion.missing_fields);
                const next = { ...current };
                for (const key of Object.keys(next)) {
                    if (!stillMissing.has(key)) {
                        delete next[key];
                    }
                }
                if (Object.keys(next).length === 0) {
                    setStepBlocked(false);
                }
                return next;
            });
            setAutosaveMessage(response.message);
            setAutosaveStatus('saved');
        },
        [setData],
    );

    const performAutosave = useCallback(
        async (fields: string[]): Promise<boolean> => {
            if (!isEdit || fields.length === 0) return true;

            const run = async (): Promise<boolean> => {
                const prepared = buildPreparedPayload(dataRef.current);
                if (!prepared) {
                    if (!splitVolunteerFullName(dataRef.current.full_name)) {
                        setClientErrors({ full_name: 'Informe o nome completo (nome e sobrenome).' });
                        setStepBlocked(true);
                        setShowSubmitErrors(true);
                        queueNavigateToField('full_name');
                        setAutosaveMessage('Complete o nome (nome e sobrenome) antes de salvar as outras respostas.');
                        setAutosaveStatus('error');
                    }
                    return false;
                }

                autosaveInFlightRef.current = true;
                setAutosaveStatus('saving');
                setAutosaveMessage(null);

                try {
                    const response = await postVolunteerSignupAutosave(prepared, fields);
                    applyAutosaveResponse(response, fields);
                    return true;
                } catch (e) {
                    setAutosaveStatus('error');
                    if (axios.isAxiosError(e)) {
                        const payload = e.response?.data as { message?: string; errors?: Record<string, string | string[]> };
                        const serverMessage =
                            typeof payload?.message === 'string' && payload.message.trim() !== ''
                                ? payload.message.trim()
                                : null;

                        if (e.response?.status === 422) {
                            const bag = payload?.errors ?? {};
                            const mapped = mapVolunteerSignupServerErrors(bag);
                            if (Object.keys(mapped).length > 0) {
                                setClientErrors(mapped);
                                setStepBlocked(true);
                                setShowSubmitErrors(true);
                                const firstKey = firstVolunteerSignupErrorKey(mapped);
                                if (firstKey) queueNavigateToField(firstKey);
                            }
                            setAutosaveMessage(
                                serverMessage ?? 'Não foi possível salvar agora. Verifique o campo destacado.',
                            );
                        } else if (e.response?.status === 401) {
                            setAutosaveMessage('Sua sessão expirou. Atualize a página e entre de novo.');
                        } else if (e.response?.status === 419) {
                            setAutosaveMessage('A página expirou. Atualize e tente novamente.');
                        } else {
                            setAutosaveMessage(
                                serverMessage ?? 'Não foi possível salvar agora. Verifique sua conexão e tente de novo.',
                            );
                        }
                    } else {
                        setAutosaveMessage('Não foi possível salvar agora. Verifique sua conexão e tente de novo.');
                    }
                    return false;
                } finally {
                    autosaveInFlightRef.current = false;
                }
            };

            const previous = autosaveInFlightPromiseRef.current;
            const promise = (async (): Promise<boolean> => {
                if (previous) {
                    await previous.catch(() => false);
                }
                return run();
            })().finally(() => {
                if (autosaveInFlightPromiseRef.current === promise) {
                    autosaveInFlightPromiseRef.current = null;
                }
                if (pendingSubmitAfterAutosaveRef.current) {
                    pendingSubmitAfterAutosaveRef.current = false;
                    void submitFormRef.current?.();
                }
            });
            autosaveInFlightPromiseRef.current = promise;

            return promise;
        },
        [applyAutosaveResponse, buildPreparedPayload, isEdit, queueNavigateToField],
    );

    const applyServerValidationErrors = useCallback(
        (propsErrors: Record<string, string | string[] | undefined> | Record<string, string>) => {
            const mapped = mapVolunteerSignupServerErrors(propsErrors);
            const keys = Object.keys(mapped);
            if (keys.length === 0) return;

            setShowSubmitErrors(true);
            setClientErrors(mapped);
            setStepBlocked(true);
            const firstKey = firstVolunteerSignupErrorKey(mapped);
            if (firstKey) {
                queueNavigateToField(firstKey);
            } else {
                scrollToFirstError(mapped);
            }
        },
        [goToPageSlot, queueNavigateToField],
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
                already_volunteer?: boolean;
                has_app_account?: boolean;
                existing_options_url?: string | null;
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
            if (
                !isEdit &&
                !completingPreRegistration &&
                res.data.already_volunteer &&
                res.data.has_app_account &&
                res.data.existing_options_url
            ) {
                router.visit(res.data.existing_options_url);
                return { nameHint: null, emailHint: null, phoneHint: null };
            }
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
    }, [completingPreRegistration, data.token, data.full_name, data.first_name, data.last_name, data.email, data.phone, isEdit]);

    const scheduleDuplicateCheck = () => {
        if (checkDuplicateTimer.current) clearTimeout(checkDuplicateTimer.current);
        checkDuplicateTimer.current = setTimeout(() => void runDuplicateCheck(), 250);
    };

    const syncNameParts = (full: string) => {
        const parts = splitVolunteerFullName(full);
        setData('first_name', parts?.first_name ?? '');
        setData('last_name', parts?.last_name ?? '');
    };

    const clearClientError = (key: string) => {
        dismissSubmitErrors();
        setStepBlocked(false);
        setClientErrors((cur) => {
            const hasKey =
                key === 'full_name'
                    ? cur.full_name || cur.first_name || cur.last_name
                    : cur[key];
            if (!hasKey) return cur;
            const next = { ...cur };
            if (key === 'full_name') {
                delete next.full_name;
                delete next.first_name;
                delete next.last_name;
            } else {
                delete next[key];
            }
            return next;
        });
    };

    const revokePhotoPreviewObjectUrl = useCallback(() => {
        revokeBlobPreviewUrl(photoPreviewObjectUrlRef);
    }, []);

    useEffect(() => {
        if (
            shouldWarnPhotoPickReload(
                data.photo_file !== null || (isEdit && hasExistingPhoto) || Boolean(photoPreview),
            )
        ) {
            setPhotoReloadWarning(true);
        }
    }, [data.photo_file, hasExistingPhoto, isEdit, photoPreview]);

    useEffect(() => () => revokePhotoPreviewObjectUrl(), [revokePhotoPreviewObjectUrl]);

    useEffect(() => {
        if (isEdit) {
            return;
        }
        const preview = guestDraftState?.photoPreview;
        if (!preview?.startsWith('data:image/')) {
            return;
        }

        let cancelled = false;
        void draftPhotoPreviewToFile(preview).then((file) => {
            if (!cancelled && file) {
                setData('photo_file', file);
            }
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- restaurar foto do rascunho só na montagem
    }, []);

    const handlePhotoFileChosen = async (raw: File | null) => {
        setPhotoReloadWarning(false);
        setPhotoClientError(null);
        clearClientError('photo_file');
        if (!raw) {
            setData('photo_file', null);
            revokePhotoPreviewObjectUrl();
            setPhotoPreview(isEdit ? initial?.photo_url ?? null : null);
            setPhotoPendingServerSave(false);
            clearPhotoPickPending();
            if (!isEdit) {
                writeVolunteerSignupDraft(signupToken, { ...dataRef.current, photo_file: null }, {
                    page: activePageRef.current,
                    photoPreview: null,
                });
            }
            return;
        }
        setPhotoPreparing(true);
        try {
            const compressed = await compressImageForUpload(raw);
            setData('photo_file', compressed);
            revokePhotoPreviewObjectUrl();

            const draftPreview = await fileToDraftPhotoPreview(compressed);
            let preview: string;
            if (draftPreview) {
                preview = draftPreview;
            } else {
                preview = URL.createObjectURL(compressed);
                photoPreviewObjectUrlRef.current = preview;
            }
            setPhotoPreview(preview);
            clearPhotoPickPending();
            if (isEdit) {
                setPhotoPendingServerSave(true);
            } else {
                writeVolunteerSignupDraft(signupToken, { ...dataRef.current, photo_file: compressed }, {
                    page: activePageRef.current,
                    ...(draftPreview ? { photoPreview: draftPreview } : {}),
                });
            }
        } catch (e) {
            const msg = e instanceof ImageCompressError ? e.message : 'Não foi possível preparar a foto.';
            setPhotoClientError(msg);
            setData('photo_file', null);
            revokePhotoPreviewObjectUrl();
            setPhotoPreview(isEdit ? initial?.photo_url ?? null : null);
            setPhotoPendingServerSave(false);
            clearPhotoPickPending();
        } finally {
            setPhotoPreparing(false);
        }
    };

    const handlePhotoClear = () => {
        setData('photo_file', null);
        revokePhotoPreviewObjectUrl();
        setPhotoPreview(isEdit ? initial?.photo_url ?? null : null);
        setPhotoClientError(null);
        setPhotoPendingServerSave(false);
        clearClientError('photo_file');
        clearPhotoPickPending();
        if (!isEdit) {
            writeVolunteerSignupDraft(signupToken, { ...dataRef.current, photo_file: null }, {
                page: activePageRef.current,
                photoPreview: null,
            });
        }
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
                pinnedMultiSelectFields,
                duplicateHints,
            }),
        [
            data,
            hasExistingPhoto,
            isEdit,
            nameDuplicateHint,
            emailDuplicateHint,
            phoneDuplicateHint,
            focusMissingOnly,
            missingFields,
            pinnedMultiSelectFields,
        ],
    );

    const scheduleFieldAutosave = useCallback(
        (fieldKey: string, extraFields: string[] = []) => {
            if (!isEdit) return;
            // Departamentos: só ao avançar a etapa (lista longa).
            if (fieldKey === 'desired_ministry_ids') return;
            if (autosaveDebounceRef.current) clearTimeout(autosaveDebounceRef.current);
            autosaveDebounceRef.current = setTimeout(() => {
                const snapshot = dataRef.current;
                if (!isVolunteerSignupFieldAnswered(fieldKey, snapshot)) return;
                const pageErrors = computeVolunteerSignupPageErrors({
                    page,
                    data: snapshot,
                    isEdit,
                    hasExistingPhoto,
                    focusMissingOnly,
                    missingFields,
                    pinnedMultiSelectFields,
                });
                const errorKey = fieldKey === 'full_name' ? 'full_name' : fieldKey;
                if (pageErrors[errorKey]) return;

                const fields = [
                    ...(fieldKey === 'full_name'
                        ? ['first_name', 'last_name']
                        : fieldKey === 'photo_file'
                          ? ['photo_file']
                          : [fieldKey]),
                    ...extraFields,
                ];

                void performAutosave([...new Set(fields)]);
            }, 500);
        },
        [focusMissingOnly, hasExistingPhoto, isEdit, missingFields, page, performAutosave, pinnedMultiSelectFields],
    );

    const persistFieldAnswer = useCallback(
        (fieldKey: string, extraFields: string[] = []) => {
            if (!isEdit) return;
            setAutosaveStatus('idle');
            setAutosaveMessage(null);
            if (fieldTriggersImmediateAutosave(fieldKey)) {
                scheduleFieldAutosave(fieldKey, extraFields);
            }
        },
        [isEdit, scheduleFieldAutosave],
    );

    const onNameBlur = () => {
        syncNameParts(data.full_name);
        scheduleDuplicateCheck();
        if (isEdit) scheduleFieldAutosave('full_name');
    };

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

            const duplicateHints =
                page === 0 ? { nameHint: null, emailHint: null, phoneHint: null } : undefined;
            if (!applyPageValidation(page, duplicateHints)) return;

            if (isEdit) {
                const fieldsToSave = collectVolunteerSignupAutosaveFields(page, showField, data);
                const saved = await performAutosave(fieldsToSave);
                if (!saved) return;
                if (fieldsToSave.includes('photo_file')) {
                    setPhotoPendingServerSave(false);
                }
            }

            setClientErrors((cur) => {
                const next = { ...cur };
                delete next.full_name;
                delete next.first_name;
                delete next.last_name;
                return next;
            });
            setStepBlocked(false);
            dismissSubmitErrors();
            setPinnedMultiSelectFields((current) =>
                current.filter((fieldKey) => resolveVolunteerSignupFieldPage(fieldKey) !== page),
            );
            goToPageSlot(pageSlot + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setAdvancing(false);
        }
    };

    const goBack = () => {
        setStepBlocked(false);
        setClientErrors({});
        goToPageSlot(pageSlot - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const buildMergedSignupPayload = useCallback(() => {
        const parts = splitVolunteerFullName(data.full_name);
        if (!parts) {
            return null;
        }

        let prepared = prepareSignupPayload(
            { ...data, photo_file: data.photo_file } as Record<string, unknown>,
            parts.first_name,
            parts.last_name,
        );

        if (isEdit) {
            delete prepared.token;
            if (!String(prepared.password ?? '').trim()) {
                delete prepared.password;
                delete prepared.password_confirmation;
            }
            prepared.focus_missing_only = focusMissingOnly;
            prepared.resume_page = visiblePages[pageSlot] ?? 0;
        }

        const baseline = savedInitialRef.current ?? initial;
        if (focusMissingOnly && baseline) {
            prepared = mergeVolunteerSignupWithInitial(prepared, baseline, missingFields, { focusMissingOnly: true });
        }

        return prepared;
    }, [data, focusMissingOnly, initial, isEdit, missingFields, pageSlot, visiblePages]);

    const evaluateMergedSignupCompletion = useCallback(
        (prepared: Record<string, unknown>) => {
            const completionInput = buildVolunteerSignupCompletionInput(prepared, {
                hasExistingPhoto: hasExistingPhoto || data.photo_file !== null,
            });

            return computeVolunteerSignupCompletion(completionInput);
        },
        [data.photo_file, hasExistingPhoto, initial],
    );

    const flagPendingSignupFields = useCallback((pendingFields: string[]) => {
        const pendingErrors = volunteerSignupErrorsForMissingFields(pendingFields);
        setLiveMissingFields(pendingFields);
        setLiveSignupCompletion((current) =>
            current
                ? {
                      ...current,
                      is_complete: false,
                      missing_count: pendingFields.length,
                      missing_fields: pendingFields,
                  }
                : current,
        );
        setClientErrors(pendingErrors);
        setStepBlocked(true);
        setShowSubmitErrors(true);
        const firstPending = firstVolunteerSignupErrorKey(pendingErrors);
        if (firstPending) {
            queueNavigateToField(firstPending);
        }
    }, [queueNavigateToField]);

    const submitForm = async () => {
        syncNameParts(data.full_name);
        const duplicateHints = { nameHint: null, emailHint: null, phoneHint: null };

        if (focusMissingOnly) {
            if (!applyPageValidation(page, duplicateHints)) {
                return;
            }

            if (isEdit) {
                const fieldsToSave = collectVolunteerSignupAutosaveFields(page, showField, data);
                const saved = await performAutosave(fieldsToSave);
                if (!saved) {
                    return;
                }
                if (fieldsToSave.includes('photo_file')) {
                    setPhotoPendingServerSave(false);
                }
            }

            const prepared = buildMergedSignupPayload();
            if (!prepared) {
                const nameErrors = { full_name: 'Informe o nome completo.' };
                setClientErrors(nameErrors);
                setStepBlocked(true);
                setShowSubmitErrors(true);
                queueNavigateToField('full_name');
                setLiveMissingFields((current) =>
                    current.includes('full_name') ? current : [...current, 'full_name'],
                );
                return;
            }

            const pendingAfterSubmit = evaluateMergedSignupCompletion(prepared);
            if (!pendingAfterSubmit.is_complete) {
                flagPendingSignupFields(pendingAfterSubmit.missing_fields);
                return;
            }

            setStepBlocked(false);
            setShowSubmitErrors(false);
            clearErrors();

            transform(() => prepared);

            put(route('volunteers.self-signup.edit.update'), {
                forceFormData: true,
                preserveState: true,
                preserveScroll: true,
                onError: (serverErrors: Record<string, string>) => {
                    applyServerValidationErrors(serverErrors);
                },
            });
            return;
        }

        for (let slot = 0; slot <= lastVisiblePageIndex; slot += 1) {
            const pageToValidate = visiblePages[slot] ?? 0;
            const pageErrors = computePageErrors(pageToValidate, duplicateHints);
            if (Object.keys(pageErrors).length > 0) {
                setClientErrors(pageErrors);
                setStepBlocked(true);
                setShowSubmitErrors(true);
                const firstKey = firstVolunteerSignupErrorKey(pageErrors);
                if (firstKey) {
                    queueNavigateToField(firstKey);
                } else {
                    goToPageSlot(slot);
                    scrollToFirstError(pageErrors);
                }
                return;
            }
        }

        const prepared = buildMergedSignupPayload();
        if (!prepared) {
            const nameErrors = { full_name: 'Informe o nome completo.' };
            setClientErrors(nameErrors);
            goToPageSlot(0);
            setStepBlocked(true);
            setShowSubmitErrors(true);
            queueNavigateToField('full_name');
            return;
        }

        const pendingAfterSubmit = evaluateMergedSignupCompletion(prepared);
        if (!pendingAfterSubmit.is_complete) {
            const pendingErrors = volunteerSignupErrorsForMissingFields(pendingAfterSubmit.missing_fields);
            setClientErrors(pendingErrors);
            setStepBlocked(true);
            setShowSubmitErrors(true);
            const firstPending = firstVolunteerSignupErrorKey(pendingErrors);
            if (firstPending) {
                queueNavigateToField(firstPending);
            }
            return;
        }

        setStepBlocked(false);
        setShowSubmitErrors(false);
        clearErrors();

        transform(() => prepared);

        const submitOptions = {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onError: (serverErrors: Record<string, string>) => {
                applyServerValidationErrors(serverErrors);
            },
            onSuccess: () => {
                if (!isEdit) {
                    clearVolunteerSignupDraft(signupToken);
                }
            },
        };

        if (isEdit) {
            put(route('volunteers.self-signup.edit.update'), submitOptions);
        } else {
            post(route('volunteers.self-signup.store'), submitOptions);
        }
    };

    submitFormRef.current = submitForm;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Não concluir enquanto o autosave grava — no celular o rodapé sticky
        // fica sobre as opções e um toque em Sim/Não acabava disparando Continuar/Concluir.
        if (autosaveStatus === 'saving' || autosaveInFlightRef.current || advancing) {
            pendingSubmitAfterAutosaveRef.current = true;
            setAutosaveMessage('Aguarde o salvamento para concluir o cadastro…');
            return;
        }
        void submitForm();
    };

    const err = (key: string) => {
        if (
            key === 'full_name' &&
            splitVolunteerFullName(data.full_name) &&
            !showSubmitErrors &&
            (clientErrors.full_name || clientErrors.first_name || clientErrors.last_name)
        ) {
            return undefined;
        }
        if (clientErrors[key]) return clientErrors[key];
        if (!showSubmitErrors || processing) return undefined;
        const formMessage = (errors as Record<string, string | undefined>)[key];
        if (formMessage) return formMessage;
        return firstErrorMessage(sharedErrors, key);
    };

    const hasVisibleServerErrors = serverErrorKeys.length > 0;
    const hasStepErrors =
        stepBlocked && Object.keys(clientErrors).length > 0 && liveSignupCompletion?.is_complete !== true;
    const signupReadyToFinish = Boolean(isEdit && liveSignupCompletion?.is_complete);

    const submitLabel = useMemo(() => {
        if (signupReadyToFinish) {
            return 'Concluir cadastro';
        }
        if (focusMissingOnly) {
            return 'Continuar';
        }
        if (isEdit) {
            return 'Salvar cadastro';
        }
        return 'Concluir cadastro';
    }, [focusMissingOnly, isEdit, signupReadyToFinish]);

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
                            {isEdit ? (
                                <p
                                    className={[
                                        'mt-2 text-sm leading-relaxed',
                                        autosaveStatus === 'error'
                                            ? 'text-red-700 dark:text-red-300'
                                            : autosaveStatus === 'saved'
                                              ? 'text-teal-800 dark:text-teal-300'
                                              : 'text-zinc-600 dark:text-zinc-400',
                                    ].join(' ')}
                                    aria-live="polite"
                                >
                                    {autosaveStatus === 'saving'
                                        ? 'Salvando resposta…'
                                        : autosaveStatus === 'saved'
                                          ? autosaveMessage ?? 'Resposta salva no seu cadastro.'
                                          : autosaveStatus === 'error'
                                            ? autosaveMessage ?? 'Não foi possível salvar agora.'
                                            : focusMissingOnly
                                              ? 'Responda as perguntas em destaque abaixo. Cada escolha é salva automaticamente — use Continuar para avançar. Para alterar a senha, use Editar perfil.'
                                              : 'Complete ou corrija suas informações de voluntário. Suas respostas são salvas automaticamente.'}
                                </p>
                            ) : (
                                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                    Preencha seus dados para informar seu interesse em ser voluntário da Nova Semente.{' '}
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                        Suas respostas ficam salvas neste aparelho enquanto você preenche — pode fechar e voltar
                                        depois.
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        <span className="font-semibold">*</span> Obrigatória
                    </p>
                </header>

                {completingPreRegistration && !isEdit ? (
                    <div
                        className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/35 dark:text-teal-100"
                        role="status"
                    >
                        <p className="font-semibold">Cadastro já iniciado pela equipe</p>
                        <p className="mt-1 leading-relaxed">
                            Vamos concluir seu acesso ao aplicativo e atualizar os dados no mesmo registro — sem criar
                            outro cadastro de voluntário.
                        </p>
                    </div>
                ) : null}

                {isEdit && existingRegistrationNotice && !focusMissingOnly ? (
                    <div
                        className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
                        role="status"
                    >
                        <p className="font-semibold">Você já tem cadastro de voluntário</p>
                        <p className="mt-1 leading-relaxed text-amber-900/90 dark:text-amber-100/90">
                            As informações abaixo são do seu cadastro atual. Você pode revisar e atualizar quando
                            quiser — as alterações são salvas automaticamente enquanto você preenche.
                        </p>
                    </div>
                ) : null}

                {showDraftRestoredBanner ? (
                    <div
                        className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/35 dark:text-teal-100"
                        role="status"
                    >
                        <p>
                            <span className="font-semibold">Continuamos de onde você parou.</span> Suas respostas foram
                            recuperadas deste aparelho.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowDraftRestoredBanner(false)}
                            className="shrink-0 text-xs font-semibold text-teal-800 underline underline-offset-2 dark:text-teal-200"
                        >
                            Ok
                        </button>
                    </div>
                ) : null}

                {signupReadyToFinish ? (
                    <div
                        className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100"
                        role="status"
                    >
                        <p className="font-semibold">Cadastro completo</p>
                        <p className="mt-1 leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
                            {SIGNUP_COMPLETE_SUBMIT_HINT}
                        </p>
                    </div>
                ) : null}

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
                        {Object.keys(clientErrors).length === 1
                            ? 'Falta responder 1 item. Role até o campo destacado em vermelho.'
                            : `Faltam ${Object.keys(clientErrors).length} respostas. Role até o primeiro campo destacado em vermelho.`}
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
                                    Etapa {pageSlot + 1} de {visiblePageCount}
                                    {questionRange
                                        ? questionRange.start === questionRange.end
                                            ? ` · pergunta ${questionRange.start} de ${questionRange.total}`
                                            : ` · perguntas ${questionRange.start}–${questionRange.end} de ${questionRange.total}`
                                        : null}
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
                                    goToPageSlot(0);
                                    setPhotoPreview(initial?.photo_url ?? null);
                                    if (!isEdit) {
                                        clearVolunteerSignupDraft(signupToken);
                                        setShowDraftRestoredBanner(false);
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

                    {/* pb evita que as últimas opções fiquem sob o FormNav sticky + barra inferior do app */}
                    <div className="space-y-4 pb-28 sm:space-y-5 sm:pb-8">
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
                                        <span className="mr-1.5 tabular-nums text-zinc-500 dark:text-zinc-400">{qn('photo_file')}.</span>
                                        Foto
                                        {!(isEdit && hasExistingPhoto) ? (
                                            <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
                                        ) : null}
                                    </h3>
                                    {photoReloadWarning ? (
                                        <p
                                            className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
                                            role="status"
                                        >
                                            O app pode ter recarregado ao abrir a câmera. Escolha a foto de novo (de
                                            preferência pela galeria).
                                        </p>
                                    ) : null}
                                    {photoPendingServerSave && isEdit ? (
                                        <p className="mb-3 text-xs text-teal-800 dark:text-teal-200">
                                            Foto pronta. Toque em <strong>Avançar</strong> ou salve a etapa para enviar
                                            ao servidor.
                                        </p>
                                    ) : null}
                                    <ProfilePhotoPicker
                                        previewUrl={photoPreview}
                                        photoPreparing={photoPreparing}
                                        clientError={photoClientError ?? err('photo_file') ?? null}
                                        serverPhotoError={errors.photo_file}
                                        inputId="volunteer_photo"
                                        required={!(isEdit && hasExistingPhoto)}
                                        onPickStart={markPhotoPickStarted}
                                        onPhotoFile={handlePhotoFileChosen}
                                        onClear={handlePhotoClear}
                                    />
                                </section>
                                ) : null}
                                {showField('birth_date') ? (
                                <Question fieldKey="birth_date" number={qn('birth_date')} label="Data de nascimento" error={err('birth_date')}>
                                    <BrDateInput
                                        className="w-full max-w-xs"
                                        value={data.birth_date}
                                        max={maxBirthDate}
                                        onChange={(iso) => {
                                            setData('birth_date', iso);
                                            clearClientError('birth_date');
                                        }}
                                        onBlur={() => {
                                            if (isEdit) scheduleFieldAutosave('birth_date');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('has_social_networks') ? (
                                <Question
                                    fieldKey="has_social_networks"
                                    number={qn('has_social_networks')}
                                    label="Redes sociais?"
                                    error={err('has_social_networks')}
                                >
                                    <YesNoRadio
                                        name="has_social_networks"
                                        value={data.has_social_networks}
                                        onChange={(v) => {
                                            setData((d) => ({
                                                ...d,
                                                has_social_networks: v,
                                                social_network_profiles: v ? d.social_network_profiles : '',
                                            }));
                                            clearClientError('has_social_networks');
                                            if (!v) clearClientError('social_network_profiles');
                                            persistFieldAnswer('has_social_networks');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {(focusMissingOnly
                                    ? showField('social_network_profiles')
                                    : normalizeSignupBool(data.has_social_networks) === true) ? (
                                    <Question
                                        fieldKey="social_network_profiles"
                                        number={qn('social_network_profiles')}
                                        label="Qual o seu perfil do Instagram/Facebook?"
                                        error={err('social_network_profiles')}
                                    >
                                        <TextInput
                                            className="w-full"
                                            placeholder="Ex.: @seuusuario ou link do perfil"
                                            value={data.social_network_profiles}
                                            onChange={(e) => {
                                                setData('social_network_profiles', e.target.value);
                                                clearClientError('social_network_profiles');
                                            }}
                                            onBlur={() => {
                                                if (isEdit) scheduleFieldAutosave('social_network_profiles');
                                            }}
                                        />
                                    </Question>
                                ) : null}
                                {showField('professional_area') ? (
                                <Question
                                    fieldKey="professional_area"
                                    number={qn('professional_area')}
                                    label="Qual a sua área de atuação profissional?"
                                    error={err('professional_area')}
                                >
                                    <TextInput
                                        className="w-full"
                                        value={data.professional_area}
                                        onChange={(e) => {
                                            setData('professional_area', e.target.value);
                                            clearClientError('professional_area');
                                        }}
                                        onBlur={() => {
                                            if (isEdit) scheduleFieldAutosave('professional_area');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('full_name') ? (
                                <Question
                                    fieldKey="full_name"
                                    number={qn('full_name')}
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
                                {showField('phone') ? (
                                <Question
                                    fieldKey="phone"
                                    number={qn('phone')}
                                    label={focusMissingOnly ? 'Telefone cadastrado' : 'Telefone (WhatsApp)'}
                                    required
                                    error={err('phone')}
                                >
                                    {focusMissingOnly ? (
                                        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100">
                                            {data.phone.trim() || '—'}
                                        </p>
                                    ) : (
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
                                        onBlur={() => {
                                            scheduleDuplicateCheck();
                                            if (isEdit) scheduleFieldAutosave('phone');
                                        }}
                                    />
                                    )}
                                </Question>
                                ) : null}
                                {(focusMissingOnly ? showField('has_whatsapp') : shouldAskVolunteerWhatsapp(data.phone)) ? (
                                <Question fieldKey="has_whatsapp" number={qn('has_whatsapp')} label="Este número tem WhatsApp?" error={err('has_whatsapp')}>
                                    <YesNoRadio
                                        name="has_whatsapp"
                                        value={data.has_whatsapp}
                                        onChange={(v) => {
                                            setData('has_whatsapp', v);
                                            clearClientError('has_whatsapp');
                                            // Grava o telefone junto: evita rascunho apagado e normalizador zerando o WhatsApp.
                                            persistFieldAnswer('has_whatsapp', ['phone']);
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('email') ? (
                                <Question fieldKey="email" number={qn('email')} label="E-mail" error={err('email')}>
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
                                        onBlur={() => {
                                            scheduleDuplicateCheck();
                                            if (isEdit) scheduleFieldAutosave('email');
                                        }}
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
                                        <Question
                                            fieldKey="password"
                                            number={qn('password')}
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
                                            {isEdit ? (
                                                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                    Preencha somente se quiser trocar a senha. Use o olho para ver o que está digitando.
                                                </p>
                                            ) : null}
                                        </Question>
                                        <Question
                                            fieldKey="password_confirmation"
                                            number={qn('password_confirmation')}
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
                            </>
                        ) : null}

                        {page === 1 ? (
                            <>
                                {showField('attendance_duration') ? (
                                <Question fieldKey="attendance_duration" number={qn('attendance_duration')} label="A quanto tempo frequenta a Nova Semente?" error={err('attendance_duration')}>
                                    <div className="space-y-1.5" role="radiogroup">
                                        {ATTENDANCE_DURATION_OPTIONS.map((opt) => {
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
                                                        persistFieldAnswer('attendance_duration');
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
                                <Question fieldKey="is_official_member" number={qn('is_official_member')} label="Você é membro oficial da Igreja Adventista do 7º dia?" error={err('is_official_member')}>
                                    <YesNoRadio
                                        name="is_official_member"
                                        value={data.is_official_member}
                                        onChange={(v) => {
                                            setData('is_official_member', v);
                                            clearClientError('is_official_member');
                                            persistFieldAnswer('is_official_member');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('volunteer_phase') ? (
                                <Question fieldKey="volunteer_phase" number={qn('volunteer_phase')} label="Qual é a sua fase atual no voluntariado da Nova Semente?" error={err('volunteer_phase')}>
                                    <div className="space-y-1.5" role="radiogroup">
                                        {VOLUNTEER_PHASE_OPTIONS.map((opt) => {
                                            const selected = data.volunteer_phase === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={selected}
                                                    onClick={() => {
                                                        setData('volunteer_phase', opt.value);
                                                        clearClientError('volunteer_phase');
                                                        persistFieldAnswer('volunteer_phase');
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
                                {showField('desired_ministry_ids') ? (
                                <Question
                                    fieldKey="desired_ministry_ids"
                                    number={qn('desired_ministry_ids')}
                                    label="Em quais departamentos você gostaria de servir?"
                                    required={false}
                                    error={err('desired_ministry_ids')}
                                >
                                    <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        Opcional — marque se já souber onde gostaria de servir.
                                    </p>
                                    <MinistryCheckboxList
                                        ministries={ministries}
                                        selectedIds={data.desired_ministry_ids}
                                        onToggle={(id) => {
                                            const current = data.desired_ministry_ids ?? [];
                                            const next = current.some((selectedId) => Number(selectedId) === Number(id))
                                                ? current.filter((selectedId) => Number(selectedId) !== Number(id))
                                                : [...current, id];
                                            setData('desired_ministry_ids', next);
                                            clearClientError('desired_ministry_ids');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('service_ease_areas') ? (
                                <Question fieldKey="service_ease_areas" number={qn('service_ease_areas')} label="Em quais áreas você acredita ter mais facilidade para servir?" error={err('service_ease_areas')}>
                                    <VolunteerSignupMultiCheckboxField
                                        options={SERVICE_EASE_AREA_OPTIONS}
                                        selectedValues={data.service_ease_areas}
                                        onChange={(next) => {
                                            setData('service_ease_areas', next);
                                            clearClientError('service_ease_areas');
                                            persistFieldAnswer('service_ease_areas');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('comfortable_with_digital_tools') ? (
                                <Question
                                    fieldKey="comfortable_with_digital_tools"
                                    number={qn('comfortable_with_digital_tools')}
                                    label="Você se sente confortável usando ferramentas digitais (ex.: planilhas, aplicativos, sistemas da igreja)?"
                                    error={err('comfortable_with_digital_tools')}
                                >
                                    <YesNoRadio
                                        name="comfortable_with_digital_tools"
                                        value={data.comfortable_with_digital_tools}
                                        onChange={(v) => {
                                            setData('comfortable_with_digital_tools', v);
                                            clearClientError('comfortable_with_digital_tools');
                                            persistFieldAnswer('comfortable_with_digital_tools');
                                        }}
                                    />
                                </Question>
                                ) : null}
                            </>
                        ) : null}

                        {page === 2 ? (
                            <>
                                {showField('service_activity_types') ? (
                                <Question
                                    fieldKey="service_activity_types"
                                    number={qn('service_activity_types')}
                                    label="Em qual tipo de atividade você sente que rende melhor atuando como voluntário?"
                                    error={err('service_activity_types')}
                                >
                                    <VolunteerSignupMultiCheckboxField
                                        options={SERVICE_ACTIVITY_TYPE_OPTIONS}
                                        selectedValues={data.service_activity_types}
                                        maxHeightClass="max-h-80"
                                        onChange={(next) => {
                                            setData('service_activity_types', next);
                                            clearClientError('service_activity_types');
                                            persistFieldAnswer('service_activity_types');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('service_greatest_strength') ? (
                                <Question
                                    fieldKey="service_greatest_strength"
                                    number={qn('service_greatest_strength')}
                                    label="O que você considera ser seu maior ponto forte no serviço?"
                                    error={err('service_greatest_strength')}
                                >
                                    <TextInput
                                        className="w-full"
                                        value={data.service_greatest_strength}
                                        onChange={(e) => {
                                            setData('service_greatest_strength', e.target.value);
                                            clearClientError('service_greatest_strength');
                                        }}
                                        onBlur={() => {
                                            if (isEdit) scheduleFieldAutosave('service_greatest_strength');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('service_greatest_challenge') ? (
                                <Question
                                    fieldKey="service_greatest_challenge"
                                    number={qn('service_greatest_challenge')}
                                    label="O que você considera ser seu maior desafio ao servir?"
                                    error={err('service_greatest_challenge')}
                                >
                                    <TextInput
                                        className="w-full"
                                        value={data.service_greatest_challenge}
                                        onChange={(e) => {
                                            setData('service_greatest_challenge', e.target.value);
                                            clearClientError('service_greatest_challenge');
                                        }}
                                        onBlur={() => {
                                            if (isEdit) scheduleFieldAutosave('service_greatest_challenge');
                                        }}
                                    />
                                </Question>
                                ) : null}
                                {showField('lgpd_data_consent') ? (
                                <Question fieldKey="lgpd_data_consent" number={qn('lgpd_data_consent')} label="Consentimento para uso de dados" error={err('lgpd_data_consent')}>
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
                                            persistFieldAnswer('lgpd_data_consent');
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
                                Revise suas respostas antes de concluir o cadastro de voluntário.
                            </p>
                        )}
                        <FormNav
                            page={pageSlot}
                            lastPageIndex={lastVisiblePageIndex}
                            onBack={goBack}
                            onAdvance={tryAdvancePage}
                            processing={processing}
                            advancing={advancing}
                            autosaving={autosaveStatus === 'saving'}
                            submitLabel={submitLabel}
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
