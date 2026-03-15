import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { BellAlertIcon } from '@heroicons/react/24/outline';

export default function VariosNotifications() {
    return (
        <AdminLayout>
            <Head title="Notificações" />
            <div className="space-y-4 sm:space-y-6">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Notificações</h1>
                <div className="max-w-md mx-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                        <BellAlertIcon className="w-8 h-8 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <h2 className="font-semibold text-zinc-900 dark:text-white mb-2">Em breve</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Avisos push para eventos e notícias estão previstos para uma próxima versão (ex.:
                        integração com OneSignal).
                    </p>
                </div>
            </div>
        </AdminLayout>
    );
}
