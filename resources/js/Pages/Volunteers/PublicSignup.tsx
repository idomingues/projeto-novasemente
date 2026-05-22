import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import MobileLayout from '@/Layouts/MobileLayout';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { Head, Link, useForm } from '@inertiajs/react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { FormEventHandler, MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

interface Ministry {
    id: number;
    name: string;
}

interface Props {
    token: string;
    churchName: string;
    ministries: Ministry[];
}

type AttendanceDuration =
    | 'less_than_3_months'
    | 'months_3_6'
    | 'months_6_12'
    | 'years_1_3'
    | 'more_than_3_years';

const PAGE_TITLES = ['Dados pessoais', 'Nova Semente', 'Experiência', 'Ministérios', 'Conta'];
const LAST_PAGE_INDEX = PAGE_TITLES.length - 1;

const ATTENDANCE_OPTIONS: { value: AttendanceDuration; label: string }[] = [
    { value: 'less_than_3_months', label: 'Menos de 3 meses' },
    { value: 'months_3_6', label: '3–6 meses' },
    { value: 'months_6_12', label: '6–12 meses' },
    { value: 'years_1_3', label: '1–3 anos' },
    { value: 'more_than_3_years', label: '+ 3 anos' },
];

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
    const titleId = `volunteer-q-${number}`;

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

function YesNoRadio({
    name,
    value,
    onChange,
}: {
    name: string;
    value: boolean | null;
    onChange: (v: boolean) => void;
}) {
    const options = ['Não', 'Sim'] as const;
    const selected = value === true ? 'Sim' : value === false ? 'Não' : '';

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

function VolunteerPhotoField({
    previewUrl,
    photoPreparing,
    clientError,
    serverError,
    onFileChosen,
    onClear,
}: {
    previewUrl: string | null;
    photoPreparing: boolean;
    clientError: string | null;
    serverError?: string;
    onFileChosen: (file: File | null) => void;
    onClear: () => void;
}) {
    const displayError = clientError ?? serverError;

    return (
        <section
            id="volunteer-photo"
            className="scroll-mt-32 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60 sm:scroll-mt-36 sm:p-5"
        >
            <h3 className="mb-1 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                Foto
                <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
            </h3>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                No celular você pode usar a câmera; no computador, escolha uma imagem (máx. 4 MB). A foto ajuda a equipe a
                reconhecer você.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    {previewUrl ? (
                        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-2xl font-semibold text-zinc-500 dark:text-zinc-400">?</span>
                    )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <InputLabel htmlFor="volunteer_photo" value="Selecionar foto" className="sr-only" />
                    <input
                        id="volunteer_photo"
                        type="file"
                        accept="image/*"
                        capture="user"
                        disabled={photoPreparing}
                        onChange={(e) => {
                            const raw = e.currentTarget.files?.[0] ?? null;
                            e.currentTarget.value = '';
                            onFileChosen(raw);
                        }}
                        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-60 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
                    />
                    {photoPreparing ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Preparando a imagem…</p>
                    ) : previewUrl ? (
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-xs font-semibold text-teal-700 underline dark:text-teal-400"
                        >
                            Remover foto
                        </button>
                    ) : null}
                    {displayError ? <InputError message={displayError} /> : null}
                </div>
            </div>
        </section>
    );
}

function FormNav({
    page,
    goToPage,
    processing,
}: {
    page: number;
    goToPage: (next: number | ((current: number) => number)) => void;
    processing: boolean;
}) {
    const showAdvance = page < LAST_PAGE_INDEX;

    const handleAdvance = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        window.requestAnimationFrame(() => {
            goToPage(page + 1);
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
                    {processing ? 'Enviando…' : 'Concluir cadastro'}
                </PrimaryButton>
            </div>
        </div>
    );
}

export default function PublicSignup({ token, churchName, ministries }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        photo_file: null as File | null,
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
        previous_ministry_ids: [] as number[],
        is_active_in_ministry: null as boolean | null,
        active_ministry_ids: [] as number[],
        wants_other_ministry: null as boolean | null,
        other_ministry_ids: [] as number[],
        gifts_to_develop: '',
        professional_area: '',
        lgpd_data_consent: null as boolean | null,
        password: '',
        password_confirmation: '',
    });

    const [page, setPage] = useState(0);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [nameDuplicateHint, setNameDuplicateHint] = useState<string | null>(null);
    const [emailDuplicateHint, setEmailDuplicateHint] = useState<string | null>(null);
    const [phoneDuplicateHint, setPhoneDuplicateHint] = useState<string | null>(null);
    const checkDuplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    const progress = useMemo(() => Math.round(((page + 1) / PAGE_TITLES.length) * 100), [page]);

    const toggleIds = (field: 'previous_ministry_ids' | 'active_ministry_ids' | 'other_ministry_ids', id: number) => {
        const current = data[field];
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        setData(field, next);
        clearClientError(field);
    };

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
            setNameDuplicateHint(fn.length >= 1 && ln.length >= 1 && res.data.duplicate && res.data.message ? res.data.message : null);
            setEmailDuplicateHint(res.data.email_taken && res.data.email_message ? res.data.email_message : null);
            setPhoneDuplicateHint(res.data.phone_taken && res.data.phone_message ? res.data.phone_message : null);
        } catch {
            setNameDuplicateHint(null);
            setEmailDuplicateHint(null);
            setPhoneDuplicateHint(null);
        }
    }, [data.token, data.first_name, data.last_name, data.email, data.phone]);

    const scheduleDuplicateCheck = () => {
        if (checkDuplicateTimer.current) clearTimeout(checkDuplicateTimer.current);
        checkDuplicateTimer.current = setTimeout(() => void runDuplicateCheck(), 250);
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

    const clearClientError = (key: string) => {
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
        if (!raw) return;
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

    const validatePage = (p: number): boolean => {
        const next: Record<string, string> = {};
        if (p === 0) {
            if (!data.photo_file) next.photo_file = 'Envie uma foto antes de avançar.';
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
        if (p === 1) {
            if (!data.attendance_duration) next.attendance_duration = 'Selecione uma opção.';
            if (data.is_official_member === null) next.is_official_member = 'Selecione uma opção.';
            if (data.is_official_member === true) {
                if (data.member_record_at_nova_semente === null) next.member_record_at_nova_semente = 'Selecione uma opção.';
                if (data.member_record_at_nova_semente === false && !data.member_record_church.trim()) {
                    next.member_record_church = 'Informe em qual igreja está o seu registro.';
                }
            }
        }
        if (p === 2) {
            if (data.has_previous_ministry_volunteer_experience === null) {
                next.has_previous_ministry_volunteer_experience = 'Selecione uma opção.';
            }
            if (data.has_previous_ministry_volunteer_experience === true && data.previous_ministry_ids.length === 0) {
                next.previous_ministry_ids = 'Selecione em quais ministérios você já serviu.';
            }
        }
        if (p === 3) {
            if (data.is_active_in_ministry === null) next.is_active_in_ministry = 'Selecione uma opção.';
            if (data.is_active_in_ministry === true && data.active_ministry_ids.length === 0) {
                next.active_ministry_ids = 'Selecione pelo menos um ministério.';
            }
            if (data.wants_other_ministry === null) next.wants_other_ministry = 'Selecione uma opção.';
            if (data.wants_other_ministry === true && data.other_ministry_ids.length === 0) {
                next.other_ministry_ids = 'Selecione pelo menos um ministério.';
            }
            if (data.lgpd_data_consent === null) next.lgpd_data_consent = 'Selecione uma opção.';
            if (data.lgpd_data_consent === false) {
                next.lgpd_data_consent = 'Para continuar, é necessário autorizar o uso dos dados (LGPD).';
            }
        }
        if (p === 4) {
            if (!data.password) next.password = 'Defina uma senha.';
            if (!data.password_confirmation) next.password_confirmation = 'Confirme a senha.';
            if (data.password && data.password_confirmation && data.password !== data.password_confirmation) {
                next.password_confirmation = 'As senhas não coincidem.';
            }
        }
        setClientErrors(next);
        return Object.keys(next).length === 0;
    };

    const goToPage = (next: number | ((current: number) => number)) => {
        const target = typeof next === 'function' ? next(page) : next;
        if (target > page && !validatePage(page)) return;
        setClientErrors({});
        setPage(Math.max(0, Math.min(LAST_PAGE_INDEX, target)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!validatePage(LAST_PAGE_INDEX)) return;
        if (!data.first_name.trim() || !data.last_name.trim()) {
            setClientErrors({ full_name: 'Informe o nome completo.' });
            setPage(0);
            return;
        }
        post(route('volunteers.self-signup.store'), {
            forceFormData: true,
            preserveState: false,
            preserveScroll: false,
        });
    };

    const err = (key: string) =>
        (errors as Record<string, string | undefined>)[key] || clientErrors[key];

    let questionNumber = 0;

    return (
        <MobileLayout>
            <Head title={`Cadastro Voluntário — ${churchName}`} />

            <div className="mx-auto w-full max-w-3xl px-1 sm:px-0">
                <header className="mb-5">
                    <Link
                        href={route('more.index')}
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
                                Cadastro voluntário
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{churchName}</p>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                Preencha seus dados para informar seu interesse em ser voluntário da Nova Semente.
                            </p>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        <span className="font-semibold">*</span> Obrigatória
                    </p>
                </header>

                <form onSubmit={submit} className="space-y-4 sm:space-y-5">
                    <div className="rounded-2xl border border-zinc-200/90 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
                                    Etapa {page + 1} de {PAGE_TITLES.length}
                                </p>
                                <p className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">{PAGE_TITLES[page]}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setClientErrors({});
                                    setNameDuplicateHint(null);
                                    setEmailDuplicateHint(null);
                                    setPhoneDuplicateHint(null);
                                    setPage(0);
                                    setPhotoPreview(null);
                                    reset();
                                }}
                                className="text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
                            >
                                Limpar
                            </button>
                        </div>
                        <ProgressBar value={progress} />
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        {page === 0 ? (
                            <>
                                <VolunteerPhotoField
                                    previewUrl={photoPreview}
                                    photoPreparing={photoPreparing}
                                    clientError={photoClientError}
                                    serverError={errors.photo_file}
                                    onFileChosen={handlePhotoFileChosen}
                                    onClear={handlePhotoClear}
                                />
                                <Question number={++questionNumber} label="Nome completo" error={err('full_name') || err('first_name') || err('last_name')}>
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
                                <Question number={++questionNumber} label="Data de nascimento" error={err('birth_date')}>
                                    <TextInput
                                        type="date"
                                        className="w-full max-w-xs"
                                        value={data.birth_date}
                                        onChange={(e) => {
                                            setData('birth_date', e.target.value);
                                            clearClientError('birth_date');
                                        }}
                                    />
                                </Question>
                                <Question number={++questionNumber} label="Telefone (WhatsApp)" required={false} error={err('phone')}>
                                    <TextInput
                                        type="tel"
                                        className="w-full"
                                        placeholder="(11) 99999-9999"
                                        value={data.phone}
                                        autoComplete="tel"
                                        inputMode="tel"
                                        onChange={(e) => {
                                            setData('phone', e.target.value);
                                            setPhoneDuplicateHint(null);
                                            clearClientError('phone');
                                        }}
                                        onBlur={scheduleDuplicateCheck}
                                    />
                                </Question>
                                <Question number={++questionNumber} label="Este número tem WhatsApp?" error={err('has_whatsapp')}>
                                    <YesNoRadio
                                        name="has_whatsapp"
                                        value={data.has_whatsapp}
                                        onChange={(v) => {
                                            setData('has_whatsapp', v);
                                            clearClientError('has_whatsapp');
                                        }}
                                    />
                                </Question>
                                <Question number={++questionNumber} label="E-mail" error={err('email')}>
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
                                </Question>
                                <Question
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
                            </>
                        ) : null}

                        {page === 1 ? (
                            <>
                                <Question number={++questionNumber} label="Há quanto tempo você frequenta a Nova Semente?" error={err('attendance_duration')}>
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
                                <Question number={++questionNumber} label="Você é membro oficial da igreja adventista?" error={err('is_official_member')}>
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
                                {data.is_official_member === true ? (
                                    <>
                                        <Question
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
                                        {data.member_record_at_nova_semente === false ? (
                                            <Question
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
                                <Question
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
                                {data.has_previous_ministry_volunteer_experience === true ? (
                                    <Question
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
                                <Question
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
                                {data.is_active_in_ministry === true ? (
                                    <Question number={++questionNumber} label="Selecione os ministérios" error={err('active_ministry_ids')}>
                                        <MinistryCheckboxList
                                            ministries={ministries}
                                            selectedIds={data.active_ministry_ids}
                                            onToggle={(id) => toggleIds('active_ministry_ids', id)}
                                        />
                                    </Question>
                                ) : null}
                                <Question
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
                                {data.wants_other_ministry === true ? (
                                    <Question number={++questionNumber} label="Se sim, qual?" error={err('other_ministry_ids')}>
                                        <MinistryCheckboxList
                                            ministries={ministries}
                                            selectedIds={data.other_ministry_ids}
                                            onToggle={(id) => toggleIds('other_ministry_ids', id)}
                                        />
                                    </Question>
                                ) : null}
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
                                <Question number={++questionNumber} label="Consentimento para uso de dados" error={err('lgpd_data_consent')}>
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
                            </>
                        ) : null}

                        {page === 4 ? (
                            <>
                                <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60 sm:p-5">
                                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Login</h3>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Confirme o e-mail que será usado para entrar no aplicativo:
                                    </p>
                                    <p className="mt-3 break-all rounded-xl border border-teal-200/80 bg-teal-50/90 px-4 py-3 text-sm font-semibold text-teal-900 dark:border-teal-500/40 dark:bg-teal-950/40 dark:text-teal-100">
                                        {data.email.trim() || '—'}
                                    </p>
                                </section>
                                <Question number={++questionNumber} label="Senha" error={err('password')}>
                                    <TextInput
                                        type="password"
                                        className="w-full max-w-md"
                                        value={data.password}
                                        autoComplete="new-password"
                                        onChange={(e) => {
                                            setData('password', e.target.value);
                                            clearClientError('password');
                                        }}
                                    />
                                </Question>
                                <Question number={++questionNumber} label="Confirmar senha" error={err('password_confirmation')}>
                                    <TextInput
                                        type="password"
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
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                            href={route('login')}
                            className="text-center text-sm text-zinc-600 underline underline-offset-2 decoration-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 sm:text-left"
                        >
                            Já tem conta? Entrar
                        </Link>
                        <FormNav page={page} goToPage={goToPage} processing={processing} />
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
