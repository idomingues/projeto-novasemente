import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user as {
        name: string;
        email: string;
        email_verified_at?: string | null;
        member?: { photo_url?: string | null } | null;
    };

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
            photo_file: null as File | null,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), { forceFormData: true });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Informações do perfil
                </h2>

                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Atualize os dados do seu perfil e o e-mail da conta.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="photo_file" value="Foto de perfil" />
                    <div className="mt-2 flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                            {user.member?.photo_url ? (
                                <img src={user.member.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                user.name?.charAt(0)?.toUpperCase() ?? '?'
                            )}
                        </div>
                        <input
                            id="photo_file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('photo_file', e.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 dark:file:text-zinc-100 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700"
                        />
                    </div>
                    <InputError className="mt-2" message={errors.photo_file} />
                </div>

                <div>
                    <InputLabel htmlFor="name" value="Nome" />

                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="E-mail" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                            Seu e-mail ainda não foi verificado.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 dark:text-gray-400 underline hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            >
                                Clique aqui para reenviar o e-mail de verificação.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                Um novo link de verificação foi enviado para o seu e-mail.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Salvar</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Salvo.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
