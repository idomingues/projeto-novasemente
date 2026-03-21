import { PropsWithChildren, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';

export default function MobileLayout({ children }: PropsWithChildren) {
    const { props } = usePage();
    const currentChurch = (props as { currentChurch?: { name: string; logo_url?: string | null } | null }).currentChurch;
    const auth = (props as { auth?: { user?: { name: string } } }).auth;
    const isAuthenticated = !!auth?.user;
    const appVersion = (props as { appVersion?: string | null }).appVersion ?? null;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (isAuthenticated) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
                <Sidebar
                    mobileOpen={mobileMenuOpen}
                    onMobileClose={() => setMobileMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                />

                <div className="flex flex-col min-h-screen transition-all duration-300 md:pl-72">
                    <Topbar onMenuClick={() => setMobileMenuOpen(true)} hasSidebar />

                    <main className="flex-1 pt-20 md:pt-24 px-4 sm:px-6 md:px-8 pb-24">
                        <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full min-w-0 pt-6">
                            {children}
                        </div>
                    </main>

                    {appVersion ? (
                        <div className="fixed bottom-16 left-0 right-0 z-20 flex justify-center pointer-events-none text-[10px] text-zinc-500 dark:text-zinc-400">
                            v{appVersion}
                        </div>
                    ) : null}

                    <MobileBottomNav insetForSidebar />

                    <FlashMessages />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <header
                className="fixed top-0 left-0 right-0 z-40 h-14 safe-area-top bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800"
                style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
            >
                <div className="relative flex items-center justify-center h-14 px-4">
                    <Link href={route('mobile.index')} className="flex-shrink-0">
                        <img
                            src={currentChurch?.logo_url ?? '/logo-ns.png'}
                            alt={currentChurch?.name ?? 'Nova Semente'}
                            className="h-9 w-9 rounded-full object-cover object-center dark:invert"
                        />
                    </Link>
                    <Link
                        href={route('login')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label="Entrar"
                    >
                        Login
                    </Link>
                </div>
            </header>

            <main
                className="pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1.5rem)] lg:pt-24 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] min-h-screen px-4 lg:px-8 pb-4"
            >
                <div className="max-w-7xl lg:max-w-[90rem] mx-auto w-full">
                    {children}
                </div>
            </main>

            {appVersion ? (
                <div className="fixed bottom-16 left-0 right-0 z-20 flex justify-center pointer-events-none text-[10px] text-zinc-500 dark:text-zinc-400">
                    v{appVersion}
                </div>
            ) : null}

            <MobileBottomNav />

            <FlashMessages />
        </div>
    );
}
