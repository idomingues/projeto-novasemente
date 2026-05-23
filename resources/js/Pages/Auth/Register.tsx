import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import ProfilePhotoPicker from '@/Components/ProfilePhotoPicker';
import TextInput from '@/Components/TextInput';
import MobileLayout from '@/Layouts/MobileLayout';
import { compressImageForUpload, ImageCompressError } from '@/utils/compressImageForUpload';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

interface InvitationProps {
    email: string | null;
    name: string | null;
    role: string | null;
    token: string;
    completes_existing_user: boolean;
}

interface MinistryVolunteerInviteProps {
    token: string;
    email: string;
    name: string | null;
    ministryName: string | null;
    ministryId: number;
}

interface MinistryOption {
    id: number;
    name: string;
}

interface Props {
    invitation: InvitationProps | null;
    ministryVolunteerInvite: MinistryVolunteerInviteProps | null;
    ministryOptions: MinistryOption[];
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

export default function Register({ invitation, ministryVolunteerInvite = null, ministryOptions = [] }: Props) {
    const page = usePage();
    const pageErrors = ((page.props as { errors?: Record<string, string | string[]> }).errors ?? {}) as Record<
        string,
        string | string[]
    >;

    const { data, setData, post, processing, errors: formErrors, reset } = useForm({
        name: invitation?.name ?? ministryVolunteerInvite?.name ?? '',
        email: invitation?.email ?? ministryVolunteerInvite?.email ?? '',
        photo_file: null as File | null,
        avatar_key: '' as string,
        password: '',
        password_confirmation: '',
        invitation_token: invitation?.token ?? '',
        ministry_invite_token: ministryVolunteerInvite?.token ?? '',
        already_volunteer: Boolean(ministryVolunteerInvite),
        volunteer_ministry_ids: ministryVolunteerInvite ? [ministryVolunteerInvite.ministryId] : ([] as number[]),
        notify_via_app: true,
        notify_via_email: true,
        notify_via_whatsapp: false,
        lgpd_accepted: false as boolean,
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
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const errClass = (field: string) => (fieldError(field) ? 'border-red-500 focus:border-red-600 focus:ring-red-500/25' : '');

    const showVolunteerDepartments =
        !invitation && !ministryVolunteerInvite && data.already_volunteer && ministryOptions.length > 0;
    const showVolunteerNoMinistriesHint =
        !invitation && !ministryVolunteerInvite && data.already_volunteer && ministryOptions.length === 0;
    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [photoClientError, setPhotoClientError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoFile = async (raw: File | null) => {
        setPhotoClientError(null);
        if (!raw) {
            setData('photo_file', null);
            if (!data.avatar_key) setPhotoPreview(null);
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
            setPhotoPreview(null);
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

    return (
        <MobileLayout>
            <Head title={invitation ? 'Cadastro por convite' : ministryVolunteerInvite ? 'Convite e cadastro' : 'Criar conta'} />

            <div className="mx-auto w-full max-w-md px-0 sm:max-w-lg">

                {invitation ? (
                    <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                        {invitation.completes_existing_user
                            ? 'Finalize seu cadastro informando e-mail e senha de acesso.'
                            : 'Você foi convidado a criar sua conta. Preencha os dados abaixo.'}
                    </p>
                ) : ministryVolunteerInvite ? (
                    <div className="mb-6 space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            Convite e acesso ao app
                        </h1>
                        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                            Ao concluir o cadastro com o e-mail <strong className="text-zinc-900 dark:text-white">{ministryVolunteerInvite.email}</strong>, o convite para o departamento{' '}
                            <strong className="text-zinc-900 dark:text-white">{ministryVolunteerInvite.ministryName ?? '—'}</strong> fica aceite e a sua conta fica pronta para usar o app. O link que abriu já traz este e-mail no endereço para o campo ser preenchido automaticamente.
                        </p>
                        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
                            Se não entrou por este link e for criar a conta doutra forma, <strong>tem de usar o mesmo e-mail</strong> que consta na ficha de voluntário ({ministryVolunteerInvite.email}). Sem isso, o convite não se associa à sua conta.
                        </p>
                    </div>
                ) : (
                    <div className="mb-8 space-y-3">
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            Cadastro para uso completo do app
                        </h1>
                        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
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

                <form noValidate onSubmit={submit} className="space-y-5 pb-6 sm:pb-8">
                    <div>
                        <InputLabel value="Foto *" />
                        <div className="mt-2">
                            <ProfilePhotoPicker
                                previewUrl={photoPreview}
                                selectedAvatarKey={data.avatar_key || null}
                                photoPreparing={photoPreparing}
                                clientError={photoClientError}
                                serverPhotoError={fieldError('photo_file')}
                                serverAvatarError={fieldError('avatar_key')}
                                inputId="photo_file"
                                description="Tire ou envie uma foto, ou escolha um avatar. A imagem é comprimida automaticamente quando você envia um arquivo."
                                onPhotoFile={handlePhotoFile}
                                onAvatarSelect={handleAvatarSelect}
                                onClear={handlePhotoClear}
                            />
                        </div>
                    </div>

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
                            readOnly={Boolean(invitation?.email) || Boolean(ministryVolunteerInvite)}
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

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-3">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Comunicações</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Autorizo o envio de informações sobre a igreja e a app por estes meios (pode alterar depois no perfil).
                        </p>
                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                name="notify_via_app"
                                checked={data.notify_via_app}
                                onChange={(e) => setData('notify_via_app', e.target.checked)}
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-200">Notificações na app (caixa de entrada)</span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                name="notify_via_email"
                                checked={data.notify_via_email}
                                onChange={(e) => setData('notify_via_email', e.target.checked)}
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-200">E-mail</span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                name="notify_via_whatsapp"
                                checked={data.notify_via_whatsapp}
                                onChange={(e) => setData('notify_via_whatsapp', e.target.checked)}
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-200">WhatsApp (quando o serviço estiver disponível)</span>
                        </label>
                        <InputError message={fieldError('notify_via_app')} className="mt-1" />
                        <InputError message={fieldError('notify_via_email')} className="mt-1" />
                        <InputError message={fieldError('notify_via_whatsapp')} className="mt-1" />
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                        <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                name="lgpd_accepted"
                                checked={data.lgpd_accepted}
                                onChange={(e) => setData('lgpd_accepted', e.target.checked)}
                            />
                            <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                Li e aceito o tratamento dos meus dados pessoais conforme a{' '}
                                <strong className="font-semibold text-zinc-900 dark:text-white">Lei Geral de Proteção de Dados
                                (LGPD)</strong>, para fins de cadastro, pastoral e comunicação da igreja nesta plataforma.
                            </span>
                        </label>
                        <InputError message={fieldError('lgpd_accepted')} className="mt-2" />
                    </div>

                    {!invitation && !ministryVolunteerInvite ? (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 space-y-4">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Voluntariado</p>
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    name="already_volunteer"
                                    checked={data.already_volunteer}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        if (!checked) {
                                            setData('volunteer_ministry_ids', []);
                                            setData('already_volunteer', false);
                                        } else {
                                            setData('already_volunteer', true);
                                        }
                                    }}
                                />
                                <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                    <span className="font-semibold text-zinc-900 dark:text-white">Já sou voluntário</span> no
                                    cadastro da equipe (ligamos a conta ao registro existente pelo e-mail, se existir). Indique
                                    abaixo em que departamentos participa para a escala.
                                </span>
                            </label>
                            <InputError message={fieldError('already_volunteer')} className="mt-2" />
                            {showVolunteerDepartments ? (
                                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-600 space-y-2">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Departamentos</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Marque todos em que participa — ajuda os líderes a incluí-lo nas escalas.
                                    </p>
                                    <div className="space-y-2 pr-1 sm:max-h-48 sm:overflow-y-auto">
                                        {ministryOptions.map((m) => (
                                            <label key={m.id} className="flex cursor-pointer items-start gap-3">
                                                <Checkbox
                                                    name={`volunteer_ministry_${m.id}`}
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
                                                <span className="text-sm text-zinc-700 dark:text-zinc-200">{m.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <InputError message={fieldError('volunteer_ministry_ids')} className="mt-1" />
                                </div>
                            ) : null}
                            {showVolunteerNoMinistriesHint ? (
                                <p className="text-xs text-amber-700 dark:text-amber-300 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                                    Ainda não há departamentos configurados nesta igreja. A secretaria pode associá-lo aos
                                    ministérios depois.
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    <input type="hidden" name="invitation_token" value={data.invitation_token} />
                    <input type="hidden" name="ministry_invite_token" value={data.ministry_invite_token} />

                    <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                            href={route('login')}
                            className="order-2 text-center text-sm text-zinc-600 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-900 dark:text-zinc-600 dark:hover:text-zinc-900 sm:order-1 sm:text-left"
                        >
                            Já tem conta? Entrar
                        </Link>

                        <PrimaryButton
                            className="order-1 w-full justify-center sm:order-2 sm:w-auto sm:min-w-[11rem]"
                            disabled={processing}
                        >
                            {invitation ? 'Fazer cadastro' : ministryVolunteerInvite ? 'Criar conta e aceitar convite' : 'Fazer cadastro'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </MobileLayout>
    );
}
