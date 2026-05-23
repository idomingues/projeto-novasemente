import { PropsWithChildren, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import InboxNotificationPoller from '@/Components/InboxNotificationPoller';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';
import { useAdminSidebarCollapsed } from '@/hooks/useAdminSidebarCollapsed';

export default function AdminLayout({
    children,
    wideLayout = false,
    /** Oculta sidebar, topbar e barra inferior enquanto um modal em tela cheia está aberto. */
    modalOverlayOpen = false,
}: PropsWithChildren<{ wideLayout?: boolean; modalOverlayOpen?: boolean }>) {
    const { props, url } = usePage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { collapsed: desktopSidebarCollapsed, collapse: collapseDesktopSidebar, expand: expandDesktopSidebar } =
        useAdminSidebarCollapsed();
    const auth = (props as { auth?: { user?: unknown; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const sidebarInset = isAuthenticated && canAccessAdminMenu && !desktopSidebarCollapsed;

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [url]);

    const openSidebar = () => {
        if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
            expandDesktopSidebar();
            return;
        }
        setMobileMenuOpen(true);
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            {isAuthenticated && canAccessAdminMenu && !modalOverlayOpen && (
                <Sidebar
                    mobileOpen={mobileMenuOpen}
                    onMobileClose={() => setMobileMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                    desktopCollapsed={desktopSidebarCollapsed}
                    onDesktopCollapse={collapseDesktopSidebar}
                />
            )}

            <div
                className={`flex h-[100dvh] flex-col overflow-hidden transition-all duration-300 ${
                    sidebarInset && !modalOverlayOpen ? 'md:pl-72' : ''
                }`}
            >
                {!modalOverlayOpen ? (
                    <Topbar
                        onMenuClick={canAccessAdminMenu ? openSidebar : undefined}
                        hasSidebar={sidebarInset}
                        desktopSidebarCollapsed={desktopSidebarCollapsed}
                    />
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

                {!modalOverlayOpen ? <MobileBottomNav insetForSidebar={sidebarInset} /> : null}

                <FlashMessages />
                {isAuthenticated && <InboxNotificationPoller />}
            </div>
        </div>
    );
}
