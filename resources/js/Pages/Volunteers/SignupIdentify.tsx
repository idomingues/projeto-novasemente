import FlashMessages from '@/Components/FlashMessages';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { FormEventHandler } from 'react';

type Props = {
    token: string;
    churchName: string;
    identifyUrl: string;
};

export default function SignupIdentify({ token, churchName, identifyUrl }: Props) {
    const form = useForm({
        token,
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(identifyUrl);
    };

    return (
        <MobileLayout>
            <Head title={`Cadastro voluntário — ${churchName}`} />
            <FlashMessages />

            <div className="mx-auto w-full max-w-md space-y-5 px-1 sm:px-0">
                <header>
                    <Link
                        href={route('more.index')}
                        className="mb-4 inline-flex cursor-pointer text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                    >
                        Voltar
                    </Link>
                    <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 shadow-sm dark:bg-teal-500">
                            <UserPlusIcon className="size-6 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                Cadastro voluntário
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{churchName}</p>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                Passo 1: informe seu <span className="font-semibold text-zinc-800 dark:text-zinc-200">e-mail</span>.
                                Usamos essa chave para identificar se você já é voluntário e sugerir o próximo passo —
                                sem pedir o formulário completo de novo se não for preciso.
                            </p>
                        </div>
                    </div>
                </header>

                <div
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"
                    role="note"
                >
                    <p className="font-semibold text-zinc-900 dark:text-white">O que acontece a seguir</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                        <li>E-mail novo → sugerimos começar o cadastro</li>
                        <li>Já voluntário → sugerimos atualizar ou pedir departamento</li>
                        <li>Pré-cadastro da equipe → sugerimos concluir o acesso ao app</li>
                    </ul>
                </div>

                <form
                    onSubmit={submit}
                    className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
                >
                    <div>
                        <InputLabel htmlFor="signup-identify-email" value="E-mail (chave de identificação)" />
                        <TextInput
                            id="signup-identify-email"
                            type="email"
                            className="mt-1.5 w-full"
                            value={form.data.email}
                            autoComplete="email"
                            autoFocus
                            required
                            onChange={(e) => form.setData('email', e.target.value)}
                        />
                        <InputError className="mt-2" message={form.errors.email ?? form.errors.token} />
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Use o mesmo e-mail do aplicativo, se já tiver conta.
                        </p>
                    </div>

                    <PrimaryButton type="submit" className="w-full justify-center" disabled={form.processing}>
                        Identificar e ver o que fazer
                    </PrimaryButton>
                </form>
            </div>
        </MobileLayout>
    );
}
