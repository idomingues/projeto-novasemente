import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({
    status,
    showMailLogHint = false,
}: {
    status?: string;
    showMailLogHint?: boolean;
}) {
    const { data, setData, post, processing, errors, transform } = useForm({
        email: '',
    });

    transform((formData) => ({
        ...formData,
        email: formData.email.trim().toLowerCase(),
    }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Recuperar senha" />

            <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:max-w-lg sm:py-14">
                <div className="mb-8 space-y-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Esqueceu a senha?
                    </h1>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Informe o mesmo e-mail que você usa para entrar (o do cadastro de voluntário, se for o caso).
                        Enviaremos um link para redefinir a senha.
                    </p>
                </div>

                {status ? (
                    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                        {status}
                    </div>
                ) : null}

                {showMailLogHint ? (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-medium">Ambiente de desenvolvimento</p>
                        <p className="mt-1 leading-relaxed">
                            O envio está em <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/60">MAIL_MAILER=log</code>: não
                            chega e-mail à caixa de entrada. Abra <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/60">storage/logs/laravel.log</code> após
                            enviar — o link de redefinição fica registrado lá. Para testar e-mail real, configure SMTP no{' '}
                            <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/60">.env</code>.
                        </p>
                    </div>
                ) : null}

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <InputLabel htmlFor="email" value="E-mail" />
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

                    <PrimaryButton className="w-full justify-center !rounded-xl !bg-zinc-900 !py-3.5 !text-sm !font-semibold !text-white shadow-sm hover:!bg-zinc-800 disabled:!opacity-50" disabled={processing}>
                        Enviar link de recuperação
                    </PrimaryButton>

                    <div className="pt-1">
                        <Link
                            href={route('login')}
                            className="block text-center text-sm font-medium text-zinc-600 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                            Voltar para entrar
                        </Link>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
