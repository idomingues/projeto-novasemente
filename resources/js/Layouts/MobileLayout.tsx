import { PropsWithChildren, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import InboxNotificationPoller from '@/Components/InboxNotificationPoller';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';
import GuestAppBar from '@/Components/GuestAppBar';

type MobileLayoutProps = PropsWithChildren<{
    modalOverlayOpen?: boolean;
    /** Página full-bleed (ex.: chat): sem pt-6 extra, main sem scroll externo. */
    flush?: boolean;
}>;

export default function MobileLayout({
    children,
    modalOverlayOpen = false,
    flush = false,
}: MobileLayoutProps) {
    const { props, url } = usePage();
    const auth = (props as { auth?: { user?: { name: string }; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    if (isAuthenticated) {
        const mainPad = modalOverlayOpen
            ? 'overflow-hidden p-0'
            : flush
              ? 'overflow-hidden px-0 pb-0 pt-[calc(4rem+env(safe-area-inset-top,0px))] md:px-0 md:pb-0 md:pt-[calc(6rem+env(safe-area-inset-top,0px))]'
              : 'overflow-y-auto overflow-x-hidden px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-[calc(5rem+env(safe-area-inset-top,0px))] md:pt-[calc(6rem+env(safe-area-inset-top,0px))] sm:px-6 md:px-8';

        return (
            <div
                className={`ns-app-shell fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black ${
                    flush ? 'bg-[#efeae2] dark:bg-zinc-950' : 'bg-zinc-50 dark:bg-zinc-950'
                }`}
            >
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
                        className={`min-h-0 flex-1 overscroll-y-none overscroll-x-none md:[scrollbar-gutter:stable] ${mainPad} ${
                            flush ? 'bg-[#efeae2] dark:bg-zinc-950' : ''
                        }`}
                    >
                        <div
                            className={
                                flush || modalOverlayOpen
                                    ? 'mx-auto flex h-full min-h-0 w-full min-w-0 max-w-7xl flex-col xl:max-w-[90rem]'
                                    : 'mx-auto w-full min-w-0 max-w-7xl pt-6 pb-2 xl:max-w-[90rem]'
                            }
                        >
                            {children}
                        </div>
                    </main>

                    {!modalOverlayOpen ? <MobileBottomNav borderless={flush} /> : null}

                    <FlashMessages />
                    <InboxNotificationPoller />
                </div>
            </div>
        );
    }

    return (
        <div className="ns-app-shell fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            {!modalOverlayOpen ? <GuestAppBar /> : null}

            <main
                className={`min-h-0 flex-1 overscroll-y-none overscroll-x-none md:[scrollbar-gutter:stable] md:px-8 ${
                    modalOverlayOpen
                        ? 'overflow-hidden p-0'
                        : 'overflow-y-auto overflow-x-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1.5rem)] md:pt-[calc(4rem+env(safe-area-inset-top,0px)+1.5rem)] lg:pt-24'
                }`}
            >
                <div className={`max-w-7xl lg:max-w-[90rem] mx-auto w-full ${modalOverlayOpen ? 'min-h-0 h-full' : 'pb-2'}`}>
                    {children}
                </div>
            </main>

            {!modalOverlayOpen ? <MobileBottomNav /> : null}

            <FlashMessages />
        </div>
    );
}
