import BrDateInput from '@/Components/BrDateInput';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PasswordInput from '@/Components/PasswordInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import { PhotoPreviewButton } from '@/Components/PhotoPreview';
import { appRoleLabel } from '@/lib/appRoleLabels';
import {
    buildVolunteerEditFormData,
    volunteerEditFormDataFromDetail,
    volunteerUserIsPanelTeam,
    volunteerUserIsSuperAdmin,
    type VolunteerEditFormData,
} from '@/utils/volunteerEditForm';
import type { VolunteerDetailData } from '@/utils/volunteerDetailRows';
import {
    applyVolunteerModalFormErrors,
    submitVolunteerModalFormDataPut,
} from '@/utils/volunteerPipelineModalSave';
import { CameraIcon } from '@heroicons/react/24/outline';
import { usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

type AppRoleOption = { id: number; name: string };

const appRoleFieldShellClass =
    'rounded-2xl border border-emerald-300/90 bg-emerald-50/70 p-4 shadow-sm ring-1 ring-emerald-200/50 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:ring-emerald-900/40';

const appRoleReadonlyValueClass =
    'mt-2 rounded-xl border border-emerald-200/80 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 dark:border-emerald-800/50 dark:bg-zinc-900/50 dark:text-zinc-100';

type Props = {
    volunteer: VolunteerDetailData;
    appRoles: AppRoleOption[];
    submitUrl: string;
    onSuccess?: () => void;
    idPrefix?: string;
};

export default function VolunteerUserEditForm({
    volunteer,
    appRoles,
    submitUrl,
    onSuccess,
    idPrefix = 'vol-app',
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const [saving, setSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [data, setData] = useState<VolunteerEditFormData>(() => volunteerEditFormDataFromDetail(volunteer));
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const savedPhoto =
        volunteer.photo_url?.trim() || volunteer.user?.photo_url?.trim() || null;
    const lastSavedPhotoRef = useRef<string | null>(savedPhoto);
    const [avatarPreviewSrc, setAvatarPreviewSrc] = useState<string | null>(savedPhoto);

    const editingUserIsSuperAdmin = volunteerUserIsSuperAdmin(volunteer);
    const editingUserIsPanelTeam = volunteerUserIsPanelTeam(volunteer);
    const isMinistryLeader = data.app_role === 'lider_ministerio';
    const hasAppAccount = Boolean(volunteer.has_app_account);
    const appRolesForSelect = appRoles.filter((r) => r.name !== 'lider_ministerio');

    useEffect(() => {
        const next = volunteerEditFormDataFromDetail(volunteer);
        setData(next);
        setErrors({});
        setSavedMessage(null);
        const photo = volunteer.photo_url?.trim() || volunteer.user?.photo_url?.trim() || null;
        lastSavedPhotoRef.current = photo;
        setAvatarPreviewSrc(photo);
    }, [volunteer]);

    const setField = <K extends keyof VolunteerEditFormData>(key: K, value: VolunteerEditFormData[K]) => {
        setData((prev) => ({ ...prev, [key]: value }));
    };

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setSavedMessage(null);
        setErrors({});
        try {
            const formData = buildVolunteerEditFormData(data, { includeServeMinistries: false });
            const result = await submitVolunteerModalFormDataPut(submitUrl, formData, csrf);
            if (!result.ok) {
                const nextErrors: Partial<Record<string, string>> = {};
                applyVolunteerModalFormErrors(result.errors, (field, message) => {
                    nextErrors[field] = message;
                });
                setErrors(nextErrors);
                return;
            }
            setData((prev) => ({ ...prev, app_password: '', app_password_confirmation: '', photo: null }));
            setSavedMessage(hasAppAccount ? 'Conta no app atualizada.' : 'Conta no app criada ou atualizada.');
            onSuccess?.();
            window.setTimeout(() => setSavedMessage(null), 5000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            {savedMessage ? (
                <p
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
                    role="status"
                >
                    {savedMessage}
                </p>
            ) : null}

            <section className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Foto</p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                    {avatarPreviewSrc ? (
                        <PhotoPreviewButton
                            photoUrl={avatarPreviewSrc}
                            name={data.name?.trim() || volunteer.name}
                            className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-600"
                            imageClassName="h-full w-full rounded-2xl object-cover"
                            stopPropagation={false}
                        />
                    ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800">
                            <CameraIcon className="h-8 w-8 text-zinc-400" aria-hidden />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <input
                            id={`${idPrefix}_photo`}
                            type="file"
                            accept="image/*"
                            capture="user"
                            className="block w-full cursor-pointer text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (avatarPreviewSrc?.startsWith('blob:')) {
                                    URL.revokeObjectURL(avatarPreviewSrc);
                                }
                                setField('photo', file);
                                setAvatarPreviewSrc(file ? URL.createObjectURL(file) : lastSavedPhotoRef.current);
                                e.target.value = '';
                            }}
                        />
                        <InputError message={errors.photo} className="!mt-1" />
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div>
                    <InputLabel htmlFor={`${idPrefix}_name`} value="Nome completo" />
                    <TextInput
                        id={`${idPrefix}_name`}
                        value={data.name}
                        onChange={(e) => setField('name', e.target.value)}
                        className="mt-1 block w-full"
                    />
                    <InputError message={errors.name} className="mt-1" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor={`${idPrefix}_phone`} value="Telefone (opcional)" />
                        <TextInput
                            id={`${idPrefix}_phone`}
                            value={data.phone}
                            onChange={(e) => setField('phone', e.target.value)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.phone} className="mt-1" />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                        <div className="min-w-0 flex-1">
                            <InputLabel value="Ativo nas escalas" />
                        </div>
                        <button
                            type="button"
                            onClick={() => setField('active', !data.active)}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                                data.active ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                            }`}
                            role="switch"
                            aria-checked={data.active}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                    data.active ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
                <div>
                    <InputLabel htmlFor={`${idPrefix}_email`} value="E-mail (login no app)" />
                    <TextInput
                        id={`${idPrefix}_email`}
                        type="email"
                        value={data.email}
                        onChange={(e) => setField('email', e.target.value)}
                        className="mt-1 block w-full"
                        placeholder="usuario@exemplo.com"
                    />
                    <InputError message={errors.email} className="mt-1" />
                </div>
                <div className={appRoleFieldShellClass}>
                    <InputLabel
                        htmlFor={`${idPrefix}_app_role`}
                        value="Perfil de acesso"
                        className="!text-sm !font-semibold !text-emerald-950 dark:!text-emerald-100"
                    />
                    <p className="mt-0.5 text-xs text-emerald-900/75 dark:text-emerald-200/80">
                        Define o que esta pessoa pode fazer no aplicativo.
                    </p>
                    {editingUserIsSuperAdmin ? (
                        <p className={appRoleReadonlyValueClass}>
                            {appRoleLabel('super_admin')} — gerido em Usuários.
                        </p>
                    ) : editingUserIsPanelTeam ? (
                        <p className={appRoleReadonlyValueClass}>
                            {(volunteer.user?.roles ?? [])
                                .filter((r) => r !== 'super_admin')
                                .map((r) => appRoleLabel(r))
                                .join(', ') || 'Equipe do painel'}{' '}
                            — altere em Usuários.
                        </p>
                    ) : isMinistryLeader ? (
                        <p className={appRoleReadonlyValueClass}>
                            {appRoleLabel('lider_ministerio')} — departamentos que lidera na aba
                            Departamentos.
                        </p>
                    ) : (
                        <SelectInput
                            id={`${idPrefix}_app_role`}
                            value={data.app_role === 'lider_ministerio' ? '' : data.app_role}
                            onChange={(e) => setField('app_role', e.target.value)}
                            className="mt-2 block w-full border-emerald-300/70 bg-white focus:border-emerald-500 focus:ring-emerald-500/25 dark:border-emerald-800/60 dark:bg-zinc-900 dark:focus:border-emerald-500"
                        >
                            <option value="">Sem perfil (só conta até definir permissões)</option>
                            {appRolesForSelect.map((r) => (
                                <option key={r.id} value={r.name}>
                                    {appRoleLabel(r.name)}
                                </option>
                            ))}
                        </SelectInput>
                    )}
                    <InputError message={errors.app_role} className="mt-1" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor={`${idPrefix}_birth_date`} value="Data de nascimento (opcional)" />
                        <BrDateInput
                            id={`${idPrefix}_birth_date`}
                            value={data.birth_date}
                            onChange={(iso) => setField('birth_date', iso)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.birth_date} className="mt-1" />
                    </div>
                    {hasAppAccount || data.email.trim() !== '' ? (
                        <div>
                            <InputLabel htmlFor={`${idPrefix}_user_status`} value="Situação da conta" />
                            <SelectInput
                                id={`${idPrefix}_user_status`}
                                value={data.user_status}
                                onChange={(e) =>
                                    setField('user_status', e.target.value as 'active' | 'inactive')
                                }
                                className="mt-1 block w-full"
                            >
                                <option value="active">Ativa (pode entrar no app)</option>
                                <option value="inactive">Inativa (bloqueia login)</option>
                            </SelectInput>
                            <InputError message={errors.user_status} className="mt-1" />
                        </div>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <InputLabel value="Comunicações" />
                    <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                            checked={data.notify_via_app}
                            onChange={(e) => setField('notify_via_app', e.target.checked)}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-200">Notificações no app</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                            checked={data.notify_via_email}
                            onChange={(e) => setField('notify_via_email', e.target.checked)}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-200">E-mail</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                            checked={data.notify_via_whatsapp}
                            onChange={(e) => setField('notify_via_whatsapp', e.target.checked)}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-200">WhatsApp</span>
                    </label>
                </div>
            </section>

            {!editingUserIsSuperAdmin ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                        {hasAppAccount ? 'Nova senha (opcional)' : 'Senha para criar acesso'}
                    </p>
                    <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/90">
                        {hasAppAccount
                            ? editingUserIsPanelTeam
                                ? 'Altera a senha de login no app. Deixe em branco para manter a atual.'
                                : 'Deixe em branco para manter a senha atual.'
                            : 'Obrigatória na primeira vez que criar a conta com este e-mail.'}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel
                                htmlFor={`${idPrefix}_app_password`}
                                value={hasAppAccount ? 'Nova senha' : 'Senha'}
                            />
                            <PasswordInput
                                id={`${idPrefix}_app_password`}
                                value={data.app_password}
                                onChange={(e) => setField('app_password', e.target.value)}
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                            />
                            <InputError message={errors.app_password} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor={`${idPrefix}_app_password_confirmation`} value="Confirmar senha" />
                            <PasswordInput
                                id={`${idPrefix}_app_password_confirmation`}
                                value={data.app_password_confirmation}
                                onChange={(e) => setField('app_password_confirmation', e.target.value)}
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                            />
                            <InputError message={errors.app_password_confirmation} className="mt-1" />
                        </div>
                    </div>
                </section>
            ) : null}

            <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <PrimaryButton type="submit" disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar usuário APP'}
                </PrimaryButton>
            </div>
        </form>
    );
}
