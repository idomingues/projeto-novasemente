import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import { useForm } from '@inertiajs/react';

type MissionFormReturn = ReturnType<typeof useForm<MissionFormData>>;
import { FormEventHandler, useMemo, useState } from 'react';

export type MissionOptions = {
    belonging_levels: string[];
    professions: string[];
    beliefs: string[];
    religions: string[];
    seeks_in_community: string[];
    studied_bible: string[];
    first_contact_via: string[];
    wants_bible_study_partner: string[];
    duration_buckets: string[];
    participated_groups: string[];
    engagement_levels: string[];
    social_actions_interest: string[];
    profile_types: string[];
    ministry_preferences: string[];
    social_action_types: string[];
    weekday_availability: string[];
    time_per_week: string[];
    work_preferences: string[];
    contact_periods: string[];
    contact_formats: string[];
};

export type MissionFormData = {
    from_mobile: boolean;
    photo_file: File | null;
    full_name: string;
    email: string;
    birth_date: string;
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
    seeks_in_community: string[];
    seeks_in_community_other: string;
    studied_bible: string;
    studied_bible_structured: boolean | null;
    first_time_nova_semente: boolean | null;
    first_contact_via: string;
    first_contact_via_other: string;
    wants_bible_study_partner: string;
    if_not_how_long: string;
    insight_duration: string;
    participated_groups: string[];
    participated_groups_other: string;
    engagement_level: string;
    closer_to_god_text: string;
    belonging_people: string;
    belonging_location: string;
    belonging_availability: string;
    belonging_spirituality: string;
    social_actions_interest: string;
    profile_type: string;
    ministry_preference: string;
    social_action_type: string;
    weekday_availability: string;
    time_per_week: string;
    work_preference: string;
    can_contact_week: boolean | null;
    contact_period: string;
    contact_format: string;
    nps_score: number | '';
    lgpd_consent: boolean;
};

const PROFILE_HINTS: Record<string, string> = {
    Comunicativo: 'Gosto de expressar ideias, registrar momentos e dar voz ao que vivemos.',
    Executor: 'Gosto de colocar a mão na massa, planejar o prático e fazer as ações acontecerem.',
    Analítico: 'Gosto de organizar informações, entender perfis e direcionar estrategicamente.',
    Cuidador: 'Gosto de receber bem, fazer pontes de relacionamento e promover crescimento espiritual.',
};

const STEP_TITLES = ['Dados pessoais', 'Fé e religião', 'Nova Semente', 'Perfil missionário', 'Contato e LGPD'];

function toggleInList(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-2 rounded-full bg-emerald-500 transition-[width]" style={{ width: `${value}%` }} />
        </div>
    );
}

function YesNo({
    label,
    value,
    onChange,
    error,
}: {
    label: string;
    value: boolean | null;
    onChange: (v: boolean) => void;
    error?: string;
}) {
    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-2 flex gap-2">
                {[
                    { v: true, l: 'Sim' },
                    { v: false, l: 'Não' },
                ].map(({ v, l }) => (
                    <button
                        key={l}
                        type="button"
                        onClick={() => onChange(v)}
                        className={[
                            'flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium',
                            value === v
                                ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                                : 'border-zinc-200 dark:border-zinc-700',
                        ].join(' ')}
                    >
                        {l}
                    </button>
                ))}
            </div>
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}

function MatrixRow({
    label,
    value,
    levels,
    onChange,
    error,
}: {
    label: string;
    value: string;
    levels: string[];
    onChange: (v: string) => void;
    error?: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
            <div className="text-sm font-medium">{label}</div>
            <MatrixButtons levels={levels} value={value} onChange={onChange} />
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}

function MatrixButtons({
    levels,
    value,
    onChange,
}: {
    levels: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {levels.map((lvl) => (
                <button
                    key={lvl}
                    type="button"
                    onClick={() => onChange(lvl)}
                    className={[
                        'rounded-lg border px-3 py-1.5 text-xs font-medium',
                        value === lvl ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200',
                    ].join(' ')}
                >
                    {lvl}
                </button>
            ))}
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-1">{children}</div>
            {error ? <InputError message={error} /> : null}
        </div>
    );
}

interface Props {
    form: MissionFormReturn;
    options: MissionOptions;
    onSubmit: FormEventHandler;
    processing: boolean;
}

export default function MissionFormBody({ form, options, onSubmit, processing }: Props) {
    const { data, setData, errors } = form;
    const [step, setStep] = useState(0);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const progress = useMemo(() => ((step + 1) / STEP_TITLES.length) * 100, [step]);

    const onPhotoChange = (file: File | null) => {
        setData('photo_file', file);
        if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(file ? URL.createObjectURL(file) : null);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <div className="mb-2 flex justify-between text-xs text-zinc-500">
                    <span>
                        Etapa {step + 1}/{STEP_TITLES.length}
                    </span>
                    <span>{STEP_TITLES[step]}</span>
                </div>
                <ProgressBar value={progress} />
            </div>

            {step === 0 && (
                <div className="space-y-4">
                    <div>
                        <InputLabel value="Foto (opcional)" />
                        <div className="mt-2 flex items-center gap-4">
                            <PhotoPreview photoPreview={photoPreview} />
                            <input type="file" accept="image/*" onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)} />
                        </div>
                    </div>
                    <Field label="Nome completo *" error={errors.full_name}>
                        <TextInput className="w-full" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)} />
                    </Field>
                    <Field label="E-mail" error={errors.email}>
                        <TextInput type="email" className="w-full" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    </Field>
                    <Field label="Data de nascimento *" error={errors.birth_date}>
                        <TextInput type="date" className="w-full" value={data.birth_date} onChange={(e) => setData('birth_date', e.target.value)} />
                    </Field>
                    <Field label="Telefone *" error={errors.phone}>
                        <TextInput className="w-full" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                    </Field>
                    <Field label="Endereço *" error={errors.full_address}>
                        <Textarea className="w-full" rows={2} value={data.full_address} onChange={(e) => setData('full_address', e.target.value)} />
                    </Field>
                    <Field label="Profissão *" error={errors.profession}>
                        <SelectInput className="w-full" value={data.profession} onChange={(e) => setData('profession', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.professions.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                            <option value="Outro">Outro</option>
                        </SelectInput>
                    </Field>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <YesNo label="Tem alguma crença? *" value={data.has_belief} onChange={(v) => setData('has_belief', v)} error={errors.has_belief} />
                    {data.has_belief && (
                        <Field label="Qual crença?" error={errors.belief_which}>
                            <SelectInput className="w-full" value={data.belief_which} onChange={(e) => setData('belief_which', e.target.value)}>
                                <option value="">Selecione</option>
                                {options.beliefs.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                    )}
                    <YesNo label="Participa de religião? *" value={data.participates_religion} onChange={(v) => setData('participates_religion', v)} error={errors.participates_religion} />
                    {data.participates_religion && (
                        <Field label="Qual?" error={errors.religion_which}>
                            <SelectInput className="w-full" value={data.religion_which} onChange={(e) => setData('religion_which', e.target.value)}>
                                <option value="">Selecione</option>
                                {options.religions.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                    )}
                    <YesNo label="Já foi batizado? *" value={data.baptized} onChange={(v) => setData('baptized', v)} error={errors.baptized} />
                    <div>
                        <InputLabel value="O que busca na comunidade? *" />
                        <div className="mt-2 space-y-2">
                            {options.seeks_in_community.map((item) => (
                                <label key={item} className="flex gap-2 text-sm">
                                    <Checkbox checked={data.seeks_in_community.includes(item)} onChange={() => setData('seeks_in_community', toggleInList(data.seeks_in_community, item))} />
                                    {item}
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.seeks_in_community} />
                    </div>
                    <Field label="Já estudou a Bíblia? *" error={errors.studied_bible}>
                        <SelectInput className="w-full" value={data.studied_bible} onChange={(e) => setData('studied_bible', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.studied_bible.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <YesNo label="Estudo estruturado? *" value={data.studied_bible_structured} onChange={(v) => setData('studied_bible_structured', v)} error={errors.studied_bible_structured} />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <YesNo label="Primeira vez na Nova Semente? *" value={data.first_time_nova_semente} onChange={(v) => setData('first_time_nova_semente', v)} error={errors.first_time_nova_semente} />
                    {data.first_time_nova_semente === false && (
                        <Field label="Há quanto tempo?" error={errors.if_not_how_long}>
                            <SelectInput className="w-full" value={data.if_not_how_long} onChange={(e) => setData('if_not_how_long', e.target.value)}>
                                <option value="">Selecione</option>
                                {options.duration_buckets.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                    )}
                    <Field label="Primeiro contato *" error={errors.first_contact_via}>
                        <SelectInput className="w-full" value={data.first_contact_via} onChange={(e) => setData('first_contact_via', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.first_contact_via.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Estudar Bíblia com alguém? *" error={errors.wants_bible_study_partner}>
                        <SelectInput className="w-full" value={data.wants_bible_study_partner} onChange={(e) => setData('wants_bible_study_partner', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.wants_bible_study_partner.map((w) => (
                                <option key={w} value={w}>
                                    {w}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Tempo no Insight *" error={errors.insight_duration}>
                        <SelectInput className="w-full" value={data.insight_duration} onChange={(e) => setData('insight_duration', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.duration_buckets.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <ParticipatedGroups data={data} setData={setData} options={options} errors={errors} />
                    <Field label="Engajamento *" error={errors.engagement_level}>
                        <SelectInput className="w-full" value={data.engagement_level} onChange={(e) => setData('engagement_level', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.engagement_levels.map((e) => (
                                <option key={e} value={e}>
                                    {e}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Mais próximo de Deus *" error={errors.closer_to_god_text}>
                        <Textarea className="w-full" rows={3} value={data.closer_to_god_text} onChange={(e) => setData('closer_to_god_text', e.target.value)} />
                    </Field>
                    <MatrixRow label="Pessoas" value={data.belonging_people} levels={options.belonging_levels} onChange={(v) => setData('belonging_people', v)} error={errors.belonging_people} />
                    <MatrixRow label="Localização" value={data.belonging_location} levels={options.belonging_levels} onChange={(v) => setData('belonging_location', v)} error={errors.belonging_location} />
                    <MatrixRow label="Disponibilidade" value={data.belonging_availability} levels={options.belonging_levels} onChange={(v) => setData('belonging_availability', v)} error={errors.belonging_availability} />
                    <MatrixRow label="Espiritualidade" value={data.belonging_spirituality} levels={options.belonging_levels} onChange={(v) => setData('belonging_spirituality', v)} error={errors.belonging_spirituality} />
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <Field label="Ações sociais? *" error={errors.social_actions_interest}>
                        <SelectInput className="w-full" value={data.social_actions_interest} onChange={(e) => setData('social_actions_interest', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.social_actions_interest.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <ProfileTypes data={data} setData={setData} options={options} errors={errors} />
                    <Field label="Ministério *" error={errors.ministry_preference}>
                        <SelectInput className="w-full" value={data.ministry_preference} onChange={(e) => setData('ministry_preference', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.ministry_preferences.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Tipo ação social *" error={errors.social_action_type}>
                        <SelectInput className="w-full" value={data.social_action_type} onChange={(e) => setData('social_action_type', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.social_action_types.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Disponibilidade semana *" error={errors.weekday_availability}>
                        <SelectInput className="w-full" value={data.weekday_availability} onChange={(e) => setData('weekday_availability', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.weekday_availability.map((w) => (
                                <option key={w} value={w}>
                                    {w}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Tempo/semana *" error={errors.time_per_week}>
                        <SelectInput className="w-full" value={data.time_per_week} onChange={(e) => setData('time_per_week', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.time_per_week.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Presencial/online *" error={errors.work_preference}>
                        <SelectInput className="w-full" value={data.work_preference} onChange={(e) => setData('work_preference', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.work_preferences.map((w) => (
                                <option key={w} value={w}>
                                    {w}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                </div>
            )}

            {step === 4 && (
                <StepContact data={data} setData={setData} options={options} errors={errors} />
            )}

            <FormNav step={step} setStep={setStep} processing={processing} total={STEP_TITLES.length} />
        </form>
    );
}

function PhotoPreview({ photoPreview }: { photoPreview: string | null }) {
    return (
        <div className="h-20 w-20 overflow-hidden rounded-full bg-zinc-100">
            {photoPreview ? <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : null}
        </div>
    );
}

function ParticipatedGroups({
    data,
    setData,
    options,
    errors,
}: {
    data: MissionFormData;
    setData: MissionFormReturn['setData'];
    options: MissionOptions;
    errors: Partial<Record<string, string>>;
}) {
    return (
        <div>
            <InputLabel value="Participou de grupos? *" />
            <div className="mt-2 space-y-2">
                {options.participated_groups.map((item) => (
                    <label key={item} className="flex gap-2 text-sm">
                        <Checkbox checked={data.participated_groups.includes(item)} onChange={() => setData('participated_groups', toggleInList(data.participated_groups, item))} />
                        {item}
                    </label>
                ))}
            </div>
            <InputError message={errors.participated_groups} />
        </div>
    );
}

function ProfileTypes({
    data,
    setData,
    options,
    errors,
}: {
    data: MissionFormData;
    setData: MissionFormReturn['setData'];
    options: MissionOptions;
    errors: Partial<Record<string, string>>;
}) {
    return (
        <div>
            <InputLabel value="Perfil *" />
            <div className="mt-2 space-y-2">
                {options.profile_types.map((pt) => (
                    <button
                        key={pt}
                        type="button"
                        onClick={() => setData('profile_type', pt)}
                        className={['w-full rounded-xl border px-4 py-3 text-left text-sm', data.profile_type === pt ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'].join(' ')}
                    >
                        <span className="font-semibold">{pt}</span>
                        {PROFILE_HINTS[pt] ? <p className="mt-1 text-xs text-zinc-500">{PROFILE_HINTS[pt]}</p> : null}
                    </button>
                ))}
            </div>
            <InputError message={errors.profile_type} />
        </div>
    );
}

function StepContact({
    data,
    setData,
    options,
    errors,
}: {
    data: MissionFormData;
    setData: MissionFormReturn['setData'];
    options: MissionOptions;
    errors: Partial<Record<string, string>>;
}) {
    return (
        <div className="space-y-4">
            <YesNo label="Podemos contatar na semana? *" value={data.can_contact_week} onChange={(v) => setData('can_contact_week', v)} error={errors.can_contact_week} />
            {data.can_contact_week && (
                <>
                    <Field label="Período">
                        <SelectInput className="w-full" value={data.contact_period} onChange={(e) => setData('contact_period', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.contact_periods.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label="Formato">
                        <SelectInput className="w-full" value={data.contact_format} onChange={(e) => setData('contact_format', e.target.value)}>
                            <option value="">Selecione</option>
                            {options.contact_formats.map((f) => (
                                <option key={f} value={f}>
                                    {f}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                </>
            )}
            <div>
                <InputLabel value="NPS (0–10) *" />
                <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from({ length: 11 }, (_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setData('nps_score', i)}
                            className={['h-9 w-9 rounded-lg border text-sm', data.nps_score === i ? 'bg-emerald-500 text-white' : ''].join(' ')}
                        >
                            {i}
                        </button>
                    ))}
                </div>
                <InputError message={errors.nps_score} />
            </div>
            <label className="flex gap-3 rounded-xl border p-4">
                <Checkbox checked={data.lgpd_consent} onChange={(e) => setData('lgpd_consent', e.target.checked)} />
                <span className="text-sm">Autorizo o uso dos meus dados conforme a LGPD. *</span>
            </label>
            <InputError message={errors.lgpd_consent} />
        </div>
    );
}

function FormNav({
    step,
    setStep,
    processing,
    total,
}: {
    step: number;
    setStep: (fn: (s: number) => number) => void;
    processing: boolean;
    total: number;
}) {
    return (
        <div className="flex gap-3">
            {step > 0 ? (
                <SecondaryButton type="button" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                    Voltar
                </SecondaryButton>
            ) : (
                <div className="flex-1" />
            )}
            {step < total - 1 ? (
                <PrimaryButton type="button" className="flex-1" onClick={() => setStep((s) => s + 1)}>
                    Próximo
                </PrimaryButton>
            ) : (
                <PrimaryButton type="submit" className="flex-1" disabled={processing}>
                    {processing ? 'Enviando…' : 'Enviar'}
                </PrimaryButton>
            )}
        </div>
    );
}
