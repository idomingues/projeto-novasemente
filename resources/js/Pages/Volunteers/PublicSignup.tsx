import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

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
        ministry_id: '' as number | '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('volunteers.self-signup.store'));
    };

    const noMinistries = ministries.length === 0;

    return (
        <GuestLayout>
            <Head title={`Voluntário — ${churchName}`} />

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
                            Cadastro de voluntário
                        </p>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{churchName}</h1>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                            Escolha o departamento em que pretende servir e conclua os dados para aceder ao app.
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
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.last_name} className="mt-1" />
                                </div>
                            </div>

                            <div className="mt-4">
                                <InputLabel htmlFor="ministry_id" value="Departamento" />
                                <select
                                    id="ministry_id"
                                    value={data.ministry_id === '' ? '' : String(data.ministry_id)}
                                    onChange={(e) =>
                                        setData('ministry_id', e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    className="mt-1 block w-full min-h-[2.75rem] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                                    required
                                >
                                    <option value="">Selecione o departamento…</option>
                                    {ministries.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.ministry_id} className="mt-1" />
                            </div>

                            <div className="mt-4">
                                <InputLabel htmlFor="email" value="E-mail (login)" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    className="mt-1 block w-full"
                                    autoComplete="email"
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                            </div>

                            <div className="mt-4">
                                <InputLabel htmlFor="phone" value="Telefone (opcional)" />
                                <TextInput
                                    id="phone"
                                    type="tel"
                                    value={data.phone}
                                    className="mt-1 block w-full"
                                    autoComplete="tel"
                                    onChange={(e) => setData('phone', e.target.value)}
                                />
                                <InputError message={errors.phone} className="mt-1" />
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

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                    href={route('login')}
                                    className="text-center text-sm text-zinc-600 underline dark:text-zinc-400 sm:text-left"
                                >
                                    Já tem conta? Entrar
                                </Link>
                                <PrimaryButton type="submit" disabled={processing} className="w-full sm:w-auto">
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
