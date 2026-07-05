import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import ProfilePhotoPicker from '@/Components/ProfilePhotoPicker';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import BrDateInput from '@/Components/BrDateInput';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { markPhotoPickStarted } from '@/utils/mobilePhotoPick';
import { todayIsoLocal } from '@/utils/brDate';
import { findMissionFormIssue } from '@/utils/missionFormValidation';
import {
    buildMissionStepPayload,
    isMissionRegistrationSubmitStep,
    missionErrorStepIndex,
    missionStepQuestionNumber,
    missionStepSectionTitle,
    type MissionStepId,
    validateMissionStep,
    visibleMissionSteps,
} from '@/utils/missionFormSteps';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MissionFormReturn = ReturnType<typeof useForm<MissionFormData>>;

export type MissionOptions = {
    professions: string[];
    beliefs: string[];
    religions: string[];
    seeks_in_community: string[];
    studied_bible: string[];
    first_contact_via: string[];
    wants_bible_study_partner: string[];
    spiritual_journey: string[];
    comfortable_environment: string[];
    group_project_preference: string[];
    interest_areas: string[];
    learning_style: string[];
    personalized_bible_study_interest: string[];
    mission_social_projects_interest: string[];
    start_area_preference: string[];
};

export type MissionFormData = {
    photo: File | null;
    full_name: string;
    birth_date: string;
    email: string;
    phone: string;
    full_address: string;
    profession: string;
    profession_other: string;
    has_belief: boolean | null;
    belief_which: string;
    belief_which_other: string;
    participates_religion: boolean | null;
    religion_which: string;
    religion_which_other: string;
    baptized: boolean | null;
    seeks_in_community: string;
    seeks_in_community_other: string;
    studied_bible: string;
    studied_bible_structured: boolean | null;
    first_time_nova_semente: boolean | null;
    first_contact_via: string;
    first_contact_via_other: string;
    wants_bible_study_partner: string;
    spiritual_journey: string;
    comfortable_environment: string;
    group_project_preference: string;
    interest_areas: string[];
    learning_style: string;
    personalized_bible_study_interest: string;
    mission_social_projects_interest: string;
    start_area_preference: string;
    talents_for_god: string;
    team_support_notes: string;
    lgpd_consent: boolean;
    wants_app_account: boolean | null;
    app_email: string;
    app_password: string;
    app_password_confirmation: string;
};

interface Props {
    form: MissionFormReturn;
    options: MissionOptions;
    onSubmit: FormEventHandler;
    processing: boolean;
    formRevision?: number;
    saveStepUrl?: string;
    canSaveProgress?: boolean;
    initialStepIndex?: number;
    initialPhotoUrl?: string | null;
    isEditing?: boolean;
    offerAppAccount?: boolean;
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

function MissionStepper({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center justify-center gap-1.5" role="group" aria-label="Progresso do cadastro">
            {Array.from({ length: total }, (_, index) => {
                const isCurrent = index === current;
                const isComplete = index < current;

                return (
                    <span
                        key={index}
                        className={[
                            'h-1.5 rounded-full transition-all duration-300',
                            isCurrent
                                ? 'w-5 bg-teal-600 dark:bg-teal-400'
                                : isComplete
                                  ? 'w-1.5 bg-teal-400/80 dark:bg-teal-600/80'
                                  : 'w-1.5 bg-zinc-200 dark:bg-zinc-700',
                        ].join(' ')}
                        aria-current={isCurrent ? 'step' : undefined}
                    />
                );
            })}
        </div>
    );
}

function MissionProgressHeader({
    sectionTitle,
    stepIndex,
    totalSteps,
    progress,
}: {
    sectionTitle: string;
    stepIndex: number;
    totalSteps: number;
    progress: number;
}) {
    return (
        <div className="space-y-3">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Etapa</p>
                <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-white">{sectionTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Responda no seu ritmo — você pode voltar a qualquer momento.
                </p>
            </div>
            <MissionStepper current={stepIndex} total={totalSteps} />
            <ProgressBar value={progress} />
        </div>
    );
}

function Question({
    number,
    label,
    required = true,
    error,
    children,
}: {
    number: number;
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    const titleId = `mission-q-${number}`;

    return (
        <section
            id={titleId}
            aria-labelledby={`${titleId}-heading`}
            className="scroll-mt-32 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60 sm:scroll-mt-36 sm:p-5"
        >
            <h3 id={`${titleId}-heading`} className="mb-3 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                {label}
                {required ? (
                    <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
                ) : (
                    <span className="ml-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Opcional
                    </span>
                )}
            </h3>
            <div className="space-y-2">{children}</div>
            {error ? <InputError message={error} className="mt-2" /> : null}
        </section>
    );
}

function MissionPhotoField({
    previewUrl,
    photoPreparing,
    clientError,
    serverError,
    missingOnAdvance,
    onFileChosen,
    onClear,
}: {
    previewUrl: string | null;
    photoPreparing: boolean;
    clientError: string | null;
    serverError?: string;
    missingOnAdvance: boolean;
    onFileChosen: (file: File | null) => void;
    onClear: () => void;
}) {
    const advanceError = missingOnAdvance ? 'Envie uma foto antes de avançar.' : null;

    return (
        <section
            id="mission-photo"
            className="scroll-mt-32 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60 sm:scroll-mt-36 sm:p-5"
        >
            <h3 className="mb-3 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                Foto
                <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
            </h3>
            <ProfilePhotoPicker
                previewUrl={previewUrl}
                photoPreparing={photoPreparing}
                clientError={clientError ?? advanceError}
                serverPhotoError={serverError}
                inputId="mission_photo"
                description="A foto ajuda a equipe a reconhecer você (máx. 4 MB após compressão)."
                onPickStart={markPhotoPickStarted}
                onPhotoFile={onFileChosen}
                onClear={onClear}
            />
        </section>
    );
}

function RadioList({
    name,
    options,
    value,
    onChange,
}: {
    name: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    const safeOptions = options ?? [];

    return (
        <div className="space-y-1.5" role="radiogroup" aria-label={name}>
            {safeOptions.map((opt) => {
                const selected = value === opt;
                return (
                    <button
                        key={`${name}-${opt}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(opt)}
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
                                selected
                                    ? 'border-teal-600 dark:border-teal-400'
                                    : 'border-zinc-300 dark:border-zinc-600',
                            ].join(' ')}
                            aria-hidden
                        >
                            {selected ? (
                                <span className="h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                            ) : null}
                        </span>
                        <span className="text-zinc-800 dark:text-zinc-100">{opt}</span>
                    </button>
                );
            })}
        </div>
    );
}

function CheckboxCardList({
    name,
    options,
    values,
    maxSelections,
    onChange,
}: {
    name: string;
    options: string[];
    values: string[];
    maxSelections?: number;
    onChange: (values: string[]) => void;
}) {
    const safeOptions = options ?? [];
    const selected = new Set(values);

    const toggle = (option: string) => {
        if (selected.has(option)) {
            onChange(values.filter((value) => value !== option));
            return;
        }

        if (maxSelections && values.length >= maxSelections) {
            onChange([...values, option]);
            return;
        }

        onChange([...values, option]);
    };

    return (
        <div className="space-y-1.5" role="group" aria-label={name}>
            {safeOptions.map((opt) => {
                const isSelected = selected.has(opt);

                return (
                    <button
                        key={`${name}-${opt}`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggle(opt)}
                        className={[
                            'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 sm:py-3',
                            isSelected
                                ? 'border-teal-500/80 bg-teal-50/90 ring-1 ring-teal-500/30 dark:border-teal-500/50 dark:bg-teal-950/40'
                                : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50',
                        ].join(' ')}
                    >
                        <span
                            className={[
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold',
                                isSelected
                                    ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-zinc-950'
                                    : 'border-zinc-300 text-zinc-400 dark:border-zinc-600 dark:text-zinc-500',
                            ].join(' ')}
                            aria-hidden
                        >
                            {isSelected ? '✓' : ''}
                        </span>
                        <span className="text-zinc-800 dark:text-zinc-100">{opt}</span>
                    </button>
                );
            })}
        </div>
    );
}

function YesNoRadio({
    name,
    value,
    onChange,
}: {
    name: string;
    value: boolean | null;
    onChange: (v: boolean) => void;
}) {
    return (
        <RadioList
            name={name}
            options={['Não', 'Sim']}
            value={value === true ? 'Sim' : value === false ? 'Não' : ''}
            onChange={(label) => onChange(label === 'Sim')}
        />
    );
}

function OtherField({
    visible,
    value,
    onChange,
    error,
    placeholder = 'Especifique',
}: {
    visible: boolean;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    placeholder?: string;
}) {
    if (!visible) {
        return null;
    }

    return (
        <div className="mt-2 pl-1 sm:pl-2">
            <TextInput
                className="w-full max-w-md"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}

function validateCurrentStep(
    step: MissionStepId,
    data: MissionFormData,
    hasExistingPhoto: boolean,
): string | null {
    if (step === 'photo' && !data.photo && hasExistingPhoto) {
        return null;
    }

    return validateMissionStep(step, data);
}

export default function MissionFormBody({
    form,
    options,
    onSubmit,
    processing,
    saveStepUrl,
    canSaveProgress = false,
    initialStepIndex = 0,
    initialPhotoUrl = null,
    isEditing = false,
    offerAppAccount = false,
}: Props) {
    const { data, setData, errors } = form;
    const visibleSteps = useMemo(() => visibleMissionSteps(data, offerAppAccount), [data, offerAppAccount]);
    const [stepIndex, setStepIndex] = useState(() => {
        const errorIndex = missionErrorStepIndex(errors, data, offerAppAccount);
        if (errorIndex !== null) return errorIndex;
        return Math.min(initialStepIndex, Math.max(visibleMissionSteps(data, offerAppAccount).length - 1, 0));
    });
    const [clientError, setClientError] = useState<string | null>(null);
    const [savingStep, setSavingStep] = useState(false);
    const pageTopRef = useRef<HTMLDivElement>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(initialPhotoUrl);
    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [photoMissingOnAdvance, setPhotoMissingOnAdvance] = useState(false);
    const [interestAreasClientError, setInterestAreasClientError] = useState<string | null>(null);

    const safeOptions = useMemo(
        () => ({
            professions: options.professions ?? [],
            beliefs: options.beliefs ?? [],
            religions: options.religions ?? [],
            seeks_in_community: options.seeks_in_community ?? [],
            studied_bible: options.studied_bible ?? [],
            first_contact_via: options.first_contact_via ?? [],
            wants_bible_study_partner: options.wants_bible_study_partner ?? [],
            spiritual_journey: options.spiritual_journey ?? [],
            comfortable_environment: options.comfortable_environment ?? [],
            group_project_preference: options.group_project_preference ?? [],
            interest_areas: options.interest_areas ?? [],
            learning_style: options.learning_style ?? [],
            personalized_bible_study_interest: options.personalized_bible_study_interest ?? [],
            mission_social_projects_interest: options.mission_social_projects_interest ?? [],
            start_area_preference: options.start_area_preference ?? [],
        }),
        [options],
    );

    const clampedStepIndex = Math.min(Math.max(stepIndex, 0), Math.max(visibleSteps.length - 1, 0));
    const currentStep = visibleSteps[clampedStepIndex] ?? visibleSteps[0] ?? 'photo';
    const sectionTitle = missionStepSectionTitle(currentStep);
    const progress = visibleSteps.length > 0 ? ((clampedStepIndex + 1) / visibleSteps.length) * 100 : 0;
    const hasExistingPhoto = Boolean(initialPhotoUrl || photoPreviewUrl?.startsWith('http'));
    const isLastStep = clampedStepIndex === visibleSteps.length - 1;
    const penultimateStepIndex = Math.max(visibleSteps.length - 2, 0);
    const isBusy = processing || savingStep;

    const patchData = useCallback(
        (fields: Partial<MissionFormData>) => {
            (Object.entries(fields) as [keyof MissionFormData, MissionFormData[keyof MissionFormData]][]).forEach(
                ([key, value]) => {
                    setData(key, value);
                },
            );
        },
        [setData],
    );

    const goToStepIndex = useCallback((next: number | ((current: number) => number)) => {
        setStepIndex((current) => {
            const target = typeof next === 'function' ? next(current) : next;
            return Math.max(0, target);
        });
        setPhotoMissingOnAdvance(false);
        setClientError(null);
    }, []);

    const handlePhotoSelect = useCallback(
        (file: File) => {
            setPhotoClientError(null);
            setPhotoMissingOnAdvance(false);
            setData('photo', file);
            setPhotoPreviewUrl((prev) => {
                if (prev?.startsWith('blob:')) {
                    URL.revokeObjectURL(prev);
                }
                return URL.createObjectURL(file);
            });
        },
        [setData],
    );

    const handlePhotoClear = useCallback(() => {
        setPhotoClientError(null);
        setData('photo', null);
        setPhotoPreviewUrl((prev) => {
            if (prev?.startsWith('blob:')) {
                URL.revokeObjectURL(prev);
            }
            return initialPhotoUrl;
        });
    }, [initialPhotoUrl, setData]);

    const handlePhotoFileChosen = useCallback(
        async (raw: File | null) => {
            setPhotoClientError(null);
            if (!raw) {
                handlePhotoClear();
                return;
            }
            setPhotoPreparing(true);
            try {
                const prepared = await compressImageForUpload(raw);
                handlePhotoSelect(prepared);
            } catch (err) {
                handlePhotoClear();
                setPhotoClientError(
                    err instanceof ImageCompressError
                        ? err.message
                        : 'Não foi possível preparar a imagem para envio.',
                );
            } finally {
                setPhotoPreparing(false);
            }
        },
        [handlePhotoClear, handlePhotoSelect],
    );

    useEffect(() => {
        return () => {
            if (photoPreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreviewUrl);
            }
        };
    }, [photoPreviewUrl]);

    useEffect(() => {
        setStepIndex((current) => Math.min(current, Math.max(visibleSteps.length - 1, 0)));
    }, [visibleSteps.length]);

    useEffect(() => {
        setStepIndex(initialStepIndex);
    }, [initialStepIndex]);

    useEffect(() => {
        const id = window.requestAnimationFrame(() => {
            pageTopRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
        return () => window.cancelAnimationFrame(id);
    }, [clampedStepIndex]);

    useEffect(() => {
        const errorIndex = missionErrorStepIndex(errors, data, offerAppAccount);
        if (errorIndex !== null) {
            setStepIndex(errorIndex);
            setClientError(null);
        }
    }, [errors, data, offerAppAccount]);

    const updateInterestAreas = useCallback(
        (nextValues: string[]) => {
            if (nextValues.length > 3) {
                setInterestAreasClientError('Escolha no máximo três atividades.');
                return;
            }

            setInterestAreasClientError(null);
            setData('interest_areas', nextValues);
        },
        [setData],
    );

    const saveStepAndAdvance = useCallback(
        (step: MissionStepId, onDone?: () => void) => {
            if (!canSaveProgress || !saveStepUrl) {
                onDone?.();
                return;
            }

            setSavingStep(true);
            router.post(saveStepUrl, buildMissionStepPayload(step, data), {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setSavingStep(false),
                onSuccess: () => onDone?.(),
            });
        },
        [canSaveProgress, data, saveStepUrl],
    );

    const advanceStep = useCallback(() => {
        const issue = validateCurrentStep(currentStep, data, hasExistingPhoto);
        if (issue) {
            setClientError(issue);
            if (currentStep === 'photo') {
                setPhotoMissingOnAdvance(true);
            }
            return;
        }

        setClientError(null);
        setPhotoMissingOnAdvance(false);

        const nextIndex = clampedStepIndex + 1;
        const skipPhotoSave = currentStep === 'photo' && !data.photo && hasExistingPhoto;

        if (canSaveProgress && saveStepUrl && !skipPhotoSave) {
            saveStepAndAdvance(currentStep, () => goToStepIndex(nextIndex));
            return;
        }

        goToStepIndex(nextIndex);
    }, [
        canSaveProgress,
        clampedStepIndex,
        currentStep,
        data,
        goToStepIndex,
        hasExistingPhoto,
        saveStepAndAdvance,
        saveStepUrl,
    ]);

    const handleFormSubmit: FormEventHandler = (event) => {
        if (!isLastStep || !isMissionRegistrationSubmitStep(currentStep, data, offerAppAccount)) {
            event.preventDefault();
            return;
        }

        const issue = validateMissionStep(currentStep, data);
        if (issue) {
            event.preventDefault();
            setClientError(issue);
            return;
        }

        setClientError(null);

        if (canSaveProgress && saveStepUrl && currentStep === 'lgpd_consent' && !offerAppAccount) {
            event.preventDefault();
            saveStepAndAdvance('lgpd_consent');
            return;
        }

        const fullIssue = findMissionFormIssue(data, offerAppAccount);
        if (fullIssue) {
            event.preventDefault();
            setClientError(fullIssue.message);
            setStepIndex(fullIssue.stepIndex);
            return;
        }

        onSubmit(event);
    };

    const handleSubmitWithoutAppAccount: FormEventHandler = (event) => {
        event.preventDefault();

        const skipData: MissionFormData = {
            ...data,
            wants_app_account: false,
            app_email: '',
            app_password: '',
            app_password_confirmation: '',
        };

        const fullIssue = findMissionFormIssue(skipData, offerAppAccount);
        if (fullIssue) {
            setClientError(fullIssue.message);
            setStepIndex(fullIssue.stepIndex);
            return;
        }

        setClientError(null);
        patchData({
            wants_app_account: false,
            app_email: '',
            app_password: '',
            app_password_confirmation: '',
        });

        const submitEvent = event as Parameters<FormEventHandler>[0] & { skipAppAccount?: boolean };
        submitEvent.skipAppAccount = true;
        onSubmit(submitEvent);
    };

    const renderStepContent = (step: MissionStepId) => {
        const q = missionStepQuestionNumber(step);

        switch (step) {
            case 'photo':
                return (
                    <MissionPhotoField
                        previewUrl={photoPreviewUrl}
                        photoPreparing={photoPreparing}
                        clientError={photoClientError}
                        serverError={errors.photo}
                        missingOnAdvance={photoMissingOnAdvance}
                        onFileChosen={handlePhotoFileChosen}
                        onClear={handlePhotoClear}
                    />
                );
            case 'full_name':
                return (
                    <Question number={q} label="Nome completo" error={errors.full_name}>
                        <TextInput
                            className="w-full"
                            value={data.full_name}
                            onChange={(e) => setData('full_name', e.target.value)}
                            autoComplete="name"
                        />
                    </Question>
                );
            case 'birth_date':
                return (
                    <Question number={q} label="Data do nascimento" error={errors.birth_date}>
                        <BrDateInput
                            className="w-full max-w-xs"
                            value={data.birth_date}
                            max={todayIsoLocal()}
                            onChange={(iso) => setData('birth_date', iso)}
                        />
                    </Question>
                );
            case 'email':
                return (
                    <Question number={q} label="E-mail" error={errors.email}>
                        <TextInput
                            type="email"
                            className="w-full"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoComplete="email"
                        />
                    </Question>
                );
            case 'phone':
                return (
                    <Question number={q} label="Número de telefone" error={errors.phone}>
                        <TextInput
                            type="tel"
                            className="w-full"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            autoComplete="tel"
                            inputMode="tel"
                        />
                    </Question>
                );
            case 'full_address':
                return (
                    <Question number={q} label="Endereço completo" error={errors.full_address}>
                        <Textarea
                            className="w-full"
                            rows={3}
                            value={data.full_address}
                            onChange={(e) => setData('full_address', e.target.value)}
                        />
                    </Question>
                );
            case 'profession':
                return (
                    <Question number={q} label="Qual a sua profissão?" error={errors.profession}>
                        <RadioList
                            name="profession"
                            options={safeOptions.professions}
                            value={data.profession}
                            onChange={(v) => {
                                patchData({
                                    profession: v,
                                    profession_other: v === 'Outra' ? data.profession_other : '',
                                });
                            }}
                        />
                        <OtherField
                            visible={data.profession === 'Outra'}
                            value={data.profession_other}
                            onChange={(v) => setData('profession_other', v)}
                            error={errors.profession_other}
                            placeholder="Especifique sua profissão"
                        />
                    </Question>
                );
            case 'has_belief':
                return (
                    <Question number={q} label="Você tem alguma crença?" error={errors.has_belief}>
                        <YesNoRadio
                            name="has_belief"
                            value={data.has_belief}
                            onChange={(v) => {
                                if (v) {
                                    patchData({ has_belief: true });
                                } else {
                                    patchData({
                                        has_belief: false,
                                        belief_which: '',
                                        belief_which_other: '',
                                    });
                                }
                            }}
                        />
                    </Question>
                );
            case 'belief_which':
                return (
                    <Question number={q} label="Se sim, qual?" error={errors.belief_which}>
                        <RadioList
                            name="belief_which"
                            options={safeOptions.beliefs}
                            value={data.belief_which}
                            onChange={(v) => {
                                patchData({
                                    belief_which: v,
                                    belief_which_other: v === 'Outra' ? data.belief_which_other : '',
                                });
                            }}
                        />
                        <OtherField
                            visible={data.belief_which === 'Outra'}
                            value={data.belief_which_other}
                            onChange={(v) => setData('belief_which_other', v)}
                            error={errors.belief_which_other}
                        />
                    </Question>
                );
            case 'participates_religion':
                return (
                    <Question
                        number={q}
                        label="Você é participante de uma religião atualmente?"
                        error={errors.participates_religion}
                    >
                        <YesNoRadio
                            name="participates_religion"
                            value={data.participates_religion}
                            onChange={(v) => {
                                if (v) {
                                    patchData({ participates_religion: true });
                                } else {
                                    patchData({
                                        participates_religion: false,
                                        religion_which: '',
                                        religion_which_other: '',
                                    });
                                }
                            }}
                        />
                    </Question>
                );
            case 'religion_which':
                return (
                    <Question number={q} label="Se sim, qual?" error={errors.religion_which}>
                        <RadioList
                            name="religion_which"
                            options={safeOptions.religions}
                            value={data.religion_which}
                            onChange={(v) => {
                                patchData({
                                    religion_which: v,
                                    religion_which_other: v === 'Outra' ? data.religion_which_other : '',
                                });
                            }}
                        />
                        <OtherField
                            visible={data.religion_which === 'Outra'}
                            value={data.religion_which_other}
                            onChange={(v) => setData('religion_which_other', v)}
                            error={errors.religion_which_other}
                        />
                    </Question>
                );
            case 'baptized':
                return (
                    <Question number={q} label="Você já foi batizado?" error={errors.baptized}>
                        <YesNoRadio name="baptized" value={data.baptized} onChange={(v) => setData('baptized', v)} />
                    </Question>
                );
            case 'seeks_in_community':
                return (
                    <Question number={q} label="O que você busca em uma comunidade religiosa?" error={errors.seeks_in_community}>
                        <RadioList
                            name="seeks_in_community"
                            options={safeOptions.seeks_in_community}
                            value={data.seeks_in_community}
                            onChange={(v) => {
                                patchData({
                                    seeks_in_community: v,
                                    seeks_in_community_other: v === 'Outra' ? data.seeks_in_community_other : '',
                                });
                            }}
                        />
                        <OtherField
                            visible={data.seeks_in_community === 'Outra'}
                            value={data.seeks_in_community_other}
                            onChange={(v) => setData('seeks_in_community_other', v)}
                            error={errors.seeks_in_community_other}
                        />
                    </Question>
                );
            case 'studied_bible':
                return (
                    <Question number={q} label="Já estudou a bíblia?" error={errors.studied_bible}>
                        <RadioList
                            name="studied_bible"
                            options={safeOptions.studied_bible}
                            value={data.studied_bible}
                            onChange={(v) => setData('studied_bible', v)}
                        />
                    </Question>
                );
            case 'studied_bible_structured':
                return (
                    <Question
                        number={q}
                        label="Já estudou a bíblia de forma estruturada (curso, em grupo, ou plano de estudo)"
                        error={errors.studied_bible_structured}
                    >
                        <YesNoRadio
                            name="studied_bible_structured"
                            value={data.studied_bible_structured}
                            onChange={(v) => setData('studied_bible_structured', v)}
                        />
                    </Question>
                );
            case 'first_time_nova_semente':
                return (
                    <Question number={q} label="É primeira vez na Nova Semente?" error={errors.first_time_nova_semente}>
                        <YesNoRadio
                            name="first_time_nova_semente"
                            value={data.first_time_nova_semente}
                            onChange={(v) => setData('first_time_nova_semente', v)}
                        />
                    </Question>
                );
            case 'first_contact_via':
                return (
                    <Question
                        number={q}
                        label="Seu primeiro convite/contato com a comunidade foi por meio de:"
                        error={errors.first_contact_via}
                    >
                        <RadioList
                            name="first_contact_via"
                            options={safeOptions.first_contact_via}
                            value={data.first_contact_via}
                            onChange={(v) => {
                                patchData({
                                    first_contact_via: v,
                                    first_contact_via_other: v === 'Outra' ? data.first_contact_via_other : '',
                                });
                            }}
                        />
                        <OtherField
                            visible={data.first_contact_via === 'Outra'}
                            value={data.first_contact_via_other}
                            onChange={(v) => setData('first_contact_via_other', v)}
                            error={errors.first_contact_via_other}
                        />
                    </Question>
                );
            case 'wants_bible_study_partner':
                return (
                    <Question
                        number={q}
                        label="Gostaria de ter alguém para estudar a Bíblia com você?"
                        error={errors.wants_bible_study_partner}
                    >
                        <RadioList
                            name="wants_bible_study_partner"
                            options={safeOptions.wants_bible_study_partner}
                            value={data.wants_bible_study_partner}
                            onChange={(v) => setData('wants_bible_study_partner', v)}
                        />
                    </Question>
                );
            case 'spiritual_journey':
                return (
                    <Question
                        number={q}
                        label="Como você descreveria sua caminhada espiritual hoje?"
                        error={errors.spiritual_journey}
                    >
                        <RadioList
                            name="spiritual_journey"
                            options={safeOptions.spiritual_journey}
                            value={data.spiritual_journey}
                            onChange={(v) => setData('spiritual_journey', v)}
                        />
                    </Question>
                );
            case 'comfortable_environment':
                return (
                    <Question
                        number={q}
                        label="Em qual ambiente você normalmente se sente mais confortável?"
                        error={errors.comfortable_environment}
                    >
                        <RadioList
                            name="comfortable_environment"
                            options={safeOptions.comfortable_environment}
                            value={data.comfortable_environment}
                            onChange={(v) => setData('comfortable_environment', v)}
                        />
                    </Question>
                );
            case 'group_project_preference':
                return (
                    <Question
                        number={q}
                        label="Quando participa de um grupo ou projeto, você normalmente prefere:"
                        error={errors.group_project_preference}
                    >
                        <RadioList
                            name="group_project_preference"
                            options={safeOptions.group_project_preference}
                            value={data.group_project_preference}
                            onChange={(v) => setData('group_project_preference', v)}
                        />
                    </Question>
                );
            case 'interest_areas':
                return (
                    <Question
                        number={q}
                        label="Quais destas atividades despertam mais seu interesse?"
                        error={errors.interest_areas ?? interestAreasClientError ?? undefined}
                    >
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Pode escolher até três.</p>
                        <CheckboxCardList
                            name="interest_areas"
                            options={safeOptions.interest_areas}
                            values={data.interest_areas}
                            maxSelections={3}
                            onChange={updateInterestAreas}
                        />
                    </Question>
                );
            case 'learning_style':
                return (
                    <Question number={q} label="Como você aprende melhor?" error={errors.learning_style}>
                        <RadioList
                            name="learning_style"
                            options={safeOptions.learning_style}
                            value={data.learning_style}
                            onChange={(v) => setData('learning_style', v)}
                        />
                    </Question>
                );
            case 'personalized_bible_study_interest':
                return (
                    <Question
                        number={q}
                        label="Caso houvesse oportunidade, você teria interesse em estudar a Bíblia de maneira personalizada?"
                        error={errors.personalized_bible_study_interest}
                    >
                        <RadioList
                            name="personalized_bible_study_interest"
                            options={safeOptions.personalized_bible_study_interest}
                            value={data.personalized_bible_study_interest}
                            onChange={(v) => setData('personalized_bible_study_interest', v)}
                        />
                    </Question>
                );
            case 'mission_social_projects_interest':
                return (
                    <Question
                        number={q}
                        label="Como você se sente em relação à participação em projetos missionários ou ações sociais?"
                        error={errors.mission_social_projects_interest}
                    >
                        <RadioList
                            name="mission_social_projects_interest"
                            options={safeOptions.mission_social_projects_interest}
                            value={data.mission_social_projects_interest}
                            onChange={(v) => setData('mission_social_projects_interest', v)}
                        />
                    </Question>
                );
            case 'start_area_preference':
                return (
                    <Question
                        number={q}
                        label="Se pudesse escolher uma área para começar sua caminhada na Nova Semente, qual seria?"
                        error={errors.start_area_preference}
                    >
                        <RadioList
                            name="start_area_preference"
                            options={safeOptions.start_area_preference}
                            value={data.start_area_preference}
                            onChange={(v) => setData('start_area_preference', v)}
                        />
                    </Question>
                );
            case 'talents_for_god':
                return (
                    <Question
                        number={q}
                        label="Existe alguma habilidade, experiência ou talento que você gostaria de colocar a serviço de Deus no futuro?"
                        required={false}
                        error={errors.talents_for_god}
                    >
                        <Textarea
                            className="w-full"
                            rows={4}
                            value={data.talents_for_god}
                            onChange={(e) => setData('talents_for_god', e.target.value)}
                        />
                    </Question>
                );
            case 'team_support_notes':
                return (
                    <Question
                        number={q}
                        label="Existe algo que gostaria que nossa equipe soubesse sobre você ou alguma forma específica pela qual poderíamos ajudá-lo neste momento?"
                        required={false}
                        error={errors.team_support_notes}
                    >
                        <Textarea
                            className="w-full"
                            rows={4}
                            value={data.team_support_notes}
                            onChange={(e) => setData('team_support_notes', e.target.value)}
                        />
                    </Question>
                );
            case 'lgpd_consent':
                return (
                    <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-5">
                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                checked={data.lgpd_consent}
                                onChange={(e) => setData('lgpd_consent', e.target.checked)}
                            />
                            <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                Autorizo o uso dos meus dados conforme a LGPD, exclusivamente para o acompanhamento
                                missionário da igreja. <span className="text-red-600 dark:text-red-400">*</span>
                            </span>
                        </label>
                        <InputError message={errors.lgpd_consent} className="mt-2" />
                    </div>
                );
            case 'app_account_choice':
                return (
                    <Question
                        number={q}
                        label="Deseja criar uma conta no aplicativo agora?"
                        error={errors.wants_app_account}
                    >
                        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                            Com a conta você acompanha cultos, avisos e outros recursos da igreja no celular. Usaremos
                            seu nome, e-mail e telefone já informados no cadastro.
                        </p>
                        <YesNoRadio
                            name="wants_app_account"
                            value={data.wants_app_account}
                            onChange={(next) => {
                                patchData({
                                    wants_app_account: next,
                                    ...(next
                                        ? {
                                              app_email: data.app_email.trim() || data.email.trim(),
                                          }
                                        : {
                                              app_email: '',
                                              app_password: '',
                                              app_password_confirmation: '',
                                          }),
                                });
                            }}
                        />
                    </Question>
                );
            case 'app_account_credentials': {
                const registrationEmail = data.email.trim();
                const appEmail = data.app_email.trim() || registrationEmail;

                return (
                    <Question number={q} label="Conta no aplicativo" error={errors.app_email || errors.app_password}>
                        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                            Defina uma senha para acessar o app. Seu nome ({data.full_name || 'cadastro'}), e-mail (
                            {appEmail || 'informado'}) e telefone ({data.phone || 'informado'}) serão usados
                            automaticamente. Se preferir, você pode enviar o cadastro missionário sem criar conta no app
                            agora.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="mission_app_email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    E-mail
                                </label>
                                {registrationEmail ? (
                                    <p
                                        id="mission_app_email"
                                        className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                    >
                                        {registrationEmail}
                                    </p>
                                ) : (
                                    <TextInput
                                        id="mission_app_email"
                                        type="email"
                                        className="mt-1 w-full"
                                        value={data.app_email}
                                        onChange={(e) => setData('app_email', e.target.value)}
                                        autoComplete="email"
                                    />
                                )}
                                <InputError message={errors.app_email} className="mt-1" />
                            </div>
                            <div>
                                <label htmlFor="mission_app_password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Senha
                                </label>
                                <TextInput
                                    id="mission_app_password"
                                    type="password"
                                    className="mt-1 w-full"
                                    value={data.app_password}
                                    onChange={(e) => setData('app_password', e.target.value)}
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.app_password} className="mt-1" />
                            </div>
                            <div>
                                <label
                                    htmlFor="mission_app_password_confirmation"
                                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    Confirmar senha
                                </label>
                                <TextInput
                                    id="mission_app_password_confirmation"
                                    type="password"
                                    className="mt-1 w-full"
                                    value={data.app_password_confirmation}
                                    onChange={(e) => setData('app_password_confirmation', e.target.value)}
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.app_password_confirmation} className="mt-1" />
                            </div>
                        </div>
                    </Question>
                );
            }
            default:
                return null;
        }
    };

    return (
        <form onSubmit={handleFormSubmit} className="pb-24 sm:pb-12">
            <div ref={pageTopRef} className="mb-6 scroll-mt-28 sm:scroll-mt-32">
                <MissionProgressHeader
                    sectionTitle={sectionTitle}
                    stepIndex={clampedStepIndex}
                    totalSteps={visibleSteps.length}
                    progress={progress}
                />
            </div>

            {clientError ? (
                <div
                    className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                    role="alert"
                >
                    {clientError}
                </div>
            ) : null}

            <div className="space-y-4 sm:space-y-5">{renderStepContent(currentStep)}</div>

            <FormNav
                stepIndex={clampedStepIndex}
                goToStepIndex={goToStepIndex}
                onAdvance={advanceStep}
                processing={isBusy}
                total={visibleSteps.length}
                penultimateStepIndex={penultimateStepIndex}
                isLastStep={isLastStep}
                isEditing={isEditing}
                submitLabel={
                    currentStep === 'app_account_credentials'
                        ? 'Salvar com acesso App'
                        : currentStep === 'app_account_choice' && data.wants_app_account === false
                          ? 'Salvar sem acesso ao App'
                        : isEditing
                          ? 'Salvar alterações'
                          : 'Enviar'
                }
                skipAppAccountLabel={
                    currentStep === 'app_account_credentials' ? 'Salvar sem acesso ao App' : undefined
                }
                onSkipAppAccount={handleSubmitWithoutAppAccount}
            />
        </form>
    );
}

function FormNav({
    stepIndex,
    goToStepIndex,
    onAdvance,
    processing,
    total,
    penultimateStepIndex,
    isLastStep,
    isEditing = false,
    submitLabel = 'Enviar',
    skipAppAccountLabel,
    onSkipAppAccount,
}: {
    stepIndex: number;
    goToStepIndex: (next: number | ((current: number) => number)) => void;
    onAdvance: () => void;
    processing: boolean;
    total: number;
    penultimateStepIndex: number;
    isLastStep: boolean;
    isEditing?: boolean;
    submitLabel?: string;
    skipAppAccountLabel?: string;
    onSkipAppAccount?: FormEventHandler;
}) {
    const showAdvance = !isLastStep;
    const advanceLabel = stepIndex === penultimateStepIndex ? 'Quase lá — Avançar' : 'Avançar';

    const handleAdvance = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        window.requestAnimationFrame(() => {
            onAdvance();
        });
    };

    return (
        <div className="mt-8 border-t border-zinc-200/90 pt-5 dark:border-zinc-800">
            <div className="flex gap-3">
                {stepIndex > 0 ? (
                    <SecondaryButton
                        type="button"
                        className="min-w-[7rem] flex-1 sm:flex-none"
                        onClick={() => goToStepIndex((i) => i - 1)}
                    >
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
                    disabled={processing}
                    tabIndex={showAdvance ? 0 : -1}
                    aria-hidden={!showAdvance}
                >
                    {processing && showAdvance ? 'Salvando…' : advanceLabel}
                </PrimaryButton>
                <PrimaryButton
                    type="submit"
                    className={[
                        'flex-1 sm:min-w-[7rem] sm:flex-none',
                        showAdvance ? 'pointer-events-none invisible absolute w-0 overflow-hidden p-0 opacity-0' : '',
                    ].join(' ')}
                    disabled={processing || showAdvance}
                    tabIndex={showAdvance ? -1 : 0}
                    aria-hidden={showAdvance}
                >
                    {processing ? 'Enviando…' : submitLabel}
                </PrimaryButton>
            </div>
            {skipAppAccountLabel && onSkipAppAccount ? (
                <SecondaryButton
                    type="button"
                    className="mt-3 w-full justify-center"
                    disabled={processing}
                    onClick={(event) => onSkipAppAccount(event)}
                >
                    {processing ? 'Enviando…' : skipAppAccountLabel}
                </SecondaryButton>
            ) : null}
        </div>
    );
}
