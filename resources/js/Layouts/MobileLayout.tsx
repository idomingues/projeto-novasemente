import { PropsWithChildren, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import InboxNotificationPoller from '@/Components/InboxNotificationPoller';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';
import GuestAppBar from '@/Components/GuestAppBar';

export default function MobileLayout({ children }: PropsWithChildren) {
    const { props } = usePage();
    const auth = (props as { auth?: { user?: { name: string }; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (isAuthenticated) {
        return (
            <div className="h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
                <Sidebar
                    mobileOpen={mobileMenuOpen}
                    onMobileClose={() => setMobileMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                />

                <div
                    className={`flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 ${
                        canAccessAdminMenu ? 'md:pl-72' : ''
                    }`}
                >
                    <Topbar
                        onMenuClick={canAccessAdminMenu ? () => setMobileMenuOpen(true) : undefined}
                        hasSidebar={canAccessAdminMenu}
                    />

                    <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-20 md:pt-24 px-4 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-24 [scrollbar-gutter:stable]">
                        <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full min-w-0 pt-6 pb-2">
                            {children}
                        </div>
                    </main>

                    <MobileBottomNav insetForSidebar={canAccessAdminMenu} />

                    <FlashMessages />
                    <InboxNotificationPoller />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <GuestAppBar />

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
