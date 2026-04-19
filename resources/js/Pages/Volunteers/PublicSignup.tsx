import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEventHandler, useCallback, useMemo, useRef, useState } from 'react';

interface Ministry {
    id: number;
    name: string;
}

interface Props {
    token: string;
    churchName: string;
    churchLogoUrl: string | null;
    ministries: Ministry[];
}

type AttendanceDuration =
    | 'less_than_3_months'
    | 'months_3_6'
    | 'months_6_12'
    | 'years_1_3'
    | 'more_than_3_years';

function splitFullName(fullName: string): { first_name: string; last_name: string } | null {
    const parts = fullName
        .trim()
        .split(/\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length < 2) return null;
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" aria-hidden>
            <div
                className="h-2 rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}

function ChoiceCard<T extends string | boolean>({
    label,
    description,
    value,
    selected,
    onSelect,
}: {
    label: string;
    description?: string;
    value: T;
    selected: boolean;
    onSelect: (v: T) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(value)}
            className={[
                'w-full rounded-2xl border px-4 py-3 text-left transition',
                selected
                    ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200 dark:border-emerald-500/70 dark:bg-emerald-950/20 dark:ring-emerald-500/20'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900',
            ].join(' ')}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">{label}</div>
                    {description ? <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</div> : null}
                </div>
                <div
                    className={[
                        'mt-0.5 h-5 w-5 rounded-full border',
                        selected ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950',
                    ].join(' ')}
                    aria-hidden
                />
            </div>
        </button>
    );
}

export default function PublicSignup({ token, churchName, churchLogoUrl, ministries }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        full_name: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        has_whatsapp: null as boolean | null,
        email: '',
        phone: '',
        has_social_networks: null as boolean | null,
        attendance_duration: '' as AttendanceDuration | '',
        is_official_member: null as boolean | null,
        member_record_at_nova_semente: null as boolean | null,
        member_record_church: '',
        has_previous_ministry_volunteer_experience: null as boolean | null,
        previous_ministry_details: '',
        ministry_involvement: '',
        other_ministry_interest: '',
        gifts_to_develop: '',
        needs_pastoral_guidance: null as boolean | null,
        lgpd_data_consent: null as boolean | null,
        password: '',
        password_confirmation: '',
        ministry_ids: [] as number[],
    });

    const [step, setStep] = useState(0);
    const [nameDuplicateHint, setNameDuplicateHint] = useState<string | null>(null);
    const [emailDuplicateHint, setEmailDuplicateHint] = useState<string | null>(null);
    const [phoneDuplicateHint, setPhoneDuplicateHint] = useState<string | null>(null);
    const checkDuplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const runDuplicateCheck = useCallback(async () => {
        const fn = data.first_name.trim();
        const ln = data.last_name.trim();
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
            if (fn.length >= 1 && ln.length >= 1 && res.data.duplicate && res.data.message) {
                setNameDuplicateHint(res.data.message);
            } else {
                setNameDuplicateHint(null);
            }
            if (res.data.email_taken && res.data.email_message) {
                setEmailDuplicateHint(res.data.email_message);
            } else {
                setEmailDuplicateHint(null);
            }
            if (res.data.phone_taken && res.data.phone_message) {
                setPhoneDuplicateHint(res.data.phone_message);
            } else {
                setPhoneDuplicateHint(null);
            }
        } catch {
            setNameDuplicateHint(null);
            setEmailDuplicateHint(null);
            setPhoneDuplicateHint(null);
        }
    }, [data.token, data.first_name, data.last_name, data.email, data.phone]);

    const scheduleDuplicateCheck = () => {
        if (checkDuplicateTimer.current) {
            clearTimeout(checkDuplicateTimer.current);
        }
        checkDuplicateTimer.current = setTimeout(() => {
            void runDuplicateCheck();
        }, 250);
    };

    const syncNameParts = (full: string) => {
        const parts = splitFullName(full);
        setData('first_name', parts?.first_name ?? '');
        setData('last_name', parts?.last_name ?? '');
    };

    const onNameBlur = () => {
        syncNameParts(data.full_name);
        scheduleDuplicateCheck();
    };

    const totalSteps = 5;
    const progress = useMemo(() => Math.round(((step + 1) / totalSteps) * 100), [step]);

    const clearClientError = (key: string) => {
        setClientErrors((cur) => {
            if (!cur[key]) return cur;
            const next = { ...cur };
            delete next[key];
            return next;
        });
    };

    const setClientError = (key: string, message: string) => {
        setClientErrors((cur) => ({ ...cur, [key]: message }));
    };

    const validateStep = (s: number): boolean => {
        const next: Record<string, string> = {};
        if (s === 0) {
            const parts = splitFullName(data.full_name);
            if (!parts) next.full_name = 'Informe o nome completo.';
            if (!data.birth_date) next.birth_date = 'Informe a data de nascimento.';
            if (data.has_whatsapp === null) next.has_whatsapp = 'Informe se este número tem WhatsApp.';
            if (!data.email.trim()) next.email = 'Informe o e-mail.';
            if (data.has_social_networks === null) next.has_social_networks = 'Informe se você usa redes sociais.';
            if (nameDuplicateHint) next.full_name = nameDuplicateHint;
            if (emailDuplicateHint) next.email = emailDuplicateHint;
            if (phoneDuplicateHint) next.phone = phoneDuplicateHint;
        }
        if (s === 1) {
            if (!data.attendance_duration) next.attendance_duration = 'Selecione uma opção.';
            if (data.is_official_member === null) next.is_official_member = 'Selecione uma opção.';
            if (data.is_official_member === true) {
                if (data.member_record_at_nova_semente === null) next.member_record_at_nova_semente = 'Selecione uma opção.';
                if (data.member_record_at_nova_semente === false && !data.member_record_church.trim()) {
                    next.member_record_church = 'Informe em qual igreja está o seu registro.';
                }
            }
        }
        if (s === 2) {
            if (data.has_previous_ministry_volunteer_experience === null) next.has_previous_ministry_volunteer_experience = 'Selecione uma opção.';
            if (data.has_previous_ministry_volunteer_experience === true && !data.previous_ministry_details.trim()) {
                next.previous_ministry_details = 'Conte em quais ministérios você já serviu e o que mais gostava.';
            }
        }
        if (s === 3) {
            if (!data.other_ministry_interest.trim()) next.other_ministry_interest = 'Responda este campo.';
            if (data.needs_pastoral_guidance === null) next.needs_pastoral_guidance = 'Selecione uma opção.';
            if (data.lgpd_data_consent === null) next.lgpd_data_consent = 'Selecione uma opção.';
            if (data.lgpd_data_consent === false) next.lgpd_data_consent = 'Para continuar, é necessário autorizar o uso dos dados (LGPD).';
        }
        if (s === 4) {
            if (!data.password) next.password = 'Defina uma senha.';
            if (!data.password_confirmation) next.password_confirmation = 'Confirme a senha.';
            if (data.password && data.password_confirmation && data.password !== data.password_confirmation) {
                next.password_confirmation = 'As senhas não coincidem.';
            }
            if (data.ministry_ids.length === 0) next.ministry_ids = 'Selecione ao menos 1 departamento.';
        }
        setClientErrors(next);
        return Object.keys(next).length === 0;
    };

    const goNext = () => {
        if (!validateStep(step)) return;
        setStep((cur) => Math.min(totalSteps - 1, cur + 1));
    };

    const goBack = () => {
        setClientErrors({});
        setStep((cur) => Math.max(0, cur - 1));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!validateStep(4)) return;
        if (!data.first_name.trim() || !data.last_name.trim()) {
            setClientError('full_name', 'Informe o nome completo.');
            return;
        }
        post(route('volunteers.self-signup.store'));
    };

    const toggleMinistry = (id: number) => {
        const cur = data.ministry_ids;
        if (cur.includes(id)) {
            setData(
                'ministry_ids',
                cur.filter((x) => x !== id)
            );
        } else {
            setData('ministry_ids', [...cur, id]);
        }
    };

    const noMinistries = ministries.length === 0;

    return (
        <GuestLayout>
            <Head title={`Cadastro Voluntário — ${churchName}`} />

            <div className="min-h-screen w-full flex flex-col items-center px-4 py-10 sm:py-12">
                <div className="w-full max-w-md flex-1">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <Link
                            href={route('more.index')}
                            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
                        >
                            Voltar
                        </Link>
                        <Link href={route('mobile.news')} className="inline-flex rounded-full p-2 ring-2 ring-zinc-200 dark:ring-zinc-700">
                            <ApplicationLogo
                                src={churchLogoUrl ?? undefined}
                                className="h-16 w-16 object-contain dark:invert"
                            />
                        </Link>
                        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                            Cadastro Voluntário
                        </p>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{churchName}</h1>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                            Preencha os seus dados e, no final, escolha um ou mais departamentos em que pretende servir.
                        </p>
                    </div>

                    <p className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                        Só quer uma <span className="font-semibold text-zinc-800 dark:text-zinc-100">conta simples na app</span>{' '}
                        (notícias, cultos, agendamentos)?{' '}
                        <Link
                            href={route('register')}
                            className="font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                        >
                            Criar conta aqui
                        </Link>
                    </p>

                    {noMinistries ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                            Ainda não há departamentos disponíveis nesta igreja. Contacte a equipe.
                        </div>
                    ) : (
                        <form
                            onSubmit={submit}
                            className="flex min-h-0 max-h-[78vh] sm:max-h-none flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900/80"
                        >
                            <div className="mb-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                            Etapa {step + 1} de {totalSteps}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Leva ~2 min.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Link href={route('more.index')} className="text-xs font-semibold text-zinc-600 underline dark:text-zinc-400">
                                            Sair
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setClientErrors({});
                                                setNameDuplicateHint(null);
                                                setEmailDuplicateHint(null);
                                                setPhoneDuplicateHint(null);
                                                setStep(0);
                                                reset();
                                            }}
                                            className="text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
                                        >
                                            Limpar
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <ProgressBar value={progress} />
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-28 sm:flex-none sm:overflow-visible sm:pb-0">
                                {step === 0 ? (
                                    <>
                                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                                            <div className="font-semibold">Informações básicas</div>
                                            <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                                Queremos conhecer você e ter formas de contato para facilitar sua integração no voluntariado da Nova Semente.
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <InputLabel htmlFor="full_name" value="Nome Completo *" />
                                            <TextInput
                                                id="full_name"
                                                value={data.full_name}
                                                className="mt-1 block w-full"
                                                autoComplete="name"
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setData('full_name', v);
                                                    syncNameParts(v);
                                                    setNameDuplicateHint(null);
                                                    clearClientError('full_name');
                                                }}
                                                onBlur={onNameBlur}
                                                required
                                            />
                                            <InputError
                                                message={
                                                    (errors as Record<string, string | undefined>).first_name ||
                                                    (errors as Record<string, string | undefined>).last_name ||
                                                    clientErrors.full_name
                                                }
                                                className="mt-1"
                                            />
                                        </div>

                                    <div className="mt-4">
                                        <InputLabel htmlFor="birth_date" value="Data de Nascimento *" />
                                        <TextInput
                                            id="birth_date"
                                            type="date"
                                            value={data.birth_date}
                                            className="mt-1 block w-full"
                                            onChange={(e) => {
                                                setData('birth_date', e.target.value);
                                                clearClientError('birth_date');
                                            }}
                                            required
                                        />
                                        <InputError message={errors.birth_date || clientErrors.birth_date} className="mt-1" />
                                    </div>

                                        <div className="mt-4">
                                            <InputLabel htmlFor="phone" value="Telefone (WhatsApp) (opcional)" />
                                            <TextInput
                                                id="phone"
                                                type="tel"
                                                value={data.phone}
                                                placeholder="(11) 99999-9999"
                                                className="mt-1 block w-full"
                                                autoComplete="tel"
                                                onChange={(e) => {
                                                    setData('phone', e.target.value);
                                                    setPhoneDuplicateHint(null);
                                                    clearClientError('phone');
                                                }}
                                                onBlur={scheduleDuplicateCheck}
                                            />
                                            <InputError message={errors.phone || clientErrors.phone} className="mt-1" />
                                        </div>

                                    <div className="mt-4">
                                        <InputLabel value="Este número tem WhatsApp? *" />
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <ChoiceCard
                                                label="Sim"
                                                value={true}
                                                selected={data.has_whatsapp === true}
                                                onSelect={(v) => {
                                                    setData('has_whatsapp', v);
                                                    clearClientError('has_whatsapp');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="Não"
                                                value={false}
                                                selected={data.has_whatsapp === false}
                                                onSelect={(v) => {
                                                    setData('has_whatsapp', v);
                                                    clearClientError('has_whatsapp');
                                                }}
                                            />
                                        </div>
                                        <InputError message={errors.has_whatsapp || clientErrors.has_whatsapp} className="mt-1" />
                                    </div>

                                    <div className="mt-4">
                                        <InputLabel htmlFor="email" value="E-mail *" />
                                        <TextInput
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            className="mt-1 block w-full"
                                            autoComplete="email"
                                            onChange={(e) => {
                                                setData('email', e.target.value);
                                                setEmailDuplicateHint(null);
                                                clearClientError('email');
                                            }}
                                            onBlur={scheduleDuplicateCheck}
                                            required
                                        />
                                        <InputError message={errors.email || clientErrors.email} className="mt-1" />
                                    </div>

                                    <div className="mt-4">
                                        <InputLabel value="Redes Sociais (Instagram, Facebook ou TikTok) *" />
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <ChoiceCard
                                                label="Sim"
                                                value={true}
                                                selected={data.has_social_networks === true}
                                                onSelect={(v) => {
                                                    setData('has_social_networks', v);
                                                    clearClientError('has_social_networks');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="Não"
                                                value={false}
                                                selected={data.has_social_networks === false}
                                                onSelect={(v) => {
                                                    setData('has_social_networks', v);
                                                    clearClientError('has_social_networks');
                                                }}
                                            />
                                        </div>
                                        <InputError message={errors.has_social_networks || clientErrors.has_social_networks} className="mt-1" />
                                    </div>
                                    </>
                                ) : null}

                                {step === 1 ? (
                                    <>
                                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                                            <div className="font-semibold">Sua Caminhada na Nova Semente</div>
                                            <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                                Aqui buscamos entender sua relação com a igreja e seu momento na comunidade, para acompanharmos sua jornada de forma cuidadosa.
                                            </div>
                                        </div>

                                    <div className="mt-4">
                                        <InputLabel value="Há quanto tempo você frequenta a Nova Semente? *" />
                                        <div className="mt-2 space-y-2">
                                            <ChoiceCard
                                                label="Menos de 3 meses"
                                                value="less_than_3_months"
                                                selected={data.attendance_duration === 'less_than_3_months'}
                                                onSelect={(v) => {
                                                    setData('attendance_duration', v as AttendanceDuration);
                                                    clearClientError('attendance_duration');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="3–6 meses"
                                                value="months_3_6"
                                                selected={data.attendance_duration === 'months_3_6'}
                                                onSelect={(v) => {
                                                    setData('attendance_duration', v as AttendanceDuration);
                                                    clearClientError('attendance_duration');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="6–12 meses"
                                                value="months_6_12"
                                                selected={data.attendance_duration === 'months_6_12'}
                                                onSelect={(v) => {
                                                    setData('attendance_duration', v as AttendanceDuration);
                                                    clearClientError('attendance_duration');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="1–3 anos"
                                                value="years_1_3"
                                                selected={data.attendance_duration === 'years_1_3'}
                                                onSelect={(v) => {
                                                    setData('attendance_duration', v as AttendanceDuration);
                                                    clearClientError('attendance_duration');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="+ 3 anos"
                                                value="more_than_3_years"
                                                selected={data.attendance_duration === 'more_than_3_years'}
                                                onSelect={(v) => {
                                                    setData('attendance_duration', v as AttendanceDuration);
                                                    clearClientError('attendance_duration');
                                                }}
                                            />
                                        </div>
                                        <InputError message={errors.attendance_duration || clientErrors.attendance_duration} className="mt-1" />
                                    </div>

                                    <div className="mt-4">
                                        <InputLabel value="Você é membro oficial da igreja adventista? *" />
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <ChoiceCard
                                                label="Sim"
                                                value={true}
                                                selected={data.is_official_member === true}
                                                onSelect={(v) => {
                                                    setData('is_official_member', v);
                                                    setData('member_record_at_nova_semente', null);
                                                    setData('member_record_church', '');
                                                    clearClientError('is_official_member');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="Não"
                                                value={false}
                                                selected={data.is_official_member === false}
                                                onSelect={(v) => {
                                                    setData('is_official_member', v);
                                                    setData('member_record_at_nova_semente', null);
                                                    setData('member_record_church', '');
                                                    clearClientError('is_official_member');
                                                }}
                                            />
                                        </div>
                                        <InputError message={errors.is_official_member || clientErrors.is_official_member} className="mt-1" />
                                    </div>

                                    {data.is_official_member === true ? (
                                        <>
                                            <div className="mt-4">
                                                <InputLabel value="Seu registro de membro está na Nova Semente? *" />
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    <ChoiceCard
                                                        label="Sim"
                                                        value={true}
                                                        selected={data.member_record_at_nova_semente === true}
                                                        onSelect={(v) => {
                                                            setData('member_record_at_nova_semente', v);
                                                            setData('member_record_church', '');
                                                            clearClientError('member_record_at_nova_semente');
                                                        }}
                                                    />
                                                    <ChoiceCard
                                                        label="Não"
                                                        value={false}
                                                        selected={data.member_record_at_nova_semente === false}
                                                        onSelect={(v) => {
                                                            setData('member_record_at_nova_semente', v);
                                                            clearClientError('member_record_at_nova_semente');
                                                        }}
                                                    />
                                                </div>
                                                <InputError
                                                    message={errors.member_record_at_nova_semente || clientErrors.member_record_at_nova_semente}
                                                    className="mt-1"
                                                />
                                            </div>

                                            {data.member_record_at_nova_semente === false ? (
                                                <div className="mt-4">
                                                    <InputLabel htmlFor="member_record_church" value="Se não estiver, em qual igreja está? *" />
                                                    <TextInput
                                                        id="member_record_church"
                                                        value={data.member_record_church}
                                                        className="mt-1 block w-full"
                                                        onChange={(e) => {
                                                            setData('member_record_church', e.target.value);
                                                            clearClientError('member_record_church');
                                                        }}
                                                        required
                                                    />
                                                    <InputError
                                                        message={errors.member_record_church || clientErrors.member_record_church}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            ) : null}
                                        </>
                                    ) : null}
                                    </>
                                ) : null}

                                {step === 2 ? (
                                    <>
                                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                                            <div className="font-semibold">Experiência de serviço</div>
                                            <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                                Queremos conhecer suas experiências anteriores e o que faz você se sentir realizado ao servir.
                                            </div>
                                        </div>

                                    <div className="mt-4">
                                        <InputLabel value="Você já foi voluntário em algum ministério da igreja? *" />
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <ChoiceCard
                                                label="Sim"
                                                value={true}
                                                selected={data.has_previous_ministry_volunteer_experience === true}
                                                onSelect={(v) => {
                                                    setData('has_previous_ministry_volunteer_experience', v);
                                                    clearClientError('has_previous_ministry_volunteer_experience');
                                                }}
                                            />
                                            <ChoiceCard
                                                label="Não"
                                                value={false}
                                                selected={data.has_previous_ministry_volunteer_experience === false}
                                                onSelect={(v) => {
                                                    setData('has_previous_ministry_volunteer_experience', v);
                                                    setData('previous_ministry_details', '');
                                                    clearClientError('has_previous_ministry_volunteer_experience');
                                                }}
                                            />
                                        </div>
                                        <InputError
                                            message={errors.has_previous_ministry_volunteer_experience || clientErrors.has_previous_ministry_volunteer_experience}
                                            className="mt-1"
                                        />
                                    </div>

                                    {data.has_previous_ministry_volunteer_experience === true ? (
                                        <div className="mt-4">
                                            <InputLabel htmlFor="previous_ministry_details" value="Se sim, quais? O que mais gostava ao servir? *" />
                                            <textarea
                                                id="previous_ministry_details"
                                                value={data.previous_ministry_details}
                                                onChange={(e) => {
                                                    setData('previous_ministry_details', e.target.value);
                                                    clearClientError('previous_ministry_details');
                                                }}
                                                rows={4}
                                                className="mt-1 block w-full rounded-xl border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                                required
                                            />
                                            <InputError
                                                message={errors.previous_ministry_details || clientErrors.previous_ministry_details}
                                                className="mt-1"
                                            />
                                        </div>
                                    ) : null}
                                    </>
                                ) : null}

                                {step === 3 ? (
                                    <>
                                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                                            <div className="font-semibold">Preferências e cuidado pastoral</div>
                                            <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                                Algumas perguntas rápidas para entendermos melhor seu momento e como caminhar com você.
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <InputLabel htmlFor="ministry_involvement" value="Qual é a sua atuação neste ministério? (opcional)" />
                                            <TextInput
                                                id="ministry_involvement"
                                                value={data.ministry_involvement}
                                                className="mt-1 block w-full"
                                                onChange={(e) => {
                                                    setData('ministry_involvement', e.target.value);
                                                    clearClientError('ministry_involvement');
                                                }}
                                            />
                                            <InputError
                                                message={(errors as Record<string, string | undefined>).ministry_involvement || clientErrors.ministry_involvement}
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <InputLabel htmlFor="other_ministry_interest" value="Gostaria de servir em outro ministério? Se sim, qual? *" />
                                            <TextInput
                                                id="other_ministry_interest"
                                                value={data.other_ministry_interest}
                                                className="mt-1 block w-full"
                                                onChange={(e) => {
                                                    setData('other_ministry_interest', e.target.value);
                                                    clearClientError('other_ministry_interest');
                                                }}
                                                required
                                            />
                                            <InputError
                                                message={(errors as Record<string, string | undefined>).other_ministry_interest || clientErrors.other_ministry_interest}
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <InputLabel htmlFor="gifts_to_develop" value="Quais dons ou habilidades você gostaria de desenvolver no servir? (opcional)" />
                                            <TextInput
                                                id="gifts_to_develop"
                                                value={data.gifts_to_develop}
                                                className="mt-1 block w-full"
                                                onChange={(e) => {
                                                    setData('gifts_to_develop', e.target.value);
                                                    clearClientError('gifts_to_develop');
                                                }}
                                            />
                                            <InputError
                                                message={(errors as Record<string, string | undefined>).gifts_to_develop || clientErrors.gifts_to_develop}
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <InputLabel value="Precisa de alguma orientação pastoral nesse momento? *" />
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <ChoiceCard
                                                    label="Sim"
                                                    value={true}
                                                    selected={data.needs_pastoral_guidance === true}
                                                    onSelect={(v) => {
                                                        setData('needs_pastoral_guidance', v);
                                                        clearClientError('needs_pastoral_guidance');
                                                    }}
                                                />
                                                <ChoiceCard
                                                    label="Não"
                                                    value={false}
                                                    selected={data.needs_pastoral_guidance === false}
                                                    onSelect={(v) => {
                                                        setData('needs_pastoral_guidance', v);
                                                        clearClientError('needs_pastoral_guidance');
                                                    }}
                                                />
                                            </div>
                                            <InputError
                                                message={(errors as Record<string, string | undefined>).needs_pastoral_guidance || clientErrors.needs_pastoral_guidance}
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <InputLabel value="Consentimento para uso de dados *" />
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Declaro que as informações fornecidas são verdadeiras e autorizo o uso dos meus dados pela Igreja Adventista Nova
                                                Semente exclusivamente para fins de organização do voluntariado e cuidado pastoral, conforme a LGPD.
                                            </p>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <ChoiceCard
                                                    label="Sim"
                                                    value={true}
                                                    selected={data.lgpd_data_consent === true}
                                                    onSelect={(v) => {
                                                        setData('lgpd_data_consent', v);
                                                        clearClientError('lgpd_data_consent');
                                                    }}
                                                />
                                                <ChoiceCard
                                                    label="Não"
                                                    value={false}
                                                    selected={data.lgpd_data_consent === false}
                                                    onSelect={(v) => {
                                                        setData('lgpd_data_consent', v);
                                                        clearClientError('lgpd_data_consent');
                                                    }}
                                                />
                                            </div>
                                            <InputError
                                                message={(errors as Record<string, string | undefined>).lgpd_data_consent || clientErrors.lgpd_data_consent}
                                                className="mt-1"
                                            />
                                        </div>
                                    </>
                                ) : null}

                                {step === 4 ? (
                                    <>
                                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                                            <div className="font-semibold">Conta e Departamentos</div>
                                            <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                                Por fim, crie sua senha e escolha onde deseja servir.
                                            </div>
                                        </div>

                                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <InputLabel htmlFor="password" value="Palavra-passe *" />
                                            <TextInput
                                                id="password"
                                                type="password"
                                                value={data.password}
                                                className="mt-1 block w-full"
                                                autoComplete="new-password"
                                                onChange={(e) => {
                                                    setData('password', e.target.value);
                                                    clearClientError('password');
                                                }}
                                                required
                                            />
                                            <InputError message={errors.password || clientErrors.password} className="mt-1" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="password_confirmation" value="Confirmar *" />
                                            <TextInput
                                                id="password_confirmation"
                                                type="password"
                                                value={data.password_confirmation}
                                                className="mt-1 block w-full"
                                                autoComplete="new-password"
                                                onChange={(e) => {
                                                    setData('password_confirmation', e.target.value);
                                                    clearClientError('password_confirmation');
                                                }}
                                                required
                                            />
                                            <InputError message={errors.password_confirmation || clientErrors.password_confirmation} className="mt-1" />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <InputLabel value="Departamentos *" />
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Marque todos em que deseja servir.</p>
                                        <ul className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
                                            {ministries.map((m) => {
                                                const checked = data.ministry_ids.includes(m.id);
                                                return (
                                                    <li key={m.id}>
                                                        <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-white dark:hover:bg-zinc-900">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => {
                                                                    toggleMinistry(m.id);
                                                                    clearClientError('ministry_ids');
                                                                }}
                                                                className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900"
                                                            />
                                                            <span className="text-sm text-zinc-800 dark:text-zinc-100">{m.name}</span>
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        <InputError message={errors.ministry_ids || clientErrors.ministry_ids} className="mt-2" />
                                    </div>
                                    </>
                                ) : null}
                            </div>

                            <div className="sticky bottom-0 z-20 -mx-6 mt-6 rounded-b-3xl border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                    href={route('login')}
                                    className="text-center text-sm text-zinc-600 underline dark:text-zinc-400 sm:text-left"
                                >
                                    Já tem conta? Entrar
                                </Link>

                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                    <PrimaryButton type="button" onClick={goBack} disabled={processing || step === 0} className="w-full sm:w-auto">
                                        Voltar
                                    </PrimaryButton>
                                    {step < totalSteps - 1 ? (
                                        <PrimaryButton type="button" onClick={goNext} disabled={processing} className="w-full sm:w-auto">
                                            Avançar
                                        </PrimaryButton>
                                    ) : (
                                        <PrimaryButton type="submit" disabled={processing} className="w-full sm:w-auto">
                                            Concluir cadastro
                                        </PrimaryButton>
                                    )}
                                </div>
                            </div>
                            </div>
                        </form>
                    )}
                </div>

                <footer className="mt-10 hidden w-full max-w-md pb-6 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                    <div className="flex flex-col items-center gap-2">
                        <span>Nova Semente — Voluntariado</span>
                        <div className="flex items-center gap-3">
                            <Link href={route('more.index')} className="underline">
                                Início
                            </Link>
                            <span className="opacity-40" aria-hidden>
                                ·
                            </span>
                            <Link href={route('mobile.news')} className="underline">
                                App
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </GuestLayout>
    );
}
