import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import ProfilePhotoPicker from '@/Components/ProfilePhotoPicker';
import TextInput from '@/Components/TextInput';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

interface VolunteerMinistry {
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

    const { volunteerMinistries = [] } = (page.props as {
        volunteerMinistries?: VolunteerMinistry[];
        profileRedirectTo?: string;
    }) || {};
    const isVolunteer =
        (page.props as { auth?: { user?: { is_volunteer?: boolean } } }).auth?.user?.is_volunteer === true;
    const profileRedirectTo =
        typeof (page.props as { profileRedirectTo?: string }).profileRedirectTo === 'string'
            ? (page.props as { profileRedirectTo?: string }).profileRedirectTo
            : 'profile.edit';

    const initialFormData = useMemo(
        () => ({
            name: user.name,
            email: user.email,
            photo_file: null as File | null,
            notify_via_app: user.notify_via_app !== false,
            notify_via_email: user.notify_via_email !== false,
            notify_via_whatsapp: user.notify_via_whatsapp === true,
            redirect_to: profileRedirectTo,
        }),
        [
            user.name,
            user.email,
            user.notify_via_app,
            user.notify_via_email,
            user.notify_via_whatsapp,
            profileRedirectTo,
        ],
    );

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm(initialFormData);

    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(user.photo_url ?? null);

    useEffect(() => {
        setData(initialFormData);
        setPhotoPreview(user.photo_url ?? null);
        setPhotoClientError(null);
    }, [initialFormData, setData, user.photo_url]);

    const errorMessages = useMemo(() => {
        const list: string[] = [];
        for (const value of Object.values(errors)) {
            if (typeof value === 'string' && value.trim() !== '') {
                list.push(value);
            }
        }
        return list;
    }, [errors]);

    const handlePhotoFile = async (raw: File | null) => {
        setPhotoClientError(null);
        if (!raw) {
            setData('photo_file', null);
            setPhotoPreview(user.photo_url ?? null);
            return;
        }
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

    const handlePhotoClear = () => {
        setData('photo_file', null);
        setPhotoPreview(null);
        setPhotoClientError(null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), {
            forceFormData: data.photo_file instanceof File,
            preserveScroll: true,
            onError: () => {
                document.getElementById('profile-form-errors')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            },
        });
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
                {errorMessages.length > 0 ? (
                    <div
                        id="profile-form-errors"
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
                    >
                        <p className="font-semibold">Não foi possível salvar</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            {errorMessages.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div>
                    <InputLabel value="Foto de perfil" />
                    <div className="mt-2">
                        <ProfilePhotoPicker
                            previewUrl={photoPreview}
                            photoPreparing={photoPreparing}
                            clientError={photoClientError}
                            serverPhotoError={errors.photo_file}
                            required={false}
                            inputId="photo_file"
                            description="Tire ou envie uma nova foto. Fotos grandes são reduzidas automaticamente (cerca de 500 KB) para o envio no celular."
                            onPhotoFile={handlePhotoFile}
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

                <div className="flex flex-wrap items-center gap-4">
                    <PrimaryButton disabled={processing || photoPreparing}>
                        {processing ? 'Salvando…' : 'Salvar'}
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            Perfil salvo com sucesso.
                        </p>
                    </Transition>
                </div>
            </form>

            {isVolunteer ? (
                <div
                    className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 dark:border-zinc-600 dark:bg-zinc-800/30 space-y-3"
                    aria-label="Departamentos em que serve — somente leitura"
                >
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Departamentos em que serve</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        Somente consulta. A lista é definida pela equipe de voluntariado. Para alterações, fale com um líder ou com a
                        secretaria.
                    </p>
                    {volunteerMinistries.length > 0 ? (
                        <ul className="space-y-1.5 text-sm text-gray-800 dark:text-gray-200">
                            {volunteerMinistries.map((m) => (
                                <li key={m.id} className="flex items-center gap-2">
                                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500 dark:bg-zinc-400" />
                                    {m.name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Você ainda não está vinculado a nenhum departamento.
                        </p>
                    )}
                </div>
            ) : null}
        </section>
    );
}
