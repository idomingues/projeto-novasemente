import PrimaryButton from '@/Components/PrimaryButton';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const REDIRECT_MS = 6000;

export default function SignupWelcome() {
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(REDIRECT_MS / 1000));

    useEffect(() => {
        const interval = window.setInterval(() => {
            setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);

        const timeout = window.setTimeout(() => {
            window.location.assign(route('login'));
        }, REDIRECT_MS);

        return () => {
            window.clearInterval(interval);
            window.clearTimeout(timeout);
        };
    }, []);

    return (
        <MobileLayout>
            <Head title="Cadastro de voluntário concluído" />

            <div className="mx-auto w-full max-w-md py-6 sm:max-w-lg sm:py-8">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-6 py-8 text-center shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 sm:px-10">
                    <div
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-md shadow-emerald-600/25"
                        aria-hidden
                    >
                        ✓
                    </div>
                    <h1 className="mt-6 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                        Cadastro de voluntário concluído
                    </h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200 sm:text-base">
                        Seu cadastro foi recebido pela equipe. Agora faça login no aplicativo com o{' '}
                        <strong className="font-semibold text-zinc-900 dark:text-white">mesmo e-mail</strong> e a{' '}
                        <strong className="font-semibold text-zinc-900 dark:text-white">senha</strong> que você definiu
                        neste formulário.
                    </p>
                    <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                        Indo para o login em {secondsLeft}s…
                    </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:items-center">
                    <Link href={route('login')} className="inline-flex w-full sm:w-auto">
                        <PrimaryButton
                            type="button"
                            className="w-full justify-center !bg-zinc-900 !text-white hover:!bg-zinc-800 sm:min-w-[14rem]"
                        >
                            Entrar no aplicativo
                        </PrimaryButton>
                    </Link>
                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Se não for redirecionado, use o botão acima.
                    </p>
                </div>
            </div>
        </MobileLayout>
    );
}
