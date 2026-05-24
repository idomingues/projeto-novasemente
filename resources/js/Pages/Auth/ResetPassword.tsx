import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import PasswordInput from '@/Components/PasswordInput';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Redefinir senha" />

            <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:max-w-lg sm:py-14">
                <div className="mb-8 space-y-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Defina uma nova senha
                    </h1>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Escolha uma senha forte para proteger a sua conta.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <InputLabel htmlFor="email" value="E-mail" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full bg-zinc-50 dark:bg-zinc-800/60"
                            autoComplete="username"
                            readOnly
                        />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Use o mesmo e-mail indicado no pedido de recuperação.
                        </p>
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Nova senha" />
                        <PasswordInput
                            id="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            isFocused={true}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirmar nova senha" />
                        <PasswordInput
                            id="password_confirmation"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>

                    <PrimaryButton className="w-full justify-center !rounded-xl !bg-zinc-900 !py-3.5 !text-sm !font-semibold !text-white shadow-sm hover:!bg-zinc-800 disabled:!opacity-50" disabled={processing}>
                        Redefinir senha
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
