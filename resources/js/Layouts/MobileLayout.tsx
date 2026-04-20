import { PropsWithChildren, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import InboxNotificationPoller from '@/Components/InboxNotificationPoller';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';
import AppVersionTrigger from '@/Components/AppVersionTrigger';

export default function MobileLayout({ children }: PropsWithChildren) {
    const { props } = usePage();
    const currentChurch = (props as { currentChurch?: { name: string; logo_url?: string | null } | null }).currentChurch;
    const auth = (props as { auth?: { user?: { name: string } } }).auth;
    const isAuthenticated = !!auth?.user;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (isAuthenticated) {
        return (
            <div className="h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
                <Sidebar
                    mobileOpen={mobileMenuOpen}
                    onMobileClose={() => setMobileMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                />

                <div className="flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 md:pl-72">
                    <Topbar onMenuClick={() => setMobileMenuOpen(true)} hasSidebar />

                    <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-20 md:pt-24 px-4 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-24 [scrollbar-gutter:stable]">
                        <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full min-w-0 pt-6 pb-2">
                            {children}
                        </div>
                    </main>

                    <MobileBottomNav insetForSidebar />

                    <FlashMessages />
                    <InboxNotificationPoller />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <header
                className="fixed top-0 left-0 right-0 z-40 h-14 safe-area-top bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800"
                style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
            >
                <div className="relative flex items-center justify-center h-14 px-4">
                    <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 sm:left-4">
                        <AppVersionTrigger />
                    </div>
                    <Link href={route('mobile.news')} className="flex-shrink-0">
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
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1.5rem)] lg:pt-24 px-4 lg:px-8 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] [scrollbar-gutter:stable]"
            >
                <div className="max-w-7xl lg:max-w-[90rem] mx-auto w-full pb-2">
                    {children}
                </div>
            </main>

            <MobileBottomNav />

            <FlashMessages />
        </div>
    );
}
