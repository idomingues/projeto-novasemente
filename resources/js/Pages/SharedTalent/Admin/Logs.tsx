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
                    <Link href={route('shared-talents.admin.dashboard')} className="cursor-pointer text-sm text-brand-600">
                        ← Voltar
                    </Link>
                }
                title="Logs de auditoria"
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
                                <p className="mt-1 font-medium text-zinc-900 dark:text-white">{log.action}</p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{log.user_name ?? '—'}</p>
                            </li>
                        ))}
                    </ul>
                    <div className="hidden overflow-x-auto rounded-xl border dark:border-zinc-800 md:block">
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
                </>
            )}
        </AdminLayout>
    );
}
