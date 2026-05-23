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
}: PropsWithChildren<{ wideLayout?: boolean; modalOverlayOpen?: boolean }>) {
    const { props, url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);
    const auth = (props as { auth?: { user?: unknown; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            {isAuthenticated && canAccessAdminMenu && !modalOverlayOpen && (
                <Sidebar
                    mobileOpen={menuOpen}
                    onMobileClose={() => setMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                />
            )}

            <div className="flex h-[100dvh] flex-col overflow-hidden">
                {!modalOverlayOpen ? (
                    <Topbar onMenuClick={canAccessAdminMenu ? () => setMenuOpen(true) : undefined} />
                ) : null}

                <main
                    className={`min-h-0 flex-1 overscroll-y-contain [scrollbar-gutter:stable] ${
                        modalOverlayOpen
                            ? 'overflow-hidden p-0'
                            : 'overflow-y-auto pt-20 md:pt-24 px-4 sm:px-6 md:px-8 pb-24'
                    }`}
                >
                    <div
                        className={`mx-auto w-full min-w-0 ${modalOverlayOpen ? '' : 'pt-6'} ${wideLayout ? 'max-w-none' : 'max-w-7xl xl:max-w-[90rem]'}`}
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
