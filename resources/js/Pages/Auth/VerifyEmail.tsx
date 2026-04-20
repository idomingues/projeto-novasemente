import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verificação de e-mail" />

            <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:max-w-lg sm:py-14">
                <div className="mb-8 space-y-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Confirme seu e-mail
                    </h1>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Enviamos um link de verificação para o seu e-mail. Abra a mensagem e clique no link para ativar sua conta.
                    </p>
                </div>

                {status === 'verification-link-sent' ? (
                    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                        Enviamos um novo link de verificação para o seu e-mail.
                    </div>
                ) : null}

                <form onSubmit={submit} className="space-y-4">
                    <PrimaryButton
                        disabled={processing}
                        className="w-full justify-center !rounded-xl !bg-zinc-900 !py-3.5 !text-sm !font-semibold !text-white shadow-sm hover:!bg-zinc-800 disabled:!opacity-50"
                    >
                        Reenviar e-mail de verificação
                    </PrimaryButton>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="block w-full text-center text-sm font-medium text-zinc-600 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                        Sair
                    </Link>
                </form>
            </div>
        </GuestLayout>
    );
}
