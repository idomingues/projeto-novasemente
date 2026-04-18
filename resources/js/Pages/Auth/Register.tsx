import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

interface InvitationProps {
    email: string | null;
    name: string | null;
    role: string | null;
    token: string;
    completes_existing_user: boolean;
}

interface Props {
    invitation: InvitationProps | null;
}

type LooseErrors = Record<string, string | string[] | undefined> | undefined;

function firstError(errors: LooseErrors, field: string): string | undefined {
    const v = errors?.[field];
    if (v == null) {
        return undefined;
    }
    if (Array.isArray(v)) {
        return v[0];
    }
    return typeof v === 'string' ? v : String(v);
}

export default function Register({ invitation }: Props) {
    const page = usePage();
    const pageErrors = ((page.props as { errors?: Record<string, string | string[]> }).errors ?? {}) as Record<
        string,
        string | string[]
    >;

    const { data, setData, post, processing, errors: formErrors, reset } = useForm({
        name: invitation?.name ?? '',
        email: invitation?.email ?? '',
        password: '',
        password_confirmation: '',
        invitation_token: invitation?.token ?? '',
        already_volunteer: false as boolean,
    });

    const fieldError = (field: string) => firstError(formErrors, field) ?? firstError(pageErrors, field);

    const hasAnyError = useMemo(() => {
        if (Object.keys(formErrors).length > 0) {
            return true;
        }

        return Object.keys(pageErrors).some((k) => firstError(pageErrors, k) !== undefined);
    }, [formErrors, pageErrors]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            preserveScroll: true,
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const errClass = (field: string) => (fieldError(field) ? 'border-red-500 focus:border-red-600 focus:ring-red-500/25' : '');

    return (
        <GuestLayout>
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:max-w-lg sm:py-14">
                <Head title={invitation ? 'Cadastro por convite' : 'Criar conta'} />

                {invitation ? (
                    <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                        {invitation.completes_existing_user
                            ? 'Finalize seu cadastro informando e-mail e senha de acesso.'
                            : 'Você foi convidado a criar sua conta. Preencha os dados abaixo.'}
                    </p>
                ) : (
                    <div className="mb-8 space-y-3">
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                            Criar conta para usar o app completo
                        </h1>
                        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Preencha nome, e-mail e senha. Com a conta você poderá usar o agendamento pastoral, falar com
                            seu líder ou realizar solicitações diversas.
                        </p>
                    </div>
                )}

                {hasAnyError ? (
                    <div
                        className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
                        role="alert"
                    >
                        Não foi possível concluir o cadastro. Verifique os campos em destaque.
                    </div>
                ) : null}

                <form noValidate onSubmit={submit} className="space-y-5">
                    <div>
                        <InputLabel htmlFor="name" value="Nome completo" />

                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className={`mt-1 block w-full ${errClass('name')}`}
                            autoComplete="name"
                            isFocused={true}
                            onChange={(e) => setData('name', e.target.value)}
                            readOnly={!!invitation?.completes_existing_user}
                            aria-invalid={fieldError('name') ? 'true' : undefined}
                        />

                        <InputError message={fieldError('name')} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="E-mail" />

                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className={`mt-1 block w-full ${errClass('email')}`}
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            readOnly={!!invitation?.email}
                            aria-invalid={fieldError('email') ? 'true' : undefined}
                        />

                        <InputError message={fieldError('email')} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Senha" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className={`mt-1 block w-full ${errClass('password')}`}
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            aria-invalid={fieldError('password') ? 'true' : undefined}
                        />

                        <InputError message={fieldError('password')} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirmar senha" />

                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className={`mt-1 block w-full ${errClass('password_confirmation')}`}
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            aria-invalid={fieldError('password_confirmation') ? 'true' : undefined}
                        />

                        <InputError message={fieldError('password_confirmation')} className="mt-2" />
                    </div>

                    {!invitation ? (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="already_volunteer"
                                    checked={data.already_volunteer}
                                    onChange={(e) => setData('already_volunteer', e.target.checked)}
                                />
                                <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                    <span className="font-semibold text-zinc-900 dark:text-white">Já sou voluntário</span> na
                                    igreja (a equipe já me tem no cadastro de voluntários). Ao marcar, ligamos a sua conta ao
                                    registo existente pelo e-mail.
                                </span>
                            </label>
                            <InputError message={fieldError('already_volunteer')} className="mt-2" />
                        </div>
                    ) : null}

                    <input type="hidden" name="invitation_token" value={data.invitation_token} />

                    <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                            href={route('login')}
                            className="order-2 text-center text-sm text-zinc-600 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:order-1 sm:text-left"
                        >
                            Já tem conta? Entrar
                        </Link>

                        <PrimaryButton
                            className="order-1 w-full justify-center sm:order-2 sm:w-auto sm:min-w-[11rem]"
                            disabled={processing}
                        >
                            Criar conta
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
