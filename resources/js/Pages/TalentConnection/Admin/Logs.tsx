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
            <Head title="Logs — Central de Serviços" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('talents.admin.dashboard')} className="cursor-pointer text-sm text-brand-600">
                        ← Voltar ao painel
                    </Link>
                }
                title="Logs"
                subtitle="Rastreabilidade administrativa"
            />

            {logs.length === 0 ? (
                <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                    Nenhum log registrado.
                </p>
            ) : (
                <>
                    <ul className="space-y-3 md:hidden">
                        {logs.map((log) => (
                            <li
                                key={log.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{log.created_at}</p>
                                <p className="mt-1 break-all font-mono text-xs font-medium text-zinc-900 dark:text-white">
                                    {log.action}
                                </p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{log.user_name ?? '—'}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    {log.subject_type ? `${log.subject_type}#${log.subject_id}` : '—'}
                                </p>
                            </li>
                        ))}
                    </ul>
                    <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 md:block">
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
                </>
            )}
        </AdminLayout>
    );
}
