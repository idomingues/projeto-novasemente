import { PropsWithChildren, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import MobileBottomNav from '@/Components/MobileBottomNav';
import { adminSidebarRoutePermissions } from '@/constants/adminSidebarPermissions';

export default function AdminLayout({ children }: PropsWithChildren) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isAuthenticated = !!(usePage().props as { auth?: { user?: unknown } }).auth?.user;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            {isAuthenticated && (
                <Sidebar
                    mobileOpen={mobileMenuOpen}
                    onMobileClose={() => setMobileMenuOpen(false)}
                    routeToPermissions={adminSidebarRoutePermissions}
                />
            )}

            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isAuthenticated ? 'md:pl-72' : ''}`}>
                <Topbar onMenuClick={() => setMobileMenuOpen(true)} hasSidebar={isAuthenticated} />

                <main className="flex-1 pt-20 md:pt-24 px-4 sm:px-6 md:px-8 pb-24">
                    <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full min-w-0 pt-6">
                        {children}
                    </div>
                </main>

                {/* Barra inferior: sempre visível (visitantes + logados), para o admin pré-visualizar o app; no md+ com sidebar, só na coluna principal */}
                <MobileBottomNav insetForSidebar={isAuthenticated} />

                <FlashMessages />
            </div>
        </div>
    );
}
