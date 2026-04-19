import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface Props {
    registerUrl: string;
    redirectAfterLogin: string;
}

export default function BaptismGuest({ registerUrl, redirectAfterLogin }: Props) {
    const loginHref = `${route('login')}?redirect=${encodeURIComponent(redirectAfterLogin)}`;

    return (
        <MobileLayout>
            <Head title="Pedido de batismo" />
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-white">
                        <SparklesIcon className="size-6 text-white dark:text-zinc-900" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Pedido de batismo</h1>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Para enviar uma solicitação de batismo é necessário ter uma conta no app: faça o seu cadastro
                            (ou entre se já tiver acesso). Depois poderá preencher o pedido e acompanhar a conversa com a
                            igreja.
                        </p>
                    </div>
                </div>

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
            </div>
        </MobileLayout>
    );
}
