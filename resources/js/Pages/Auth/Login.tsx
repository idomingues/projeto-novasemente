import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const appLogoUrl = (usePage().props as { appLogoUrl?: string | null }).appLogoUrl ?? null;

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Entrar" />

            <div className="w-full flex flex-col lg:flex-row min-h-screen lg:min-h-0">
                {/* Coluna esquerda: oculta no mobile */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-between px-8 py-10 lg:px-16 bg-zinc-900 text-zinc-100">
                    <div className="max-w-md">
                        <Link href="/">
                            <ApplicationLogo src={appLogoUrl} className="h-10 w-auto max-w-[180px] object-contain invert" />
                        </Link>
                        <p className="mt-8 text-[11px] font-semibold tracking-[0.22em] uppercase text-zinc-400">
                            Painel administrativo
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                            Sistema de gestão da igreja
                        </h1>
                        <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                            Acompanhe membros, voluntários, cultos, salas e finanças em um só lugar.
                        </p>
                    </div>
                    <div className="mt-8 space-y-3 text-sm text-zinc-200">
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-1 w-6 rounded-full bg-zinc-100" />
                            <span>Resumo rápido da membresia, visitantes e frequência.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-1 w-6 rounded-full bg-zinc-100" />
                            <span>Escala organizada de voluntários e ministérios da igreja.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-1 w-6 rounded-full bg-zinc-100" />
                            <span>Gestão de membros, voluntários e escalas em um só lugar.</span>
                        </div>
                    </div>
                    <p className="mt-10 text-xs text-zinc-500">
                        © {new Date().getFullYear()} Sistema Igreja. Todos os direitos reservados.
                    </p>
                </div>

                <div className="w-full lg:w-1/2 bg-white dark:bg-white flex items-center justify-center px-5 py-8 sm:px-6 sm:py-10 lg:px-16 min-h-[100dvh] lg:min-h-0">
                    <div className="w-full max-w-md">
                        <div className="lg:hidden flex justify-center mb-6">
                            <Link href="/">
                                <ApplicationLogo src={appLogoUrl} className="h-10 w-auto max-w-[160px] object-contain" />
                            </Link>
                        </div>
                        {status && (
                            <div className="mb-4 text-sm font-medium text-green-600">
                                {status}
                            </div>
                        )}

                        <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900">
                            Bem-vindo de volta
                        </h2>
                        <p className="mt-2 text-sm text-zinc-600">
                            Acesse sua conta para acompanhar a gestão da igreja.
                        </p>

                        <form onSubmit={submit} className="mt-6 space-y-5">
                            <div>
                                <InputLabel htmlFor="email" value="Email" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="mt-1 block w-full !bg-zinc-50 dark:!bg-zinc-100 !border-zinc-300 dark:!border-zinc-300 !text-zinc-900 placeholder:!text-zinc-500"
                                    autoComplete="username"
                                    isFocused={true}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="password" value="Senha" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="mt-1 block w-full !bg-zinc-50 dark:!bg-zinc-100 !border-zinc-300 dark:!border-zinc-300 !text-zinc-900 placeholder:!text-zinc-500"
                                    autoComplete="current-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', (e.target.checked || false) as false)}
                                    />
                                    <span className="text-sm text-zinc-600">
                                        Manter conectado
                                    </span>
                                </label>
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm font-medium text-zinc-600 hover:text-zinc-900 underline-offset-4 hover:underline"
                                    >
                                        Esqueceu a senha?
                                    </Link>
                                )}
                            </div>

                            <div className="pt-2">
                                <PrimaryButton type="submit" className="w-full justify-center !bg-zinc-900 !text-white hover:!bg-zinc-800 disabled:!opacity-50" disabled={processing}>
                                    Entrar
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
