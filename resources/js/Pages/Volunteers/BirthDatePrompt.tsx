import MobileLayout from '@/Layouts/MobileLayout';
import BrDateInput from '@/Components/BrDateInput';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, Link, useForm } from '@inertiajs/react';
import { CakeIcon } from '@heroicons/react/24/outline';
import { FormEventHandler } from 'react';

interface Props {
    cancelHref: string;
    birthDate: string;
    maxBirthDate: string;
}

export default function BirthDatePrompt({ cancelHref, birthDate, maxBirthDate }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        birth_date: birthDate || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('volunteers.self-signup.birth-date.update'), { preserveScroll: true });
    };

    return (
        <MobileLayout>
            <Head title="Data de nascimento" />

            <div className="mx-auto w-full max-w-lg space-y-5 pb-8">
                <div>
                    <Link
                        href={cancelHref}
                        className="inline-flex cursor-pointer text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
                    >
                        ← Voltar
                    </Link>
                </div>

                <section className="rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-sm dark:border-rose-900/50 dark:from-rose-950 dark:via-zinc-900 dark:to-amber-950/40">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-rose-100 dark:bg-zinc-900/70 dark:ring-rose-900/50">
                            <CakeIcon className="h-6 w-6 text-rose-600 dark:text-rose-300" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                Data de nascimento
                            </h1>
                            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                Só falta informar sua data de nascimento para concluir este passo. Leva poucos segundos.
                            </p>
                        </div>
                    </div>
                </section>

                <form
                    onSubmit={submit}
                    className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div>
                        <InputLabel htmlFor="birth_date" value="Data de nascimento" />
                        <BrDateInput
                            id="birth_date"
                            value={data.birth_date}
                            max={maxBirthDate}
                            onChange={(iso) => setData('birth_date', iso)}
                            className="mt-1 block w-full"
                            isFocused
                        />
                        <InputError message={errors.birth_date} className="mt-1" />
                    </div>

                    <PrimaryButton type="submit" className="w-full justify-center" disabled={processing}>
                        Salvar data
                    </PrimaryButton>
                </form>
            </div>
        </MobileLayout>
    );
}
