import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function SettingsIndex() {
    return (
        <AdminLayout>
            <Head title="Configurações" />
            <PageHeader title="Configurações" />
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
                <Cog6ToothIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                <p className="text-zinc-500 dark:text-zinc-400">Nada a configurar no momento.</p>
            </div>
        </AdminLayout>
    );
}
