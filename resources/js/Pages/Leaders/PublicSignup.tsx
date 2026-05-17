import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEventHandler, useCallback, useState } from 'react';

interface Ministry {
    id: number;
    name: string;
}

interface Props {
    token: string;
    churchName: string;
    ministries: Ministry[];
}

export default function PublicSignup({ token, churchName, ministries }: Props) {
    const form = useForm({
        token,
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        ministry_ids: [] as number[],
    });

    const [emailCheck, setEmailCheck] = useState<{ ok: boolean; message: string | null } | null>(null);

    const checkEmail = useCallback(async () => {
        const email = form.data.email.trim();
        if (!email || !email.includes('@')) {
            setEmailCheck(null);
            return;
        }
        try {
            const { data } = await axios.post(route('leaders.self-signup.check-email'), {
                token,
                email,
            });
            if (data.invalid_token) {
                setEmailCheck({ ok: false, message: 'Link inválido ou expirado.' });
                return;
            }
            if (data.email_taken) {
                setEmailCheck({ ok: false, message: data.message ?? 'E-mail já cadastrado.' });
                return;
            }
            setEmailCheck({ ok: true, message: null });
        } catch {
            setEmailCheck(null);
        }
    }, [form.data.email, token]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('leaders.self-signup.store'));
    };

    const toggleMinistry = (id: number) => {
        const set = new Set(form.data.ministry_ids);
        if (set.has(id)) {
            set.delete(id);
        } else {
            set.add(id);
        }
        form.setData('ministry_ids', Array.from(set));
    };

    return (
        <GuestLayout>
            <Head title={`Cadastro líder — ${churchName}`} />
            <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Cadastro de líder de ministério</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{churchName}</p>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <div>
                        <InputLabel htmlFor="leader_name" value="Nome completo" />
                        <TextInput
                            id="leader_name"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="mt-1 w-full"
                            required
                            autoComplete="name"
                        />
                        <InputError message={form.errors.name} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="leader_email" value="E-mail" />
                        <TextInput
                            id="leader_email"
                            type="email"
                            value={form.data.email}
                            onChange={(e) => {
                                form.setData('email', e.target.value);
                                setEmailCheck(null);
                            }}
                            onBlur={() => void checkEmail()}
                            className="mt-1 w-full"
                            required
                            autoComplete="email"
                        />
                        <InputError message={form.errors.email} className="mt-1" />
                        {emailCheck && !emailCheck.ok && emailCheck.message ? (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailCheck.message}</p>
                        ) : null}
                    </div>
                    <div>
                        <InputLabel htmlFor="leader_password" value="Senha" />
                        <TextInput
                            id="leader_password"
                            type="password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            className="mt-1 w-full"
                            required
                            autoComplete="new-password"
                        />
                        <InputError message={form.errors.password} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="leader_password_confirmation" value="Confirmar senha" />
                        <TextInput
                            id="leader_password_confirmation"
                            type="password"
                            value={form.data.password_confirmation}
                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                            className="mt-1 w-full"
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <div>
                        <InputLabel value="Departamentos que irá gerir" />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Selecione pelo menos um.</p>
                        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                            {ministries.length === 0 ? (
                                <p className="text-sm text-zinc-500">Nenhum departamento disponível. Entre em contato a secretaria.</p>
                            ) : (
                                ministries.map((m) => (
                                    <label key={m.id} className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.data.ministry_ids.includes(m.id)}
                                            onChange={() => toggleMinistry(m.id)}
                                            className="rounded border-zinc-300 dark:border-zinc-600"
                                        />
                                        <span className="text-sm text-zinc-900 dark:text-white">{m.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <InputError message={form.errors.ministry_ids} className="mt-1" />
                    </div>
                    <PrimaryButton type="submit" disabled={form.processing} className="w-full">
                        Criar conta
                    </PrimaryButton>
                </form>

                <p className="text-center text-sm text-zinc-500">
                    <Link href={route('login')} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                        Já tenho conta — entrar
                    </Link>
                </p>
            </div>
        </GuestLayout>
    );
}
