import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Checkbox from '@/Components/Checkbox';
import Textarea from '@/Components/Textarea';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Report {
    id: number;
    reason_label: string;
    status_label: string;
    description: string | null;
    reporter_name: string | null;
    listing_title: string | null;
    reported_user_name: string | null;
    created_at: string | null;
    resolution_notes: string | null;
}

interface Props {
    reports: Report[];
}

export default function TalentConnectionAdminReports({ reports }: Props) {
    const [activeId, setActiveId] = useState<number | null>(null);
    const form = useForm({
        status: 'resolved',
        resolution_notes: '',
        pause_listing: false,
    });

    const resolve = (id: number) => {
        form.patch(route('talents.admin.reports.resolve', id), {
            onSuccess: () => {
                setActiveId(null);
                form.reset();
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Denúncias — Conexão de Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar ao painel
                    </Link>
                }
                title="Denúncias"
                subtitle="Conteúdo inadequado, abuso comercial e conduta"
            />

            <div className="space-y-4">
                {reports.map((report) => (
                    <div
                        key={report.id}
                        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        <p className="font-semibold text-zinc-900 dark:text-white">{report.reason_label}</p>
                        <p className="text-sm text-zinc-500">
                            {report.listing_title} · {report.reported_user_name} · {report.created_at}
                        </p>
                        <p className="text-xs text-zinc-400">Por {report.reporter_name}</p>
                        {report.description && <p className="mt-2 text-sm">{report.description}</p>}
                        <span className="mt-1 inline-block text-xs">{report.status_label}</span>
                        {report.resolution_notes && (
                            <p className="mt-2 text-sm text-zinc-600">{report.resolution_notes}</p>
                        )}

                        {activeId === report.id ? (
                            <div className="mt-4 space-y-3 border-t pt-4 dark:border-zinc-700">
                                <Textarea
                                    placeholder="Notas da resolução"
                                    value={form.data.resolution_notes}
                                    onChange={(e) => form.setData('resolution_notes', e.target.value)}
                                />
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={form.data.pause_listing}
                                        onChange={(e) => form.setData('pause_listing', e.target.checked)}
                                    />
                                    Pausar publicação relacionada
                                </label>
                                <div className="flex gap-2">
                                    <PrimaryButton type="button" onClick={() => resolve(report.id)}>
                                        Resolver
                                    </PrimaryButton>
                                    <SecondaryButton type="button" onClick={() => setActiveId(null)}>
                                        Cancelar
                                    </SecondaryButton>
                                </div>
                            </div>
                        ) : (
                            <SecondaryButton type="button" className="mt-3" onClick={() => setActiveId(report.id)}>
                                Analisar
                            </SecondaryButton>
                        )}
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
