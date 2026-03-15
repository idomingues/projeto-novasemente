import { PropsWithChildren, useState } from 'react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';
import MobileBottomNav from '@/Components/MobileBottomNav';

const routeToPermissions: Record<string, string[]> = {
    dashboard: [],
    'members.index': ['members.view', 'members.manage'],
    'departments.index': ['departments.view', 'departments.manage'],
    'escalas.index': ['escalas.view', 'escalas.manage'],
    'volunteers.index': ['volunteers.view', 'volunteers.manage'],
    'rooms.index': ['rooms.view', 'rooms.manage'],
    'inventory.index': ['inventory.view', 'inventory.manage'],
    'users.index': ['users.view', 'users.manage'],
    'roles.index': ['roles.manage'],
    'news.index': ['news.view', 'news.manage'],
    'churches.index': ['churches.manage'],
    'churches.services.index': ['churches.manage'],
    'events.index': ['events.view', 'events.manage'],
    'culto.index': ['culto.manage'],
    'services.index': [],
    'settings.index': [],
    'more.index': [],
    'varios.schedule': [],
    'varios.services': [],
    'varios.classe-comecos': [],
    'varios.acervo': [],
    'acervo.index': [],
    'varios.contact': [],
    'varios.notifications': [],
};

export default function AdminLayout({ children }: PropsWithChildren) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            <Sidebar
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
                routeToPermissions={routeToPermissions}
            />

            <div className="md:pl-72 flex flex-col min-h-screen transition-all duration-300">
                <Topbar onMenuClick={() => setMobileMenuOpen(true)} />

                <main className="flex-1 pt-20 md:pt-24 px-4 sm:px-6 md:px-8 pb-24 lg:pb-12">
                    <div className="max-w-7xl mx-auto w-full min-w-0 pt-6">
                        {children}
                    </div>
                </main>

                {/* Barra inferior no celular: sempre visível em telas &lt; 1024px */}
                <div className="lg:hidden">
                    <MobileBottomNav />
                </div>

                <FlashMessages />
            </div>
        </div>
    );
}
