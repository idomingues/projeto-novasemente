import FlashMessages from '@/Components/FlashMessages';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Textarea from '@/Components/Textarea';
import MobileLayout from '@/Layouts/MobileLayout';
import SortedMultiCheckboxList from '@/Components/SortedMultiCheckboxList';
import { Head, Link, useForm } from '@inertiajs/react';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { FormEventHandler } from 'react';

type Ministry = { id: number; name: string };

type Props = {
    token: string;
    churchName: string;
    ministries: Ministry[];
    attachedMinistryNames: string[];
    storeUrl: string;
    backUrl: string;
};

export default function SignupRequestDepartment({
    token,
    churchName,
    ministries,
    attachedMinistryNames,
    storeUrl,
    backUrl,
}: Props) {
    const form = useForm({
        token,
        ministry_ids: [] as number[],
        reason: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(storeUrl);
    };

    return (
        <MobileLayout>
            <Head title={`Pedir departamento — ${churchName}`} />
            <FlashMessages />

            <div className="mx-auto w-full max-w-md space-y-5 px-1 sm:px-0">
                <header>
                    <Link
                        href={backUrl}
                        className="mb-4 inline-flex cursor-pointer text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                    >
                        Voltar
                    </Link>
                    <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 shadow-sm dark:bg-teal-500">
                            <BuildingOffice2Icon className="size-6 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                Pedir novo departamento
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{churchName}</p>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                Escolha o departamento e explique o motivo. O pedido aparece nas anotações da equipe e
                                seu status volta para Interessado.
                            </p>
                        </div>
                    </div>
                </header>

                {attachedMinistryNames.length > 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
                        <p className="font-semibold text-zinc-900 dark:text-white">Você já participa de:</p>
                        <p className="mt-1">{attachedMinistryNames.join(', ')}</p>
                    </div>
                ) : null}

                {ministries.length === 0 ? (
                    <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
                        Não há outros departamentos disponíveis para pedir agora. Fale com a secretaria se precisar de
                        ajuda.
                        <div className="mt-4">
                            <Link href={backUrl}>
                                <SecondaryButton type="button" className="w-full justify-center">
                                    Voltar às opções
                                </SecondaryButton>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form
                        onSubmit={submit}
                        className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
                    >
                        <div>
                            <InputLabel value="Departamento(s) desejado(s)" />
                            <div className="mt-2">
                                <SortedMultiCheckboxList
                                    options={ministries}
                                    selectedIds={form.data.ministry_ids}
                                    onChange={(ids) => form.setData('ministry_ids', ids)}
                                    emptyMessage="Nenhum departamento disponível."
                                />
                            </div>
                            <InputError className="mt-2" message={form.errors.ministry_ids} />
                        </div>

                        <div>
                            <InputLabel htmlFor="request-dept-reason" value="Motivo" />
                            <Textarea
                                id="request-dept-reason"
                                className="mt-1.5 w-full"
                                rows={5}
                                value={form.data.reason}
                                placeholder="Por que você quer servir neste departamento?"
                                onChange={(e) => form.setData('reason', e.target.value)}
                            />
                            <InputError className="mt-2" message={form.errors.reason} />
                        </div>

                        <PrimaryButton type="submit" className="w-full justify-center" disabled={form.processing}>
                            Enviar pedido
                        </PrimaryButton>
                    </form>
                )}
            </div>
        </MobileLayout>
    );
}
