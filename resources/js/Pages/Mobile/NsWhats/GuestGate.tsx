import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface Props {
    registerUrl: string;
    redirectAfterLogin: string;
    continueUrl: string;
}

export default function NsWhatsGuestGate({ registerUrl, redirectAfterLogin, continueUrl }: Props) {
    const loginHref = `${route('login')}?redirect=${encodeURIComponent(redirectAfterLogin)}`;

    return (
        <MobileLayout>
            <Head title="NS Whats" />
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 dark:bg-white">
                        <ChatBubbleLeftRightIcon className="size-6 text-white dark:text-zinc-900" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            NS Whats
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Canal de mensagens da igreja para falar com departamentos, líderes e membros — direto pelo app,
                            no estilo de uma conversa.
                        </p>
                    </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">O que você pode fazer</h2>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        <li>Enviar mensagem para a fila de um departamento ou para uma pessoa específica</li>
                        <li>Acompanhar a conversa e as respostas da equipe</li>
                        <li>Finalizar ou reabrir quando o assunto estiver resolvido</li>
                    </ul>
                    <p className="pt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Para usar o NS Whats é preciso estar{' '}
                        <span className="font-semibold text-zinc-900 dark:text-white">logado(a)</span>. Assim suas
                        conversas ficam salvas na sua conta.
                    </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <Link
                        href={registerUrl}
                        className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                        Fazer cadastro
                    </Link>
                    <Link
                        href={loginHref}
                        className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
                    >
                        Entrar
                    </Link>
                    <Link
                        href={continueUrl}
                        className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-zinc-100 px-5 py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                        Continuar explorando
                    </Link>
                </div>
            </div>
        </MobileLayout>
    );
}
