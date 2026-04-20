import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { solicitationsBackLinkClass } from '@/Pages/Mobile/Solicitations/solicitationNavClasses';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';

interface Option {
    value: number;
    label: string;
}

interface Props {
    type: string;
    typeLabel: string;
    storeUrl: string;
    pastorOptions: Option[];
}

export default function Create({ type, typeLabel, storeUrl, pastorOptions }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        type,
        message: '',
        preferred_date: '',
        assigned_pastor_id: '',
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
                    <Link href={route('mobile.solicitations.hub')} className={solicitationsBackLinkClass}>
                        ← Solicitações
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{typeLabel}</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        A igreja responderá pelo seu pedido através do App e email.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
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
                    <div>
                        <InputLabel htmlFor="sol_pref_date" value="Data pretendida ou relevante (opcional)" />
                        <input
                            id="sol_pref_date"
                            type="date"
                            value={data.preferred_date}
                            onChange={(e) => setData('preferred_date', e.target.value)}
                            className="mt-1 block h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/20"
                        />
                        <InputError message={errors.preferred_date} className="mt-1" />
                    </div>
                    {pastorOptions.length > 0 && (
                        <div>
                            <InputLabel htmlFor="sol_pastor" value="Pastor (opcional)" />
                            <SelectInput
                                id="sol_pastor"
                                className="mt-1"
                                value={data.assigned_pastor_id}
                                onChange={(e) => {
                                    setData('assigned_pastor_id', e.target.value);
                                }}
                            >
                                <option value="">— Nenhum —</option>
                                {pastorOptions.map((o) => (
                                    <option key={o.value} value={String(o.value)}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.assigned_pastor_id} className="mt-1" />
                        </div>
                    )}
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
