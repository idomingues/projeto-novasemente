import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { InboxIcon } from '@heroicons/react/24/outline';

interface Props {
    registerUrl: string;
    redirectAfterLogin: string;
    continueUrl: string;
}

export default function SolicitationGuestGate({ registerUrl, redirectAfterLogin, continueUrl }: Props) {
    const loginHref = `${route('login')}?redirect=${encodeURIComponent(redirectAfterLogin)}`;

    return (
        <MobileLayout>
            <Head title="Solicitações" />
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-white">
                        <InboxIcon className="size-6 text-white dark:text-zinc-900" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Solicitações</h1>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Para enviar uma solicitação (batismo, visita pastoral, apresentação e outros) e acompanhar a conversa com a igreja,
                            você precisa estar <span className="font-semibold">logado(a)</span>.
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Se ainda não tem acesso, o cadastro é rápido.
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-3">
                    <Link
                        href={registerUrl}
                        className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                        Fazer cadastro
                    </Link>
                    <Link
                        href={loginHref}
                        className="flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
                    >
                        Entrar
                    </Link>
                    <Link
                        href={continueUrl}
                        className="flex w-full items-center justify-center rounded-xl bg-zinc-100 px-5 py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                        Continuar explorando
                    </Link>
                </div>
            </div>
        </MobileLayout>
    );
}

