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
    /**
     * Esconde a Topbar global — útil no NS Conecta, que já tem header próprio.
     * Em `flush`, o padrão é ocultar (evita dois headers empilhados).
     */
    hideTopbar?: boolean;
    /** Esconde a bottom nav (ex.: chat imersivo do NS Conecta). */
    hideBottomNav?: boolean;
}>;

export default function MobileLayout({
    children,
    modalOverlayOpen = false,
    flush = false,
    hideTopbar,
    hideBottomNav,
}: MobileLayoutProps) {
    const { props, url, component } = usePage();
    const auth = (props as { auth?: { user?: { name: string }; canAccessAdminMenu?: boolean } }).auth;
    const isAuthenticated = !!auth?.user;
    const canAccessAdminMenu = auth?.canAccessAdminMenu === true;
    const [menuOpen, setMenuOpen] = useState(false);
    // NS Conecta: única área do app em modo imersivo (sem Topbar nem bottom nav).
    const isNsConecta = typeof component === 'string' && component.startsWith('Mobile/NsWhats/');
    const topbarHidden = modalOverlayOpen || isNsConecta || (hideTopbar ?? flush);
    const bottomNavHidden = modalOverlayOpen || isNsConecta || hideBottomNav === true;

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    if (isAuthenticated) {
        const immersive = topbarHidden && (flush || isNsConecta);
        const mainPad = modalOverlayOpen
            ? 'overflow-hidden p-0'
            : immersive
              ? 'overflow-hidden px-0 pb-0 pt-[env(safe-area-inset-top,0px)] md:px-0 md:pb-0'
              : flush
                ? 'overflow-hidden px-0 pb-0 pt-[calc(4rem+var(--ns-get-app-banner-h,0px)+env(safe-area-inset-top,0px))] md:px-0 md:pb-0 md:pt-[calc(6rem+env(safe-area-inset-top,0px))]'
                : 'overflow-y-auto overflow-x-clip px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-[calc(5rem+var(--ns-get-app-banner-h,0px)+env(safe-area-inset-top,0px))] md:pt-[calc(6rem+env(safe-area-inset-top,0px))] sm:px-6 md:px-8';

        return (
            <div
                className={`ns-app-shell fixed inset-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden overflow-x-clip overscroll-none text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black ${
                    immersive ? 'z-50 bg-white dark:bg-zinc-950' : flush ? 'z-0 bg-[#efeae2] dark:bg-zinc-950' : 'z-0 bg-zinc-50 dark:bg-zinc-950'
                }`}
            >
                {canAccessAdminMenu && !topbarHidden ? (
                    <Sidebar
                        mobileOpen={menuOpen}
                        onMobileClose={() => setMenuOpen(false)}
                        routeToPermissions={adminSidebarRoutePermissions}
                    />
                ) : null}

                <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden">
                    {!topbarHidden ? (
                        <Topbar onMenuClick={canAccessAdminMenu ? () => setMenuOpen(true) : undefined} />
                    ) : null}

                    <main
                        className={`min-h-0 flex-1 overflow-x-clip overscroll-none touch-pan-y md:[scrollbar-gutter:stable] ${mainPad} ${
                            flush || isNsConecta ? 'bg-[#efeae2] dark:bg-zinc-950' : ''
                        }`}
                    >
                        <div
                            className={
                                flush || immersive || modalOverlayOpen
                                    ? 'mx-auto flex h-full min-h-0 w-full min-w-0 max-w-7xl flex-col xl:max-w-[90rem]'
                                    : 'mx-auto w-full min-w-0 max-w-7xl pt-6 pb-2 xl:max-w-[90rem]'
                            }
                        >
                            {children}
                        </div>
                    </main>

                    {!bottomNavHidden ? <MobileBottomNav borderless={flush || isNsConecta} /> : null}

                    <FlashMessages />
                    <InboxNotificationPoller />
                </div>
            </div>
        );
    }

    return (
        <div
            className={`ns-app-shell fixed inset-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden overflow-x-clip overscroll-none bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans ${
                isNsConecta ? 'z-50' : 'z-0'
            }`}
        >
            {!modalOverlayOpen && !isNsConecta ? <GuestAppBar /> : null}

            <main
                className={`min-h-0 flex-1 overflow-x-clip overscroll-none touch-pan-y md:[scrollbar-gutter:stable] md:px-8 ${
                    modalOverlayOpen || isNsConecta
                        ? 'overflow-hidden p-0 pt-[env(safe-area-inset-top,0px)]'
                        : 'overflow-y-auto overflow-x-clip px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(3.5rem+var(--ns-get-app-banner-h,0px)+env(safe-area-inset-top,0px)+1.5rem)] md:pt-[calc(4rem+env(safe-area-inset-top,0px)+1.5rem)] lg:pt-24'
                }`}
            >
                <div className={`mx-auto w-full min-w-0 max-w-7xl overflow-x-clip lg:max-w-[90rem] ${modalOverlayOpen || isNsConecta ? 'min-h-0 h-full' : 'pb-2'}`}>
                    {children}
                </div>
            </main>

            {!modalOverlayOpen && !isNsConecta ? <MobileBottomNav /> : null}

            <FlashMessages />
        </div>
    );
}
