import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import ProfilePhotoPicker from '@/Components/ProfilePhotoPicker';
import BrDateInput from '@/Components/BrDateInput';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import type { MissionFormData, MissionOptions } from '@/Components/Mission/MissionFormBody';
import type { MissionVolunteerDetail } from '@/utils/missionVolunteerDetailRows';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { markPhotoPickStarted } from '@/utils/mobilePhotoPick';
import { resolveBrDateDisplayForSubmit, todayIsoLocal } from '@/utils/brDate';
import {
    buildMissionVolunteerUpdateFormData,
    mapMissionVolunteerUpdateErrors,
    missionVolunteerDetailToFormData,
    type MissionVolunteerFormErrors,
} from '@/utils/missionVolunteerEditForm';
import axios from 'axios';
import { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
    volunteer: MissionVolunteerDetail;
    options: MissionOptions;
    updateUrl: string;
    onSaved: (volunteer: MissionVolunteerDetail) => void;
};

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/50 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/40">
            <h3 className="border-b border-zinc-200/90 bg-teal-600/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-teal-900 dark:border-zinc-700 dark:bg-teal-500/10 dark:text-teal-200">
                {title}
            </h3>
            <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
        </section>
    );
}

function Field({
    label,
    className = '',
    children,
    error,
}: {
    label: string;
    className?: string;
    children: React.ReactNode;
    error?: string;
}) {
    return (
        <div className={className}>
            <InputLabel value={label} />
            <div className="mt-1">{children}</div>
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}

function YesNoField({
    label,
    name,
    value,
    onChange,
    error,
}: {
    label: string;
    name: string;
    value: boolean | null;
    onChange: (next: boolean) => void;
    error?: string;
}) {
    return (
        <Field label={label} className="sm:col-span-2" error={error}>
            <div className="flex flex-wrap gap-3">
                {[
                    { label: 'Sim', val: true },
                    { label: 'Não', val: false },
                ].map((opt) => (
                    <label key={opt.label} className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                        <input
                            type="radio"
                            name={name}
                            checked={value === opt.val}
                            onChange={() => onChange(opt.val)}
                            className="cursor-pointer text-teal-600 focus:ring-teal-500"
                        />
                        {opt.label}
                    </label>
                ))}
            </div>
        </Field>
    );
}

function RadioOptions({
    name,
    options,
    value,
    onChange,
}: {
    name: string;
    options: string[];
    value: string;
    onChange: (next: string) => void;
}) {
    return (
        <div className="space-y-2">
            {options.map((opt) => (
                <label
                    key={opt}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200/90 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                >
                    <input
                        type="radio"
                        name={name}
                        checked={value === opt}
                        onChange={() => onChange(opt)}
                        className="mt-0.5 cursor-pointer text-teal-600 focus:ring-teal-500"
                    />
                    <span>{opt}</span>
                </label>
            ))}
        </div>
    );
}

export default function MissionVolunteerDetailEditForm({ volunteer, options, updateUrl, onSaved }: Props) {
    const [data, setData] = useState<MissionFormData>(() => missionVolunteerDetailToFormData(volunteer));
    const [errors, setErrors] = useState<MissionVolunteerFormErrors>({});
    const [processing, setProcessing] = useState(false);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(volunteer.photoUrl ?? null);
    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [interestAreasError, setInterestAreasError] = useState<string | null>(null);

    useEffect(() => {
        setData(missionVolunteerDetailToFormData(volunteer));
        setPhotoPreviewUrl(volunteer.photoUrl ?? null);
        setErrors({});
        setSavedMessage(null);
    }, [volunteer.id]);

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

    const patch = useCallback((fields: Partial<MissionFormData>) => {
        setData((current) => ({ ...current, ...fields }));
        setSavedMessage(null);
    }, []);

    const handlePhotoFile = useCallback(
        async (raw: File | null) => {
            setPhotoClientError(null);
            if (!raw) {
                patch({ photo: null });
                setPhotoPreviewUrl(volunteer.photoUrl ?? null);
                return;
            }
            setPhotoPreparing(true);
            try {
                const prepared = await compressImageForUpload(raw);
                patch({ photo: prepared });
                setPhotoPreviewUrl((prev) => {
                    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(prepared);
                });
            } catch (err) {
                patch({ photo: null });
                setPhotoPreviewUrl(volunteer.photoUrl ?? null);
                setPhotoClientError(
                    err instanceof ImageCompressError ? err.message : 'Não foi possível preparar a imagem para envio.',
                );
            } finally {
                setPhotoPreparing(false);
            }
        },
        [patch, volunteer.photoUrl],
    );

    const toggleInterestArea = (area: string) => {
        setInterestAreasError(null);
        setSavedMessage(null);
        setData((current) => {
            const selected = current.interest_areas.includes(area)
                ? current.interest_areas.filter((item) => item !== area)
                : [...current.interest_areas, area];
            if (selected.length > 3) {
                setInterestAreasError('Escolha no máximo três atividades.');
                return current;
            }
            return { ...current, interest_areas: selected };
        });
    };

    const submit: FormEventHandler = async (event) => {
        event.preventDefault();
        if (interestAreasError) return;

        const birthDateEl = document.getElementById('mission_admin_birth_date') as HTMLInputElement | null;
        const birthDate = resolveBrDateDisplayForSubmit(
            birthDateEl?.value ?? '',
            data.birth_date,
            undefined,
            todayIsoLocal(),
        );
        const payload: MissionFormData = { ...data, birth_date: birthDate };

        setProcessing(true);
        setErrors({});
        setSavedMessage(null);

        try {
            const formData = buildMissionVolunteerUpdateFormData(payload);
            const { data: response } = await axios.patch<{ volunteer: MissionVolunteerDetail; message: string }>(updateUrl, formData, {
                headers: { Accept: 'application/json' },
            });
            setData(missionVolunteerDetailToFormData(response.volunteer));
            setPhotoPreviewUrl(response.volunteer.photoUrl ?? null);
            onSaved(response.volunteer);
            setSavedMessage(response.message);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                setErrors(mapMissionVolunteerUpdateErrors(error.response.data?.errors));
                return;
            }
            setErrors({ full_name: 'Não foi possível salvar. Tente novamente.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {savedMessage ? (
                <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
                    {savedMessage}
                </p>
            ) : null}

            <EditSection title="Dados pessoais">
                <Field label="Foto" className="sm:col-span-2" error={errors.photo}>
                    <ProfilePhotoPicker
                        previewUrl={photoPreviewUrl}
                        photoPreparing={photoPreparing}
                        clientError={photoClientError}
                        serverPhotoError={errors.photo}
                        inputId="mission_admin_photo"
                        description="Opcional — substitui a foto atual ao enviar uma nova."
                        onPickStart={markPhotoPickStarted}
                        onPhotoFile={handlePhotoFile}
                        onClear={() => void handlePhotoFile(null)}
                    />
                </Field>
                <Field label="Nome completo" error={errors.full_name}>
                    <TextInput className="w-full" value={data.full_name} onChange={(e) => patch({ full_name: e.target.value })} />
                </Field>
                <Field label="Data de nascimento" error={errors.birth_date}>
                    <BrDateInput
                        id="mission_admin_birth_date"
                        className="w-full"
                        value={data.birth_date}
                        max={todayIsoLocal()}
                        onChange={(iso) => patch({ birth_date: iso })}
                    />
                </Field>
                <Field label="E-mail" error={errors.email}>
                    <TextInput
                        type="email"
                        className="w-full"
                        value={data.email}
                        onChange={(e) => patch({ email: e.target.value })}
                        autoComplete="email"
                    />
                </Field>
                <Field label="Telefone" error={errors.phone}>
                    <TextInput className="w-full" value={data.phone} onChange={(e) => patch({ phone: e.target.value })} />
                </Field>
                <Field label="Endereço completo" className="sm:col-span-2" error={errors.full_address}>
                    <Textarea className="w-full" rows={3} value={data.full_address} onChange={(e) => patch({ full_address: e.target.value })} />
                </Field>
            </EditSection>

            <EditSection title="Profissão">
                <Field label="Profissão" className="sm:col-span-2" error={errors.profession}>
                    <SelectInput className="w-full" value={data.profession} onChange={(e) => patch({ profession: e.target.value, profession_other: e.target.value === 'Outra' ? data.profession_other : '' })}>
                        <option value="">—</option>
                        {safeOptions.professions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </SelectInput>
                </Field>
                {data.profession === 'Outra' ? (
                    <Field label="Especifique a profissão" className="sm:col-span-2" error={errors.profession_other}>
                        <TextInput className="w-full" value={data.profession_other} onChange={(e) => patch({ profession_other: e.target.value })} />
                    </Field>
                ) : null}
            </EditSection>

            <EditSection title="Fé e crença">
                <YesNoField
                    label="Tem alguma crença?"
                    name="has_belief"
                    value={data.has_belief}
                    error={errors.has_belief}
                    onChange={(next) =>
                        patch(
                            next
                                ? { has_belief: true }
                                : { has_belief: false, belief_which: '', belief_which_other: '' },
                        )
                    }
                />
                {data.has_belief === true ? (
                    <Field label="Qual crença?" className="sm:col-span-2" error={errors.belief_which}>
                        <RadioOptions
                            name="belief_which"
                            options={safeOptions.beliefs}
                            value={data.belief_which}
                            onChange={(next) => patch({ belief_which: next, belief_which_other: next === 'Outra' ? data.belief_which_other : '' })}
                        />
                        {data.belief_which === 'Outra' ? (
                            <TextInput
                                className="mt-2 w-full"
                                value={data.belief_which_other}
                                onChange={(e) => patch({ belief_which_other: e.target.value })}
                                placeholder="Especifique"
                            />
                        ) : null}
                        {errors.belief_which_other ? <InputError message={errors.belief_which_other} className="mt-1" /> : null}
                    </Field>
                ) : null}
            </EditSection>

            <EditSection title="Religião">
                <YesNoField
                    label="Participa de alguma religião?"
                    name="participates_religion"
                    value={data.participates_religion}
                    error={errors.participates_religion}
                    onChange={(next) =>
                        patch(
                            next
                                ? { participates_religion: true }
                                : { participates_religion: false, religion_which: '', religion_which_other: '' },
                        )
                    }
                />
                {data.participates_religion === true ? (
                    <Field label="Qual religião?" className="sm:col-span-2" error={errors.religion_which}>
                        <RadioOptions
                            name="religion_which"
                            options={safeOptions.religions}
                            value={data.religion_which}
                            onChange={(next) => patch({ religion_which: next, religion_which_other: next === 'Outra' ? data.religion_which_other : '' })}
                        />
                        {data.religion_which === 'Outra' ? (
                            <TextInput
                                className="mt-2 w-full"
                                value={data.religion_which_other}
                                onChange={(e) => patch({ religion_which_other: e.target.value })}
                                placeholder="Especifique"
                            />
                        ) : null}
                        {errors.religion_which_other ? <InputError message={errors.religion_which_other} className="mt-1" /> : null}
                    </Field>
                ) : null}
                <YesNoField label="É batizado(a)?" name="baptized" value={data.baptized} error={errors.baptized} onChange={(next) => patch({ baptized: next })} />
            </EditSection>

            <EditSection title="Comunidade e Bíblia">
                <Field label="O que busca na comunidade?" className="sm:col-span-2" error={errors.seeks_in_community}>
                    <RadioOptions
                        name="seeks_in_community"
                        options={safeOptions.seeks_in_community}
                        value={data.seeks_in_community}
                        onChange={(next) => patch({ seeks_in_community: next, seeks_in_community_other: next === 'Outra' ? data.seeks_in_community_other : '' })}
                    />
                    {data.seeks_in_community === 'Outra' ? (
                        <TextInput
                            className="mt-2 w-full"
                            value={data.seeks_in_community_other}
                            onChange={(e) => patch({ seeks_in_community_other: e.target.value })}
                            placeholder="Especifique"
                        />
                    ) : null}
                </Field>
                <Field label="Já estudou a Bíblia?" className="sm:col-span-2" error={errors.studied_bible}>
                    <RadioOptions
                        name="studied_bible"
                        options={safeOptions.studied_bible}
                        value={data.studied_bible}
                        onChange={(next) => patch({ studied_bible: next })}
                    />
                </Field>
                <YesNoField
                    label="Estudo bíblico estruturado?"
                    name="studied_bible_structured"
                    value={data.studied_bible_structured}
                    error={errors.studied_bible_structured}
                    onChange={(next) => patch({ studied_bible_structured: next })}
                />
            </EditSection>

            <EditSection title="Nova Semente">
                <YesNoField
                    label="Primeira vez na Nova Semente?"
                    name="first_time_nova_semente"
                    value={data.first_time_nova_semente}
                    error={errors.first_time_nova_semente}
                    onChange={(next) => patch({ first_time_nova_semente: next })}
                />
                <Field label="Como nos conheceu?" className="sm:col-span-2" error={errors.first_contact_via}>
                    <RadioOptions
                        name="first_contact_via"
                        options={safeOptions.first_contact_via}
                        value={data.first_contact_via}
                        onChange={(next) => patch({ first_contact_via: next, first_contact_via_other: next === 'Outra' ? data.first_contact_via_other : '' })}
                    />
                    {data.first_contact_via === 'Outra' ? (
                        <TextInput
                            className="mt-2 w-full"
                            value={data.first_contact_via_other}
                            onChange={(e) => patch({ first_contact_via_other: e.target.value })}
                            placeholder="Especifique"
                        />
                    ) : null}
                </Field>
                <Field label="Parceiro(a) de estudo bíblico?" className="sm:col-span-2" error={errors.wants_bible_study_partner}>
                    <RadioOptions
                        name="wants_bible_study_partner"
                        options={safeOptions.wants_bible_study_partner}
                        value={data.wants_bible_study_partner}
                        onChange={(next) => patch({ wants_bible_study_partner: next })}
                    />
                </Field>
            </EditSection>

            <EditSection title="Caminhada e convivência">
                <Field label="Caminhada espiritual hoje" className="sm:col-span-2" error={errors.spiritual_journey}>
                    <RadioOptions
                        name="spiritual_journey"
                        options={safeOptions.spiritual_journey}
                        value={data.spiritual_journey}
                        onChange={(next) => patch({ spiritual_journey: next })}
                    />
                </Field>
                <Field label="Ambiente mais confortável" className="sm:col-span-2" error={errors.comfortable_environment}>
                    <RadioOptions
                        name="comfortable_environment"
                        options={safeOptions.comfortable_environment}
                        value={data.comfortable_environment}
                        onChange={(next) => patch({ comfortable_environment: next })}
                    />
                </Field>
                <Field label="Preferência em grupo ou projeto" className="sm:col-span-2" error={errors.group_project_preference}>
                    <RadioOptions
                        name="group_project_preference"
                        options={safeOptions.group_project_preference}
                        value={data.group_project_preference}
                        onChange={(next) => patch({ group_project_preference: next })}
                    />
                </Field>
            </EditSection>

            <EditSection title="Interesses e aprendizado">
                <Field label="Atividades de interesse (até 3)" className="sm:col-span-2" error={errors.interest_areas ?? interestAreasError ?? undefined}>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {safeOptions.interest_areas.map((area) => (
                            <label key={area} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                                <Checkbox checked={data.interest_areas.includes(area)} onChange={() => toggleInterestArea(area)} />
                                {area}
                            </label>
                        ))}
                    </div>
                </Field>
                <Field label="Como aprende melhor" className="sm:col-span-2" error={errors.learning_style}>
                    <RadioOptions name="learning_style" options={safeOptions.learning_style} value={data.learning_style} onChange={(next) => patch({ learning_style: next })} />
                </Field>
                <Field label="Estudo bíblico personalizado" className="sm:col-span-2" error={errors.personalized_bible_study_interest}>
                    <RadioOptions
                        name="personalized_bible_study_interest"
                        options={safeOptions.personalized_bible_study_interest}
                        value={data.personalized_bible_study_interest}
                        onChange={(next) => patch({ personalized_bible_study_interest: next })}
                    />
                </Field>
                <Field label="Projetos missionários ou ações sociais" className="sm:col-span-2" error={errors.mission_social_projects_interest}>
                    <RadioOptions
                        name="mission_social_projects_interest"
                        options={safeOptions.mission_social_projects_interest}
                        value={data.mission_social_projects_interest}
                        onChange={(next) => patch({ mission_social_projects_interest: next })}
                    />
                </Field>
                <Field label="Área para começar" className="sm:col-span-2" error={errors.start_area_preference}>
                    <RadioOptions
                        name="start_area_preference"
                        options={safeOptions.start_area_preference}
                        value={data.start_area_preference}
                        onChange={(next) => patch({ start_area_preference: next })}
                    />
                </Field>
            </EditSection>

            <EditSection title="Observações">
                <Field label="Habilidades, experiências ou talentos" className="sm:col-span-2" error={errors.talents_for_god}>
                    <Textarea className="w-full" rows={3} value={data.talents_for_god} onChange={(e) => patch({ talents_for_god: e.target.value })} />
                </Field>
                <Field label="O que a equipe deve saber" className="sm:col-span-2" error={errors.team_support_notes}>
                    <Textarea className="w-full" rows={3} value={data.team_support_notes} onChange={(e) => patch({ team_support_notes: e.target.value })} />
                </Field>
            </EditSection>

            <div className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95">
                <PrimaryButton type="submit" disabled={processing} className="w-full sm:w-auto">
                    {processing ? 'Salvando…' : 'Salvar alterações'}
                </PrimaryButton>
            </div>
        </form>
    );
}
