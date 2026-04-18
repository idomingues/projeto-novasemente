import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content';
const FIXED_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

export default function Login({
    status,
    canResetPassword,
    redirectTo,
}: {
    status?: string;
    canResetPassword: boolean;
    redirectTo?: string | null;
}) {
    const appLogoUrl = (usePage().props as { appLogoUrl?: string | null }).appLogoUrl ?? null;

    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false as boolean,
        redirect: redirectTo ?? '',
    });

    useEffect(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        if (!meta) return;
        const previous = meta.getAttribute('content') ?? DEFAULT_VIEWPORT;
        meta.setAttribute('content', FIXED_VIEWPORT);
        return () => {
            meta.setAttribute('content', previous);
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Entrar" />

            <div className="w-full flex flex-col lg:flex-row min-h-screen lg:min-h-0 fixed inset-0 lg:relative overflow-auto lg:overflow-visible">
                {/* Coluna esquerda: oculta no mobile */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-between px-8 py-12 lg:px-16 bg-zinc-900 text-zinc-100">
                    <div className="max-w-md">
                        <Link href="/" className="inline-flex rounded-full p-1 ring-2 ring-white/10 bg-white/5">
                            <ApplicationLogo
                                src={appLogoUrl}
                                className="h-28 w-28 xl:h-32 xl:w-32 shrink-0 object-contain invert"
                            />
                        </Link>
                        <p className="mt-10 text-[11px] font-semibold tracking-[0.22em] uppercase text-zinc-400">
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

                <div className="w-full lg:w-1/2 bg-white dark:bg-white flex items-center justify-center px-5 pt-10 pb-12 sm:px-8 sm:pt-12 sm:pb-14 lg:px-16 lg:py-16 min-h-[100dvh] max-md:max-h-[100dvh] max-md:overflow-y-auto max-md:touch-manipulation lg:min-h-0">
                    <div className="w-full max-w-md lg:max-w-lg">
                        <div className="lg:hidden flex flex-col items-center mb-8 sm:mb-10">
                            <Link
                                href="/"
                                className="flex h-36 w-36 sm:h-40 sm:w-40 items-center justify-center rounded-full bg-zinc-50 shadow-lg shadow-zinc-900/10 ring-2 ring-zinc-200/90 active:scale-[0.98] transition-transform"
                            >
                                <ApplicationLogo
                                    src={appLogoUrl}
                                    className="h-[78%] w-[78%] object-contain"
                                />
                            </Link>
                            <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                                Nova Semente
                            </p>
                        </div>
                        {status && (
                            <div className="mb-4 text-sm font-medium text-green-600">
                                {status}
                            </div>
                        )}

                        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">Bem-vindo de volta</h2>
                        <p className="mt-3 text-sm sm:text-base text-zinc-600 leading-relaxed">
                            Acesse sua conta para acompanhar a gestão da igreja.
                        </p>

                        <form onSubmit={submit} className="mt-6 space-y-5">
                            <div>
                                <InputLabel htmlFor="login" value="E-mail ou nome" />
                                <TextInput
                                    id="login"
                                    type="text"
                                    name="login"
                                    value={data.login}
                                    className="mt-1 block w-full !bg-zinc-50 dark:!bg-zinc-100 !border-zinc-300 dark:!border-zinc-300 !text-zinc-900 placeholder:!text-zinc-500"
                                    autoComplete="username"
                                    isFocused={true}
                                    placeholder="seu@email.com ou nome cadastrado"
                                    onChange={(e) => setData('login', e.target.value)}
                                    required
                                />
                                <InputError message={errors.login} className="mt-2" />
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

                        <div className="mt-4">
                            <Link
                                href={route('mobile.culto')}
                                className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-center text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
                            >
                                Navegar sem login
                            </Link>
                        </div>

                        <div className="mt-6">
                            <Link
                                href={route('register')}
                                className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-center text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
                            >
                                Criar conta para usar o app completo
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
