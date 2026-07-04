import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PasswordInput from '@/Components/PasswordInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { applyVolunteerModalFormErrors, submitVolunteerModalPatch } from '@/utils/volunteerPipelineModalSave';
import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Props = {
    submitUrl: string;
    mode?: 'create' | 'update';
    onSuccess?: () => void;
};

export default function VolunteerPasswordChangeForm({ submitUrl, mode = 'update', onSuccess }: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const { data, setData, processing, errors, reset, setError, clearErrors } = useForm({
        app_password: '',
        app_password_confirmation: '',
    });

    const isCreate = mode === 'create';

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        if (!data.app_password.trim() || saving) {
            return;
        }
        clearErrors();
        setSaving(true);
        setSaved(false);
        try {
            const result = await submitVolunteerModalPatch(
                submitUrl,
                {
                    app_password: data.app_password,
                    app_password_confirmation: data.app_password_confirmation,
                },
                csrf,
            );
            if (!result.ok) {
                applyVolunteerModalFormErrors(result.errors, (field, message) =>
                    setError(field as 'app_password' | 'app_password_confirmation', message),
                );
                return;
            }
            reset();
            setSaved(true);
            onSuccess?.();
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                {isCreate ? 'Criar acesso ao app' : 'Nova senha de acesso'}
            </p>
            <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/90">
                {isCreate
                    ? 'Defina a senha inicial para a pessoa entrar no app com o e-mail da ficha. Clique no olho para ver o que está digitando.'
                    : 'Preencha somente se quiser definir uma nova senha. Clique no olho para ver o que está digitando.'}
            </p>
            <form onSubmit={submit} className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel
                            htmlFor="pipeline_app_password"
                            value={isCreate ? 'Senha inicial *' : 'Nova senha (opcional)'}
                            className="mb-1"
                        />
                        <PasswordInput
                            id="pipeline_app_password"
                            className="block w-full"
                            value={data.app_password}
                            onChange={(e) => setData('app_password', e.target.value)}
                            autoComplete="new-password"
                            placeholder={isCreate ? '' : 'Não alterar'}
                            required={isCreate}
                        />
                        <InputError message={errors.app_password} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="pipeline_app_password_confirmation" value="Confirmar nova senha" className="mb-1" />
                        <PasswordInput
                            id="pipeline_app_password_confirmation"
                            className="block w-full"
                            value={data.app_password_confirmation}
                            onChange={(e) => setData('app_password_confirmation', e.target.value)}
                            autoComplete="new-password"
                        />
                        <InputError message={errors.app_password_confirmation} className="mt-2" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <PrimaryButton
                        type="submit"
                        title={isCreate ? 'Criar acesso ao app para este voluntário' : 'Salvar nova senha de acesso ao app'}
                        disabled={processing || saving}
                    >
                        {saving ? 'Salvando…' : isCreate ? 'Criar acesso' : 'Salvar senha'}
                    </PrimaryButton>
                    {saved ? (
                        <p className="text-sm text-amber-900/90 dark:text-amber-100/90">
                            {isCreate ? 'Conta criada com a senha informada.' : 'Senha atualizada.'}
                        </p>
                    ) : null}
                </div>
            </form>
        </section>
    );
}
