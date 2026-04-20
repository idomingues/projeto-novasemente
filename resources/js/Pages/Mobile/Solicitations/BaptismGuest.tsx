import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { BookOpenIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Props {
    registerUrl: string;
    redirectAfterLogin: string;
    redirectAfterLoginStudy: string;
}

export default function BaptismGuest({ registerUrl, redirectAfterLogin, redirectAfterLoginStudy }: Props) {
    const loginHref = `${route('login')}?redirect=${encodeURIComponent(redirectAfterLogin)}`;
    const loginStudyHref = `${route('login')}?redirect=${encodeURIComponent(redirectAfterLoginStudy)}`;
    const [hasBibleStudy, setHasBibleStudy] = useState<'yes' | 'no' | null>(null);

    return (
        <MobileLayout>
            <Head title="Pedido de batismo" />
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-white">
                        <SparklesIcon className="size-6 text-white dark:text-zinc-900" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Pedido de batismo</h1>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Queremos caminhar com você com carinho e clareza. Para <span className="font-semibold">pedir batismo</span>,
                            é preciso ter uma conta no app para acompanhar a conversa com a igreja.
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Você já fez estudo bíblico (ou está estudando)?
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Se ainda não, você pode pedir um estudo bíblico. Se já fez, podemos seguir para o pedido de batismo.
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setHasBibleStudy('yes')}
                            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                hasBibleStudy === 'yes'
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                                    : 'border-zinc-200 bg-zinc-50 text-zinc-900 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900'
                            }`}
                        >
                            <div className="font-semibold">Sim</div>
                            <div className={`mt-0.5 text-xs ${hasBibleStudy === 'yes' ? 'text-white/80 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                Quero solicitar o batismo
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setHasBibleStudy('no')}
                            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                hasBibleStudy === 'no'
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                                    : 'border-zinc-200 bg-zinc-50 text-zinc-900 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900'
                            }`}
                        >
                            <div className="font-semibold">Ainda não</div>
                            <div className={`mt-0.5 text-xs ${hasBibleStudy === 'no' ? 'text-white/80 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                Quero pedir estudo bíblico
                            </div>
                        </button>
                    </div>
                </div>

                {hasBibleStudy === 'no' && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-white">
                                <BookOpenIcon className="size-6 text-white dark:text-zinc-900" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-zinc-900 dark:text-white">Pedido de estudo bíblico</p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    Podemos colocar você em contacto com alguém da igreja para estudar a Bíblia. Para isso, faça o cadastro (ou entre).
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                            <Link
                                href={registerUrl}
                                className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                Fazer cadastro
                            </Link>
                            <Link
                                href={loginStudyHref}
                                className="flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
                            >
                                Entrar para pedir estudo
                            </Link>
                        </div>
                    </div>
                )}

                {hasBibleStudy !== 'no' && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                        <Link
                            href={registerUrl}
                            className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                            Fazer cadastro
                        </Link>
                        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            Já tem conta?{' '}
                            <Link href={loginHref} className="font-semibold text-primary-600 underline dark:text-primary-400">
                                Entrar
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
