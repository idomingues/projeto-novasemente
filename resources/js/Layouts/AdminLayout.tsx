import { PropsWithChildren, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import InboxNotificationPoller from '@/Components/InboxNotificationPoller';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';

export default function AdminLayout({
    children,
    wideLayout = false,
    /** Oculta sidebar, topbar e barra inferior enquanto um modal em tela cheia está aberto. */
    modalOverlayOpen = false,
    /** Conteúdo em altura fixa com scroll interno (ex.: central de voluntários). */
    compactChrome = false,
}: PropsWithChildren<{
    wideLayout?: boolean;
    modalOverlayOpen?: boolean;
    compactChrome?: boolean;
}>) {
    const { props, url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);
    const auth = (props as { auth?: { user?: unknown; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const showAdminSidebar = isAuthenticated && canAccessAdminMenu && !modalOverlayOpen;

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    const mainClassName = modalOverlayOpen
        ? 'overflow-hidden p-0'
        : compactChrome
          ? 'overflow-hidden pt-[calc(4rem+env(safe-area-inset-top,0px))] px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pt-24 md:px-4 md:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]'
          : 'overflow-y-auto pt-[calc(4rem+env(safe-area-inset-top,0px))] px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 md:pt-24 md:px-6 md:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:px-8';

    const innerClassName = modalOverlayOpen ? '' : compactChrome ? 'pt-0 md:pt-0' : 'pt-6';

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            {showAdminSidebar ? (
                <Sidebar
                    mobileOpen={menuOpen}
                    onMobileClose={() => setMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                />
            ) : null}

            <div className="flex h-[100dvh] flex-col overflow-hidden">
                {!modalOverlayOpen ? (
                    <Topbar onMenuClick={showAdminSidebar ? () => setMenuOpen(true) : undefined} />
                ) : null}

                <main className={`min-h-0 flex-1 overscroll-y-contain [scrollbar-gutter:stable] ${mainClassName}`}>
                    <div
                        className={`mx-auto w-full min-w-0 ${innerClassName} ${wideLayout ? 'max-w-none' : 'max-w-7xl xl:max-w-[90rem]'}`}
                    >
                        {children}
                    </div>
                </main>

                {!modalOverlayOpen ? <MobileBottomNav /> : null}

                <FlashMessages />
                {isAuthenticated && <InboxNotificationPoller />}
            </div>
        </div>
    );
}
