import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

interface MinistryOption {
    id: number;
    name: string;
}

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const page = usePage();
    const user = page.props.auth.user as {
        name: string;
        email: string;
        email_verified_at?: string | null;
        photo_url?: string | null;
        notify_via_app?: boolean;
        notify_via_email?: boolean;
        notify_via_whatsapp?: boolean;
    };

    const { ministryOptions = [], volunteerMinistryIds = [] } = (page.props as {
        ministryOptions?: MinistryOption[];
        volunteerMinistryIds?: number[];
    }) || {};

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
            photo_file: null as File | null,
            notify_via_app: user.notify_via_app !== false,
            notify_via_email: user.notify_via_email !== false,
            notify_via_whatsapp: user.notify_via_whatsapp === true,
            volunteer_ministry_ids: [] as number[],
        });

    useEffect(() => {
        setData('volunteer_ministry_ids', [...volunteerMinistryIds]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);

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
                            {user.photo_url ? (
                                <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                user.name?.charAt(0)?.toUpperCase() ?? '?'
                            )}
                        </div>
                        <input
                            id="photo_file"
                            type="file"
                            accept="image/*"
                            disabled={photoPreparing}
                            onChange={async (e) => {
                                const input = e.currentTarget;
                                const raw = input.files?.[0] ?? null;
                                setPhotoClientError(null);
                                if (!raw) {
                                    setData('photo_file', null);
                                    return;
                                }
                                setPhotoPreparing(true);
                                try {
                                    const prepared = await compressImageForUpload(raw);
                                    setData('photo_file', prepared);
                                } catch (err) {
                                    setData('photo_file', null);
                                    input.value = '';
                                    const msg =
                                        err instanceof ImageCompressError
                                            ? err.message
                                            : 'Não foi possível preparar a imagem para envio.';
                                    setPhotoClientError(msg);
                                } finally {
                                    setPhotoPreparing(false);
                                }
                            }}
                            className="block w-full text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 dark:file:text-zinc-100 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 disabled:opacity-60"
                        />
                    </div>
                    {photoPreparing ? (
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">A preparar a imagem…</p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Fotos grandes são reduzidas automaticamente (cerca de 500 KB) para o envio correr bem no telemóvel.
                    </p>
                    <InputError className="mt-2" message={photoClientError ?? undefined} />
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

                <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comunicações</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        Informações da igreja e da app por estes meios.
                    </p>
                    <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox
                            checked={data.notify_via_app}
                            onChange={(e) => setData('notify_via_app', e.target.checked)}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Notificações na app</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox
                            checked={data.notify_via_email}
                            onChange={(e) => setData('notify_via_email', e.target.checked)}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200">E-mail</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox
                            checked={data.notify_via_whatsapp}
                            onChange={(e) => setData('notify_via_whatsapp', e.target.checked)}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200">WhatsApp (quando disponível)</span>
                    </label>
                    <InputError className="mt-1" message={errors.notify_via_app} />
                    <InputError className="mt-1" message={errors.notify_via_email} />
                    <InputError className="mt-1" message={errors.notify_via_whatsapp} />
                </div>

                {ministryOptions.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Departamentos em que serve</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Os líderes usam esta lista para o montar escalas. Pode alterar quando quiser.
                        </p>
                        <div className="space-y-2">
                            {ministryOptions.map((m) => (
                                <label key={m.id} className="flex cursor-pointer items-start gap-3">
                                    <Checkbox
                                        checked={data.volunteer_ministry_ids.includes(m.id)}
                                        onChange={(e) => {
                                            const on = e.target.checked;
                                            const next = new Set(data.volunteer_ministry_ids);
                                            if (on) {
                                                next.add(m.id);
                                            } else {
                                                next.delete(m.id);
                                            }
                                            setData('volunteer_ministry_ids', [...next]);
                                        }}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">{m.name}</span>
                                </label>
                            ))}
                        </div>
                        <InputError className="mt-1" message={errors.volunteer_ministry_ids} />
                    </div>
                )}

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
