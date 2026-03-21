import { Link, usePage } from '@inertiajs/react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export default function ScheduleLoginGate() {
    const page = usePage();
    const loginHref = `${route('login')}?redirect=${encodeURIComponent(page.url)}`;

    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <LockClosedIcon className="h-7 w-7 text-zinc-500 dark:text-zinc-400" aria-hidden />
            </div>
            <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                A escala de voluntários está disponível apenas para usuários cadastrados. Faça login para consultar.
            </p>
            <Link
                href={loginHref}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
                Entrar
            </Link>
        </div>
    );
}
