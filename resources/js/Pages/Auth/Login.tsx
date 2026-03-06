import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ApplicationLogo from '@/Components/ApplicationLogo';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect } from 'react';

interface ChurchOption {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
}

export default function Login({
    status,
    canResetPassword,
    loginStep = 1,
    loginEmail = '',
    loginIsSuperAdmin = false,
    loginChurches = [],
}: {
    status?: string;
    canResetPassword: boolean;
    loginStep?: number;
    loginEmail?: string;
    loginIsSuperAdmin?: boolean;
    loginChurches?: ChurchOption[];
}) {
    const [step, setStep] = useState(loginStep);
    const [isSuperAdmin, setIsSuperAdmin] = useState(loginIsSuperAdmin);
    const [churches, setChurches] = useState<ChurchOption[]>(loginChurches);
    const [checkEmailError, setCheckEmailError] = useState('');
    const [checkingEmail, setCheckingEmail] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: loginEmail,
        password: '',
        remember: false as boolean,
        church_id: null as number | null,
    });

    useEffect(() => {
        setData('email', loginEmail);
    }, [loginEmail]);

    useEffect(() => {
        if (loginChurches.length > 0 && data.church_id == null) {
            setData('church_id', loginChurches[0].id);
        }
    }, [loginChurches]);

    const handleStep1: FormEventHandler = (e) => {
        e.preventDefault();
        setCheckEmailError('');
        if (!data.email.trim()) return;
        setCheckingEmail(true);
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
            || (typeof window !== 'undefined' && (window as unknown as { Laravel?: { csrfToken?: string } }).Laravel?.csrfToken);
        fetch(route('login.check-email'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            },
            body: JSON.stringify({ email: data.email.trim() }),
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((body) => {
                if (body.exists) {
                    setIsSuperAdmin(!!body.is_super_admin);
                    setChurches(body.churches || []);
                    if (body.churches?.length) {
                        setData('church_id', body.churches[0].id);
                    }
                    setStep(2);
                } else {
                    setCheckEmailError('Email não encontrado.');
                }
            })
            .catch(() => setCheckEmailError('Erro ao verificar. Tente novamente.'))
            .finally(() => setCheckingEmail(false));
    };

    const submitLogin: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const backToStep1 = () => {
        setStep(1);
        setCheckEmailError('');
    };

    return (
        <GuestLayout>
            <Head title="Entrar" />

            <div className="w-full flex flex-col lg:flex-row">
                <div className="w-full lg:w-1/2 flex flex-col justify-between px-8 py-10 lg:px-16 bg-zinc-900 text-zinc-100">
                    <div className="max-w-md">
                        <ApplicationLogo className="h-10 w-10 fill-current text-zinc-100" />
                        <p className="mt-8 text-[11px] font-semibold tracking-[0.22em] uppercase text-zinc-400">
                            Painel administrativo
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                            Sistema de gestão da igreja
                        </h1>
                        <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                            Acompanhe membros, voluntários, cultos, salas e finanças em um só lugar.
                        </p>
                    </div>
                    <div className="mt-8 space-y-3 text-sm text-zinc-200">
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-1 w-6 rounded-full bg-zinc-100" />
                            <span>Resumo rápido da membresia, visitantes e frequência.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-1 w-6 rounded-full bg-zinc-100" />
                            <span>Escala organizada de voluntários e ministérios da igreja.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-1 w-6 rounded-full bg-zinc-100" />
                            <span>Gestão de membros, voluntários e escalas em um só lugar.</span>
                        </div>
                    </div>
                    <p className="mt-10 text-xs text-zinc-500">
                        © {new Date().getFullYear()} Sistema Igreja. Todos os direitos reservados.
                    </p>
                </div>

                <div className="w-full lg:w-1/2 bg-white dark:bg-zinc-900 flex items-center justify-center px-6 py-10 lg:px-16">
                    <div className="w-full max-w-md">
                        {status && (
                            <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                                {status}
                            </div>
                        )}

                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                            {step === 1 ? 'Bem-vindo de volta' : 'Conclua o acesso'}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            {step === 1
                                ? 'Informe seu e-mail para continuar.'
                                : isSuperAdmin
                                ? 'Super Admin: escolha a igreja em que irá trabalhar e digite sua senha.'
                                : 'Digite sua senha para entrar.'}
                        </p>

                        {step === 1 ? (
                            <form onSubmit={handleStep1} className="mt-6 space-y-5">
                                <div>
                                    <InputLabel htmlFor="email" value="Email" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className="mt-1 block w-full"
                                        autoComplete="username"
                                        isFocused={true}
                                        onChange={(e) => setData('email', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.email || checkEmailError} className="mt-2" />
                                </div>
                                <div className="pt-2">
                                    <PrimaryButton type="submit" className="w-full justify-center" disabled={checkingEmail}>
                                        {checkingEmail ? 'Verificando...' : 'Continuar'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={submitLogin} className="mt-6 space-y-5">
                                <div>
                                    <InputLabel value="Email" />
                                    <div className="mt-1 flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                        {data.email}
                                        <button type="button" onClick={backToStep1} className="text-primary-600 dark:text-primary-400 hover:underline text-xs">
                                            Alterar
                                        </button>
                                    </div>
                                </div>

                                {isSuperAdmin && churches.length > 0 && (
                                    <div>
                                        <InputLabel htmlFor="church_id" value="Igreja em que irá trabalhar" />
                                        <select
                                            id="church_id"
                                            name="church_id"
                                            value={data.church_id ?? ''}
                                            onChange={(e) => setData('church_id', e.target.value === '' ? null : Number(e.target.value))}
                                            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            required={isSuperAdmin}
                                        >
                                            <option value="">Selecione a igreja</option>
                                            {churches.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Os dados exibidos no painel serão desta igreja. O cadastro de igrejas permanece disponível no menu.
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <InputLabel htmlFor="password" value="Senha" />
                                    <TextInput
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        className="mt-1 block w-full"
                                        autoComplete="current-password"
                                        isFocused={step === 2}
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <InputError message={errors.password} className="mt-2" />
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2">
                                        <Checkbox
                                            name="remember"
                                            checked={data.remember}
                                            onChange={(e) => setData('remember', (e.target.checked || false) as false)}
                                        />
                                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                            Manter conectado
                                        </span>
                                    </label>
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-4 hover:underline"
                                        >
                                            Esqueceu a senha?
                                        </Link>
                                    )}
                                </div>

                                <div className="pt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={backToStep1}
                                        className="flex-1 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    >
                                        Voltar
                                    </button>
                                    <PrimaryButton type="submit" className="flex-1 justify-center" disabled={processing}>
                                        Entrar
                                    </PrimaryButton>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
