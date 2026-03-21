import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEventHandler, useCallback, useRef, useState } from 'react';

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

export default function PublicSignup({ token, churchName, churchLogoUrl, ministries }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        token,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        ministry_ids: [] as number[],
    });

    const [nameDuplicateHint, setNameDuplicateHint] = useState<string | null>(null);
    const [emailDuplicateHint, setEmailDuplicateHint] = useState<string | null>(null);
    const [phoneDuplicateHint, setPhoneDuplicateHint] = useState<string | null>(null);
    const checkDuplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const onLastNameBlur = () => {
        scheduleDuplicateCheck();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (nameDuplicateHint || emailDuplicateHint || phoneDuplicateHint) {
            return;
        }
        if (data.ministry_ids.length === 0) {
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

            <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 sm:py-16">
                <div className="w-full max-w-md">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <Link href={route('mobile.culto')} className="inline-flex rounded-full p-2 ring-2 ring-zinc-200 dark:ring-zinc-700">
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

                    {noMinistries ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                            Ainda não há departamentos disponíveis nesta igreja. Contacte a equipa.
                        </div>
                    ) : (
                        <form
                            onSubmit={submit}
                            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900/80"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-1">
                                    <InputLabel htmlFor="first_name" value="Nome" />
                                    <TextInput
                                        id="first_name"
                                        value={data.first_name}
                                        className="mt-1 block w-full"
                                        autoComplete="given-name"
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.first_name} className="mt-1" />
                                </div>
                                <div className="sm:col-span-1">
                                    <InputLabel htmlFor="last_name" value="Sobrenome" />
                                    <TextInput
                                        id="last_name"
                                        value={data.last_name}
                                        className="mt-1 block w-full"
                                        autoComplete="family-name"
                                        onChange={(e) => {
                                            setData('last_name', e.target.value);
                                            setNameDuplicateHint(null);
                                        }}
                                        onBlur={onLastNameBlur}
                                        required
                                    />
                                    <InputError message={errors.last_name} className="mt-1" />
                                    {nameDuplicateHint && (
                                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{nameDuplicateHint}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4">
                                <InputLabel htmlFor="email" value="E-mail (login)" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    className="mt-1 block w-full"
                                    autoComplete="email"
                                    onChange={(e) => {
                                        setData('email', e.target.value);
                                        setEmailDuplicateHint(null);
                                    }}
                                    onBlur={scheduleDuplicateCheck}
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                                {emailDuplicateHint && (
                                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{emailDuplicateHint}</p>
                                )}
                            </div>

                            <div className="mt-4">
                                <InputLabel htmlFor="phone" value="Telefone (opcional)" />
                                <TextInput
                                    id="phone"
                                    type="tel"
                                    value={data.phone}
                                    className="mt-1 block w-full"
                                    autoComplete="tel"
                                    onChange={(e) => {
                                        setData('phone', e.target.value);
                                        setPhoneDuplicateHint(null);
                                    }}
                                    onBlur={scheduleDuplicateCheck}
                                />
                                <InputError message={errors.phone} className="mt-1" />
                                {phoneDuplicateHint && (
                                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{phoneDuplicateHint}</p>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="password" value="Palavra-passe" />
                                    <TextInput
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        className="mt-1 block w-full"
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.password} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="password_confirmation" value="Confirmar" />
                                    <TextInput
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        className="mt-1 block w-full"
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.password_confirmation} className="mt-1" />
                                </div>
                            </div>

                            <div className="mt-4">
                                <InputLabel value="Departamentos" />
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
                                                        onChange={() => toggleMinistry(m.id)}
                                                        className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900"
                                                    />
                                                    <span className="text-sm text-zinc-800 dark:text-zinc-100">{m.name}</span>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <InputError message={errors.ministry_ids} className="mt-2" />
                            </div>

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                    href={route('login')}
                                    className="text-center text-sm text-zinc-600 underline dark:text-zinc-400 sm:text-left"
                                >
                                    Já tem conta? Entrar
                                </Link>
                                <PrimaryButton
                                    type="submit"
                                    disabled={
                                        processing ||
                                        !!nameDuplicateHint ||
                                        !!emailDuplicateHint ||
                                        !!phoneDuplicateHint ||
                                        data.ministry_ids.length === 0
                                    }
                                    className="w-full sm:w-auto"
                                >
                                    Criar conta
                                </PrimaryButton>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </GuestLayout>
    );
}
