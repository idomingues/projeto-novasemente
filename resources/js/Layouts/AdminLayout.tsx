import { PropsWithChildren, useState } from 'react';
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
}: PropsWithChildren<{ wideLayout?: boolean }>) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const auth = (usePage().props as { auth?: { user?: unknown; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            {isAuthenticated && canAccessAdminMenu && (
                <Sidebar
                    mobileOpen={mobileMenuOpen}
                    onMobileClose={() => setMobileMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                />
            )}

            <div
                className={`flex h-[100dvh] flex-col overflow-hidden transition-all duration-300 ${
                    isAuthenticated && canAccessAdminMenu ? 'md:pl-72' : ''
                }`}
            >
                <Topbar
                    onMenuClick={canAccessAdminMenu ? () => setMobileMenuOpen(true) : undefined}
                    hasSidebar={isAuthenticated && canAccessAdminMenu}
                />

                <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-20 md:pt-24 px-4 sm:px-6 md:px-8 pb-24 [scrollbar-gutter:stable]">
                    <div
                        className={`mx-auto w-full min-w-0 pt-6 ${wideLayout ? 'max-w-none' : 'max-w-7xl xl:max-w-[90rem]'}`}
                    >
                        {children}
                    </div>
                </main>

                {/* Barra inferior: igual em mobile e desktop; com sidebar, alinhada à coluna de conteúdo (md:left-72). */}
                <MobileBottomNav insetForSidebar={isAuthenticated && canAccessAdminMenu} />

                <FlashMessages />
                {isAuthenticated && <InboxNotificationPoller />}
            </div>
        </div>
    );
}
