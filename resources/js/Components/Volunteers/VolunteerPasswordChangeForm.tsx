import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PasswordInput from '@/Components/PasswordInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Props = {
    submitUrl: string;
    onSuccess?: () => void;
};

export default function VolunteerPasswordChangeForm({ submitUrl, onSuccess }: Props) {
    const { data, setData, patch, processing, errors, reset, recentlySuccessful } = useForm({
        app_password: '',
        app_password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!data.app_password.trim()) {
            return;
        }
        patch(submitUrl, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onSuccess?.();
            },
        });
    };

    return (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Nova senha de acesso</p>
            <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/90">
                Preencha somente se quiser definir uma nova senha. Clique no olho para ver o que está digitando.
            </p>
            <form onSubmit={submit} className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="pipeline_app_password" value="Nova senha (opcional)" className="mb-1" />
                        <PasswordInput
                            id="pipeline_app_password"
                            className="block w-full"
                            value={data.app_password}
                            onChange={(e) => setData('app_password', e.target.value)}
                            autoComplete="new-password"
                            placeholder="Não alterar"
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
                    <PrimaryButton type="submit" disabled={processing}>
                        Salvar senha
                    </PrimaryButton>
                    {recentlySuccessful ? (
                        <p className="text-sm text-amber-900/90 dark:text-amber-100/90">Senha atualizada.</p>
                    ) : null}
                </div>
            </form>
        </section>
    );
}
