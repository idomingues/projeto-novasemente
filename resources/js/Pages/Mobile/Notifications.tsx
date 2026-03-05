import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { BellAlertIcon } from '@heroicons/react/24/outline';

export default function MobileNotifications() {
    return (
        <MobileLayout>
            <Head title="Notificações" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Notificações</h1>
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                        <BellAlertIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h2 className="font-semibold text-zinc-900 dark:text-white mb-2">
                        Em breve
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
                        Avisos push para eventos e notícias estão previstos para uma próxima versão (ex.: integração com OneSignal).
                    </p>
                </div>
            </div>
        </MobileLayout>
    );
}
