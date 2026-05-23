import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link } from '@inertiajs/react';

interface Props {
    logs: {
        id: number;
        action: string;
        user_name: string | null;
        subject_type: string | null;
        subject_id: number | null;
        created_at: string | null;
    }[];
}

export default function SharedTalentAdminLogs({ logs }: Props) {
    return (
        <AdminLayout>
            <Head title="Logs — Doar Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('shared-talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar
                    </Link>
                }
                title="Logs de auditoria"
            />
            <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b bg-zinc-50 dark:bg-zinc-900">
                            <th className="px-4 py-2 text-left">Data</th>
                            <th className="px-4 py-2 text-left">Ação</th>
                            <th className="px-4 py-2 text-left">Usuário</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} className="border-b dark:border-zinc-800">
                                <td className="px-4 py-2">{log.created_at}</td>
                                <td className="px-4 py-2">{log.action}</td>
                                <td className="px-4 py-2">{log.user_name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
