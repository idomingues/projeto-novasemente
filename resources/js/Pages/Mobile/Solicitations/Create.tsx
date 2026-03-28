import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';

interface Option {
    value: number;
    label: string;
}

interface Props {
    type: string;
    typeLabel: string;
    storeUrl: string;
    pastorOptions: Option[];
    volunteerOptions: Option[];
}

export default function Create({ type, typeLabel, storeUrl, pastorOptions, volunteerOptions }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        type,
        message: '',
        preferred_date: '',
        assigned_pastor_id: '',
        assigned_volunteer_id: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl);
    };

    return (
        <MobileLayout>
            <Head title={typeLabel} />
            <div className="space-y-6">
                <div>
                    <Link href={route('mobile.solicitations.hub')} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
                        ← Solicitações
                    </Link>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white mt-2">{typeLabel}</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Descreva o seu pedido. A igreja responderá pela conversa do pedido, através do app web.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <div>
                        <InputLabel htmlFor="sol_pref_date" value="Data pretendida ou relevante (opcional)" />
                        <input
                            id="sol_pref_date"
                            type="date"
                            value={data.preferred_date}
                            onChange={(e) => setData('preferred_date', e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                        />
                        <InputError message={errors.preferred_date} className="mt-1" />
                    </div>
                    {(pastorOptions.length > 0 || volunteerOptions.length > 0) && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Pode indicar um pastor ou um voluntário da igreja (não ambos).
                        </p>
                    )}
                    {pastorOptions.length > 0 && (
                        <div>
                            <InputLabel htmlFor="sol_pastor" value="Pastor (opcional)" />
                            <select
                                id="sol_pastor"
                                value={data.assigned_pastor_id}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setData((prev) => ({
                                        ...prev,
                                        assigned_pastor_id: v,
                                        assigned_volunteer_id: v ? '' : prev.assigned_volunteer_id,
                                    }));
                                }}
                                className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                            >
                                <option value="">— Nenhum —</option>
                                {pastorOptions.map((o) => (
                                    <option key={o.value} value={String(o.value)}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.assigned_pastor_id} className="mt-1" />
                        </div>
                    )}
                    {volunteerOptions.length > 0 && (
                        <div>
                            <InputLabel htmlFor="sol_volunteer" value="Voluntário (opcional)" />
                            <select
                                id="sol_volunteer"
                                value={data.assigned_volunteer_id}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setData((prev) => ({
                                        ...prev,
                                        assigned_volunteer_id: v,
                                        assigned_pastor_id: v ? '' : prev.assigned_pastor_id,
                                    }));
                                }}
                                className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                            >
                                <option value="">— Nenhum —</option>
                                {volunteerOptions.map((o) => (
                                    <option key={o.value} value={String(o.value)}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.assigned_volunteer_id} className="mt-1" />
                        </div>
                    )}
                    <div>
                        <InputLabel htmlFor="sol_message" value="Mensagem" />
                        <Textarea
                            id="sol_message"
                            value={data.message}
                            onChange={(e) => setData('message', e.target.value)}
                            rows={8}
                            className="mt-1 block w-full"
                            placeholder="Escreva os detalhes do seu pedido…"
                            required
                        />
                        <InputError message={errors.message} className="mt-1" />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                        <SecondaryButton type="button" className="justify-center" onClick={() => router.visit(route('mobile.solicitations.hub'))}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing} className="justify-center">
                            Enviar pedido
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </MobileLayout>
    );
}
