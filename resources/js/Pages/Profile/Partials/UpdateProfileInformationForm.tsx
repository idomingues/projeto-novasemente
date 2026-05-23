import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import ProfilePhotoPicker from '@/Components/ProfilePhotoPicker';
import TextInput from '@/Components/TextInput';
import { bibleAvatarKeyFromPhotoUrl } from '@/constants/bibleAvatars';
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
        profileRedirectTo?: string;
    }) || {};
    const profileRedirectTo =
        typeof (page.props as { profileRedirectTo?: string }).profileRedirectTo === 'string'
            ? (page.props as { profileRedirectTo?: string }).profileRedirectTo
            : 'profile.edit';

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
            photo_file: null as File | null,
            avatar_key: '' as string,
            notify_via_app: user.notify_via_app !== false,
            notify_via_email: user.notify_via_email !== false,
            notify_via_whatsapp: user.notify_via_whatsapp === true,
            volunteer_ministry_ids: [] as number[],
            redirect_to: profileRedirectTo,
        });

    useEffect(() => {
        setData('volunteer_ministry_ids', [...volunteerMinistryIds]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(user.photo_url ?? null);

    const handlePhotoFile = async (raw: File | null) => {
        setPhotoClientError(null);
        if (!raw) {
            setData('photo_file', null);
            if (!data.avatar_key) setPhotoPreview(user.photo_url ?? null);
            return;
        }
        setData('avatar_key', '');
        setPhotoPreparing(true);
        try {
            const prepared = await compressImageForUpload(raw);
            setData('photo_file', prepared);
            setPhotoPreview(URL.createObjectURL(prepared));
        } catch (err) {
            setData('photo_file', null);
            setPhotoPreview(user.photo_url ?? null);
            const msg =
                err instanceof ImageCompressError
                    ? err.message
                    : 'Não foi possível preparar a imagem para envio.';
            setPhotoClientError(msg);
        } finally {
            setPhotoPreparing(false);
        }
    };

    const handleAvatarSelect = (key: string | null, previewUrl: string | null) => {
        setPhotoClientError(null);
        setData('avatar_key', key ?? '');
        setData('photo_file', null);
        setPhotoPreview(previewUrl);
    };

    const handlePhotoClear = () => {
        setData('photo_file', null);
        setData('avatar_key', '');
        setPhotoPreview(null);
        setPhotoClientError(null);
    };

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
                    <InputLabel value="Foto de perfil" />
                    <div className="mt-2">
                        <ProfilePhotoPicker
                            previewUrl={photoPreview}
                            selectedAvatarKey={
                                data.avatar_key || bibleAvatarKeyFromPhotoUrl(user.photo_url) || null
                            }
                            photoPreparing={photoPreparing}
                            clientError={photoClientError}
                            serverPhotoError={errors.photo_file}
                            serverAvatarError={errors.avatar_key}
                            required={false}
                            inputId="photo_file"
                            description="Tire ou envie uma nova foto, ou escolha um avatar. Fotos grandes são reduzidas automaticamente (cerca de 500 KB) para o envio no celular."
                            onPhotoFile={handlePhotoFile}
                            onAvatarSelect={handleAvatarSelect}
                            onClear={handlePhotoClear}
                        />
                    </div>
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
