import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

/** Evita zoom bloqueado e faz o Chrome redimensionar a área útil quando o teclado/autofill abre (melhor que sobrepor o formulário). */
const LOGIN_VIEWPORT =
    'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content';

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
    const csrfToken =
        (usePage().props as { csrf_token?: string | null }).csrf_token ??
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
        '';

    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false as boolean,
        redirect: redirectTo ?? '',
        _token: csrfToken,
        /** Honeypot (deixar vazio): bots preenchem; o servidor rejeita. */
        website: '',
    });

    // Versão "debug" que funcionou: mantém erros mesmo se a tela remonta durante o POST.
    const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const w = window as unknown as { __loginSubmitErrors?: Record<string, string> };
        if (w.__loginSubmitErrors && Object.keys(w.__loginSubmitErrors).length > 0) {
            setSubmitErrors(w.__loginSubmitErrors);
            delete w.__loginSubmitErrors;
        }
    }, []);

    const loginMessageFromServer =
        typeof (errors as { login?: unknown }).login === 'string' && (errors as { login?: string }).login?.trim()
            ? ((errors as { login?: string }).login as string)
            : submitErrors.login;
    const passwordMessageFromServer =
        typeof (errors as { password?: unknown }).password === 'string' && (errors as { password?: string }).password?.trim()
            ? ((errors as { password?: string }).password as string)
            : submitErrors.password;

    // UX: senha incorreta aparece no banner + embaixo da senha (não embaixo do e-mail).
    const loginErrorMessage = passwordMessageFromServer ? undefined : loginMessageFromServer;
    const passwordErrorMessage = passwordMessageFromServer;

    const bannerMessage =
        passwordMessageFromServer ||
        loginMessageFromServer ||
        (Object.keys(submitErrors).length > 0 ? 'Não foi possível entrar. Verifique seus dados.' : '');

    useEffect(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        if (!meta) return;
        const previous = meta.getAttribute('content') ?? '';
        meta.setAttribute('content', LOGIN_VIEWPORT);
        return () => {
            meta.setAttribute('content', previous);
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Garante CSRF mesmo em ambientes onde o header/cookie não esteja chegando no POST.
        if (csrfToken) {
            setData('_token', csrfToken);
        }
        setSubmitErrors({});
        post(route('login'), {
            onError: (errs) => {
                const normalized: Record<string, string> = {};
                Object.entries(errs ?? {}).forEach(([key, val]) => {
                    if (typeof val === 'string' && val.trim() !== '') {
                        normalized[key] = val;
                    }
                });
                // Persistir caso a página remonte durante o POST.
                (window as unknown as { __loginSubmitErrors?: Record<string, string> }).__loginSubmitErrors = normalized;
                setSubmitErrors(normalized);
            },
            onFinish: () => {
                reset('password');
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Entrar" />

            <div className="fixed inset-0 flex w-full flex-col overflow-y-auto overflow-x-hidden lg:relative lg:inset-auto lg:min-h-screen lg:flex-row lg:overflow-visible">
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

                <div className="flex min-h-[100dvh] w-full flex-1 touch-manipulation flex-col items-stretch justify-start bg-white px-5 pb-[max(5rem,env(safe-area-inset-bottom,0px))] pt-8 dark:bg-white sm:px-8 sm:pb-24 sm:pt-10 lg:w-1/2 lg:min-h-0 lg:flex-none lg:justify-center lg:px-16 lg:py-16 lg:pb-16">
                    <div className="mx-auto w-full max-w-md lg:max-w-lg">
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

                        {bannerMessage ? (
                            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                                {bannerMessage}
                            </div>
                        ) : null}

                        <form onSubmit={submit} className="mt-6 space-y-5">
                            <input
                                type="text"
                                name="website"
                                value={data.website}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden
                                className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
                                onChange={(e) => setData('website', e.target.value)}
                            />
                            <div>
                                <InputLabel htmlFor="login" value="E-mail ou nome" />
                                <TextInput
                                    id="login"
                                    type="text"
                                    name="login"
                                    value={data.login}
                                    className="mt-1.5 block w-full !bg-zinc-50 dark:!bg-zinc-100 !border-zinc-300 dark:!border-zinc-300 !text-zinc-900 placeholder:!text-zinc-500"
                                    autoComplete="username"
                                    placeholder="seu@email.com ou nome cadastrado"
                                    onChange={(e) => setData('login', e.target.value)}
                                    required
                                />
                                <InputError message={loginErrorMessage} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="password" value="Senha" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="mt-1.5 block w-full !bg-zinc-50 dark:!bg-zinc-100 !border-zinc-300 dark:!border-zinc-300 !text-zinc-900 placeholder:!text-zinc-500"
                                    autoComplete="current-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                />
                                <InputError message={passwordErrorMessage} className="mt-2" />
                            </div>

                            {/* Ação principal logo após as credenciais — mais espaço para o dropdown de autofill sem tapar o botão */}
                            <div className="pt-1">
                                <PrimaryButton
                                    type="submit"
                                    className="relative z-10 w-full justify-center !rounded-xl !bg-zinc-900 !py-3.5 !text-sm !font-semibold !normal-case !tracking-normal !text-white shadow-sm hover:!bg-zinc-800 disabled:!opacity-50"
                                    disabled={processing}
                                >
                                    Entrar
                                </PrimaryButton>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-zinc-200/80">
                                <label className="flex cursor-pointer items-center gap-2.5">
                                    <Checkbox
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', (e.target.checked || false) as false)}
                                    />
                                    <span className="text-sm text-zinc-600">Manter conectado</span>
                                </label>
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="shrink-0 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline sm:text-right"
                                    >
                                        Esqueceu a senha?
                                    </Link>
                                )}
                            </div>
                        </form>

                        <div className="mt-4">
                            <Link
                                href={route('mobile.news')}
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
                                Cadastro para uso completo do app
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
