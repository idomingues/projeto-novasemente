import { PropsWithChildren } from 'react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';

export default function AdminLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            <Sidebar />
            
            <div className="md:pl-72 flex flex-col min-h-screen transition-all duration-300">
                <Topbar />
                
                <main className="flex-1 pt-24 px-8 pb-12">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>

                <FlashMessages />
            </div>
        </div>
    );
}
