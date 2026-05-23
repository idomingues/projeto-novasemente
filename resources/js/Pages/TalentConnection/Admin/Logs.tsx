import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link } from '@inertiajs/react';

interface LogRow {
    id: number;
    action: string;
    user_name: string | null;
    subject_type: string | null;
    subject_id: number | null;
    created_at: string | null;
}

interface Props {
    logs: LogRow[];
}

export default function TalentConnectionAdminLogs({ logs }: Props) {
    return (
        <AdminLayout>
            <Head title="Logs — Conexão de Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar ao painel
                    </Link>
                }
                title="Logs"
                subtitle="Rastreabilidade administrativa"
            />

            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                            <th className="px-4 py-2 text-left">Data</th>
                            <th className="px-4 py-2 text-left">Ação</th>
                            <th className="px-4 py-2 text-left">Usuário</th>
                            <th className="px-4 py-2 text-left">Referência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="px-4 py-2 text-zinc-600">{log.created_at}</td>
                                <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
                                <td className="px-4 py-2">{log.user_name ?? '—'}</td>
                                <td className="px-4 py-2 text-zinc-500">
                                    {log.subject_type ? `${log.subject_type}#${log.subject_id}` : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
