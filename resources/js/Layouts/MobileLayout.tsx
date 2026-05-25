import { PropsWithChildren, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import InboxNotificationPoller from '@/Components/InboxNotificationPoller';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';
import GuestAppBar from '@/Components/GuestAppBar';

export default function MobileLayout({
    children,
    modalOverlayOpen = false,
}: PropsWithChildren<{ modalOverlayOpen?: boolean }>) {
    const { props, url } = usePage();
    const auth = (props as { auth?: { user?: { name: string }; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    if (isAuthenticated) {
        return (
            <div className="h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
                {canAccessAdminMenu && !modalOverlayOpen ? (
                    <Sidebar
                        mobileOpen={menuOpen}
                        onMobileClose={() => setMenuOpen(false)}
                        routeToPermissions={adminSidebarRoutePermissions}
                    />
                ) : null}

                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    {!modalOverlayOpen ? (
                        <Topbar onMenuClick={canAccessAdminMenu ? () => setMenuOpen(true) : undefined} />
                    ) : null}

                    <main
                        className={`min-h-0 flex-1 overscroll-y-contain [scrollbar-gutter:stable] sm:px-6 md:px-8 ${
                            modalOverlayOpen
                                ? 'overflow-hidden p-0'
                                : 'overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-[calc(5rem+env(safe-area-inset-top,0px))] md:pt-[calc(6rem+env(safe-area-inset-top,0px))]'
                        }`}
                    >
                        <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full min-w-0 pt-6 pb-2">
                            {children}
                        </div>
                    </main>

                    {!modalOverlayOpen ? <MobileBottomNav /> : null}

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
