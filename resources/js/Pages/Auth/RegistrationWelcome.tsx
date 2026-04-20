import PrimaryButton from '@/Components/PrimaryButton';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const REDIRECT_MS = 5000;

function cultoAfterRegistrationUrl(): string {
    const base = route('mobile.news');
    const join = base.includes('?') ? '&' : '?';

    return `${base}${join}reg_ok=1`;
}

export default function RegistrationWelcome() {
    const user = usePage().props.auth.user as { name: string } | null;
    const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';

    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(REDIRECT_MS / 1000));

    useEffect(() => {
        const interval = window.setInterval(() => {
            setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);

        const timeout = window.setTimeout(() => {
            router.visit(cultoAfterRegistrationUrl());
        }, REDIRECT_MS);

        return () => {
            window.clearInterval(interval);
            window.clearTimeout(timeout);
        };
    }, []);

    return (
        <MobileLayout>
            <Head title="Cadastro concluído" />

            <div className="mx-auto w-full max-w-md py-6 sm:max-w-lg sm:py-8">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-6 py-8 text-center shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 sm:px-10">
                    <div
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-md shadow-emerald-600/25"
                        aria-hidden
                    >
                        ✓
                    </div>
                    <h1 className="mt-6 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                        Conta criada com sucesso
                    </h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200 sm:text-base">
                        {firstName ? (
                            <>
                                Parabéns, <span className="font-semibold text-zinc-900 dark:text-white">{firstName}</span>!
                            </>
                        ) : (
                            <>Parabéns!</>
                        )}{' '}
                        O seu cadastro foi concluído e já iniciámos sessão por si. Pode utilizar a app com a sua conta.
                    </p>
                    <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                        A redirecionar para o culto em {secondsLeft}s…
                    </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:items-center">
                    <PrimaryButton
                        type="button"
                        className="w-full justify-center !bg-zinc-900 !text-white hover:!bg-zinc-800 sm:w-auto sm:min-w-[14rem]"
                        onClick={() => router.visit(cultoAfterRegistrationUrl())}
                    >
                        Ir para o culto
                    </PrimaryButton>
                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Se não for redirecionado, use o botão acima.
                    </p>
                </div>
            </div>
        </MobileLayout>
    );
}
