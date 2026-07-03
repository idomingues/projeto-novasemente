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
import { findMissionFormIssue, missionErrorPage } from '@/utils/missionFormValidation';
import { useForm } from '@inertiajs/react';
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
    phone: string;
    full_address: string;
    profession: string;
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
};

const PAGE_TITLES = [
    'Dados pessoais',
    'Profissão',
    'Fé e crença',
    'Religião',
    'Comunidade e Bíblia',
    'Nova Semente',
    'Caminhada e convivência',
    'Interesses',
    'Compartilhe mais',
] as const;
const COMMUNITY_PAGE_INDEX = 4;
const NOVA_SEMENTE_PAGE_INDEX = 5;
const JOURNEY_PAGE_INDEX = 6;
const INTERESTS_PAGE_INDEX = 7;
const LAST_PAGE_INDEX = 8;
const PAGE_FIRST_QUESTION_NUMBERS = [1, 5, 6, 9, 11, 14, 17, 20, 25] as const;

interface Props {
    form: MissionFormReturn;
    options: MissionOptions;
    onSubmit: FormEventHandler;
    processing: boolean;
    formRevision?: number;
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
                <span className="mr-1.5 tabular-nums text-zinc-500 dark:text-zinc-400">{number}.</span>
                {label}
                {required ? <span className="ml-0.5 text-red-600 dark:text-red-400">*</span> : null}
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

function ConditionalBlock({ show, children }: { show: boolean; children: React.ReactNode }) {
    if (!show) {
        return null;
    }

    return <div className="space-y-4 sm:space-y-5">{children}</div>;
}

function NovaSementeQuestions({
    data,
    errors,
    safeOptions,
    patchData,
    setData,
}: {
    data: MissionFormData;
    errors: Partial<Record<keyof MissionFormData, string>>;
    safeOptions: {
        first_contact_via: string[];
        wants_bible_study_partner: string[];
    };
    patchData: (fields: Partial<MissionFormData>) => void;
    setData: MissionFormReturn['setData'];
}) {
    return (
        <div className="space-y-4 sm:space-y-5">
            <Question number={14} label="É primeira vez na Nova Semente?" error={errors.first_time_nova_semente}>
                <YesNoRadio
                    name="first_time_nova_semente"
                    value={data.first_time_nova_semente}
                    onChange={(v) => setData('first_time_nova_semente', v)}
                />
            </Question>
            <Question
                number={15}
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
            <Question
                number={16}
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
        </div>
    );
}

function JourneyAndGroupQuestions({
    data,
    errors,
    safeOptions,
    setData,
}: {
    data: MissionFormData;
    errors: Partial<Record<keyof MissionFormData, string>>;
    safeOptions: {
        spiritual_journey: string[];
        comfortable_environment: string[];
        group_project_preference: string[];
    };
    setData: MissionFormReturn['setData'];
}) {
    return (
        <div className="space-y-4 sm:space-y-5">
            <Question number={17} label="Como você descreveria sua caminhada espiritual hoje?" error={errors.spiritual_journey}>
                <RadioList
                    name="spiritual_journey"
                    options={safeOptions.spiritual_journey}
                    value={data.spiritual_journey}
                    onChange={(v) => setData('spiritual_journey', v)}
                />
            </Question>
            <Question
                number={18}
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
            <Question
                number={19}
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
        </div>
    );
}

function InterestsAndLearningQuestions({
    data,
    errors,
    interestAreasClientError,
    safeOptions,
    onInterestAreasChange,
    setData,
}: {
    data: MissionFormData;
    errors: Partial<Record<keyof MissionFormData, string>>;
    interestAreasClientError: string | null;
    safeOptions: {
        interest_areas: string[];
        learning_style: string[];
        personalized_bible_study_interest: string[];
        mission_social_projects_interest: string[];
        start_area_preference: string[];
    };
    onInterestAreasChange: (values: string[]) => void;
    setData: MissionFormReturn['setData'];
}) {
    return (
        <div className="space-y-4 sm:space-y-5">
            <Question
                number={20}
                label="Quais destas atividades despertam mais seu interesse?"
                error={errors.interest_areas ?? interestAreasClientError ?? undefined}
            >
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Pode escolher até três.</p>
                <CheckboxCardList
                    name="interest_areas"
                    options={safeOptions.interest_areas}
                    values={data.interest_areas}
                    maxSelections={3}
                    onChange={onInterestAreasChange}
                />
            </Question>
            <Question number={21} label="Como você aprende melhor?" error={errors.learning_style}>
                <RadioList
                    name="learning_style"
                    options={safeOptions.learning_style}
                    value={data.learning_style}
                    onChange={(v) => setData('learning_style', v)}
                />
            </Question>
            <Question
                number={22}
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
            <Question
                number={23}
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
            <Question
                number={24}
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
        </div>
    );
}

function FinalMissionQuestions({
    data,
    errors,
    setData,
}: {
    data: MissionFormData;
    errors: Partial<Record<keyof MissionFormData, string>>;
    setData: MissionFormReturn['setData'];
}) {
    return (
        <div className="space-y-4 sm:space-y-5">
            <Question
                number={25}
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
            <Question
                number={26}
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
            <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-5">
                <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox checked={data.lgpd_consent} onChange={(e) => setData('lgpd_consent', e.target.checked)} />
                    <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        Autorizo o uso dos meus dados conforme a LGPD, exclusivamente para o acompanhamento missionário da
                        igreja. <span className="text-red-600 dark:text-red-400">*</span>
                    </span>
                </label>
                <InputError message={errors.lgpd_consent} className="mt-2" />
            </div>
        </div>
    );
}

export default function MissionFormBody({ form, options, onSubmit, processing, formRevision }: Props) {
    const { data, setData, errors } = form;
    const [page, setPage] = useState(() => missionErrorPage(errors) ?? 0);
    const [clientError, setClientError] = useState<string | null>(null);
    const pageTopRef = useRef<HTMLDivElement>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
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

    const progress = useMemo(() => ((page + 1) / PAGE_TITLES.length) * 100, [page]);

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

    const goToPage = useCallback(
        (next: number | ((current: number) => number)) => {
            setPage((current) => {
                const target = typeof next === 'function' ? next(current) : next;
                if (target > current && current === 0 && !data.photo) {
                    setPhotoMissingOnAdvance(true);
                    return current;
                }
                setPhotoMissingOnAdvance(false);
                return target;
            });
        },
        [data.photo],
    );

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
            return null;
        });
    }, [setData]);

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
        const id = window.requestAnimationFrame(() => {
            if (page > 0) {
                const firstQuestionNumber = PAGE_FIRST_QUESTION_NUMBERS[page];
                document.getElementById(`mission-q-${firstQuestionNumber}`)?.scrollIntoView({
                    block: 'start',
                    behavior: 'auto',
                });
                return;
            }
            pageTopRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
        return () => window.cancelAnimationFrame(id);
    }, [page]);

    useEffect(() => {
        const errorPage = missionErrorPage(errors);
        if (errorPage !== null) {
            setPage(errorPage);
            setClientError(null);
        }
    }, [errors]);

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

    const showBeliefDetail = data.has_belief === true;
    const showReligionDetail = data.participates_religion === true;

    const handleFormSubmit: FormEventHandler = (event) => {
        if (page !== LAST_PAGE_INDEX) {
            event.preventDefault();
            return;
        }
        const issue = findMissionFormIssue(data);
        if (issue) {
            event.preventDefault();
            setClientError(issue.message);
            setPage(issue.page);
            return;
        }
        setClientError(null);
        onSubmit(event);
    };

    return (
        <form onSubmit={handleFormSubmit} className="pb-24 sm:pb-12">
            <div ref={pageTopRef} className="mb-6 scroll-mt-28 space-y-2 sm:scroll-mt-32">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>
                        Página {page + 1} de {PAGE_TITLES.length}
                    </span>
                    <span>{PAGE_TITLES[page]}</span>
                </div>
                <ProgressBar value={progress} />
                {formRevision != null ? (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Formulário v{formRevision}</p>
                ) : null}
            </div>

            {clientError ? (
                <div
                    className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                    role="alert"
                >
                    {clientError}
                </div>
            ) : null}

            <div className="space-y-4 sm:space-y-5">
                {page === 0 && (
                    <>
                        <MissionPhotoField
                            previewUrl={photoPreviewUrl}
                            photoPreparing={photoPreparing}
                            clientError={photoClientError}
                            serverError={errors.photo}
                            missingOnAdvance={photoMissingOnAdvance}
                            onFileChosen={handlePhotoFileChosen}
                            onClear={handlePhotoClear}
                        />
                        <Question number={1} label="Nome completo" error={errors.full_name}>
                            <TextInput
                                className="w-full"
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                autoComplete="name"
                            />
                        </Question>
                        <Question number={2} label="Data do nascimento" error={errors.birth_date}>
                            <BrDateInput
                                className="w-full max-w-xs"
                                value={data.birth_date}
                                max={todayIsoLocal()}
                                onChange={(iso) => setData('birth_date', iso)}
                            />
                        </Question>
                        <Question number={3} label="Número de telefone" error={errors.phone}>
                            <TextInput
                                type="tel"
                                className="w-full"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                autoComplete="tel"
                                inputMode="tel"
                            />
                        </Question>
                        <Question number={4} label="Endereço completo" error={errors.full_address}>
                            <Textarea
                                className="w-full"
                                rows={3}
                                value={data.full_address}
                                onChange={(e) => setData('full_address', e.target.value)}
                            />
                        </Question>
                    </>
                )}

                {page === 1 && (
                    <Question number={5} label="Qual a sua profissão?" error={errors.profession}>
                        <RadioList
                            name="profession"
                            options={safeOptions.professions}
                            value={data.profession}
                            onChange={(v) => setData('profession', v)}
                        />
                    </Question>
                )}

                {page === 2 && (
                    <>
                        <Question number={6} label="Você tem alguma crença?" error={errors.has_belief}>
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
                        <ConditionalBlock show={showBeliefDetail}>
                            <Question number={7} label="Se sim, qual?" error={errors.belief_which}>
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
                        </ConditionalBlock>
                        <Question number={8} label="Você é participante de uma religião atualmente?" error={errors.participates_religion}>
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
                    </>
                )}

                {page === 3 && (
                    <>
                        <ConditionalBlock show={showReligionDetail}>
                            <Question number={9} label="Se sim, qual?" error={errors.religion_which}>
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
                        </ConditionalBlock>
                        <Question number={10} label="Você já foi batizado?" error={errors.baptized}>
                            <YesNoRadio name="baptized" value={data.baptized} onChange={(v) => setData('baptized', v)} />
                        </Question>
                    </>
                )}

                {page === COMMUNITY_PAGE_INDEX && (
                    <>
                        <Question number={11} label="O que você busca em uma comunidade religiosa?" error={errors.seeks_in_community}>
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
                        <Question number={12} label="Já estudou a bíblia?" error={errors.studied_bible}>
                            <RadioList
                                name="studied_bible"
                                options={safeOptions.studied_bible}
                                value={data.studied_bible}
                                onChange={(v) => setData('studied_bible', v)}
                            />
                        </Question>
                        <Question
                            number={13}
                            label="Já estudou a bíblia de forma estruturada (curso, em grupo, ou plano de estudo)"
                            error={errors.studied_bible_structured}
                        >
                            <YesNoRadio
                                name="studied_bible_structured"
                                value={data.studied_bible_structured}
                                onChange={(v) => setData('studied_bible_structured', v)}
                            />
                        </Question>
                    </>
                )}

                {page === NOVA_SEMENTE_PAGE_INDEX && (
                    <NovaSementeQuestions
                        data={data}
                        errors={errors}
                        safeOptions={safeOptions}
                        patchData={patchData}
                        setData={setData}
                    />
                )}

                {page === JOURNEY_PAGE_INDEX && (
                    <JourneyAndGroupQuestions
                        data={data}
                        errors={errors}
                        safeOptions={safeOptions}
                        setData={setData}
                    />
                )}

                {page === INTERESTS_PAGE_INDEX && (
                    <InterestsAndLearningQuestions
                        data={data}
                        errors={errors}
                        interestAreasClientError={interestAreasClientError}
                        safeOptions={safeOptions}
                        onInterestAreasChange={updateInterestAreas}
                        setData={setData}
                    />
                )}

                {page === LAST_PAGE_INDEX && <FinalMissionQuestions data={data} errors={errors} setData={setData} />}
            </div>

            <FormNav page={page} goToPage={goToPage} processing={processing} total={PAGE_TITLES.length} />
        </form>
    );
}

function FormNav({
    page,
    goToPage,
    processing,
    total,
}: {
    page: number;
    goToPage: (next: number | ((current: number) => number)) => void;
    processing: boolean;
    total: number;
}) {
    const showAdvance = page < total - 1;

    const handleAdvance = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const nextPage = page + 1;
        window.requestAnimationFrame(() => {
            goToPage(nextPage);
        });
    };

    return (
        <div className="mt-8 border-t border-zinc-200/90 pt-5 dark:border-zinc-800">
            <div className="flex gap-3">
                {page > 0 ? (
                    <SecondaryButton type="button" className="min-w-[7rem] flex-1 sm:flex-none" onClick={() => goToPage((p) => p - 1)}>
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
                    tabIndex={showAdvance ? 0 : -1}
                    aria-hidden={!showAdvance}
                >
                    Avançar
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
                    {processing ? 'Enviando…' : 'Enviar'}
                </PrimaryButton>
            </div>
        </div>
    );
}
