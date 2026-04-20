import { Link, usePage } from '@inertiajs/react';
import AppVersionTrigger from '@/Components/AppVersionTrigger';

/**
 * Barra superior padrão para visitantes (mesma do {@link MobileLayout} sem sessão).
 * Usada no cadastro público e noutras páginas guest fora do fluxo «painel login».
 */
export default function GuestAppBar() {
    const { currentChurch, defaultBrandLogoUrl } = usePage().props as {
        currentChurch?: { name: string; logo_url?: string | null } | null;
        defaultBrandLogoUrl?: string;
    };

    return (
        <header
            className="fixed top-0 left-0 right-0 z-40 h-14 safe-area-top bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800"
            style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
        >
            <div className="relative flex h-14 items-center justify-center px-4">
                <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 sm:left-4">
                    <AppVersionTrigger />
                </div>
                <Link href={route('mobile.news')} className="flex-shrink-0">
                    <img
                        src={currentChurch?.logo_url ?? defaultBrandLogoUrl ?? '/logo-ns.png'}
                        alt={currentChurch?.name ?? 'Nova Semente'}
                        className="h-9 w-9 rounded-full object-cover object-center dark:invert"
                    />
                </Link>
                <Link
                    href={route('login')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Entrar"
                >
                    Login
                </Link>
            </div>
        </header>
    );
}
