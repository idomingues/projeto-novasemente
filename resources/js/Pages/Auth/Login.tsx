import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
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
            <Head title="Log in" />

            <div className="w-full flex flex-col lg:flex-row">
                {/* Coluna esquerda - informações (fundo preto) */}
                <div className="w-full lg:w-1/2 flex flex-col justify-between px-8 py-10 lg:px-16 bg-zinc-900 text-zinc-100">
                    <div className="max-w-md">
                        <ApplicationLogo className="h-10 w-10 fill-current text-zinc-100" />

                        <p className="mt-8 text-[11px] font-semibold tracking-[0.22em] uppercase text-zinc-400">
                            Painel administrativo
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                            Sistema de gestão da igreja
                        </h1>
                        <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                            Acompanhe membros, voluntários, cultos, salas e finanças em um só lugar,
                            com visão clara para pastores, líderes e administração.
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
                            <span>Relatórios financeiros claros para decisões responsáveis.</span>
                        </div>
                    </div>

                    <p className="mt-10 text-xs text-zinc-500">
                        © {new Date().getFullYear()} Sistema Igreja. Todos os direitos reservados.
                    </p>
                </div>

                {/* Coluna direita - formulário de login (fundo branco) */}
                <div className="w-full lg:w-1/2 bg-white dark:bg-zinc-900 flex items-center justify-center px-6 py-10 lg:px-16">
                    <div className="w-full max-w-md">
                    {status && (
                        <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                            {status}
                        </div>
                    )}

                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Bem-vindo de volta
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
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
                                className="mt-1 block w-full"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
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
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                            />

                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) =>
                                        setData(
                                            'remember',
                                            (e.target.checked || false) as false,
                                        )
                                    }
                                />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Manter conectado
                                </span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-4 hover:underline"
                                >
                                    Esqueceu a senha?
                                </Link>
                            )}
                        </div>

                        <div className="pt-2">
                            <PrimaryButton className="w-full justify-center" disabled={processing}>
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
