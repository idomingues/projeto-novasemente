import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Checkbox from '@/Components/Checkbox';
import Textarea from '@/Components/Textarea';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Report {
    id: number;
    reason_label: string;
    status_label: string;
    description: string | null;
    reporter_name: string | null;
    listing_title: string | null;
    created_at: string | null;
}

interface Props {
    reports: Report[];
}

export default function SharedTalentAdminReports({ reports }: Props) {
    const [activeId, setActiveId] = useState<number | null>(null);
    const form = useForm({ status: 'resolved', resolution_notes: '', pause_listing: false });

    return (
        <AdminLayout>
            <Head title="Denúncias — Doar Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('shared-talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar
                    </Link>
                }
                title="Denúncias"
            />
            <div className="space-y-4">
                {reports.map((report) => (
                    <div key={report.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="font-semibold">{report.reason_label}</p>
                        <p className="text-sm text-zinc-500">
                            {report.listing_title} · {report.created_at}
                        </p>
                        {report.description && <p className="mt-2 text-sm">{report.description}</p>}
                        <span className="text-xs">{report.status_label}</span>
                        {activeId === report.id ? (
                            <div className="mt-4 space-y-3 border-t pt-4">
                                <Textarea
                                    value={form.data.resolution_notes}
                                    onChange={(e) => form.setData('resolution_notes', e.target.value)}
                                />
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={form.data.pause_listing}
                                        onChange={(e) => form.setData('pause_listing', e.target.checked)}
                                    />
                                    Suspender publicação
                                </label>
                                <PrimaryButton
                                    onClick={() =>
                                        form.patch(route('shared-talents.admin.reports.resolve', report.id), {
                                            onSuccess: () => setActiveId(null),
                                        })
                                    }
                                >
                                    Salvar
                                </PrimaryButton>
                            </div>
                        ) : (
                            <SecondaryButton className="mt-2" onClick={() => setActiveId(report.id)}>
                                Resolver
                            </SecondaryButton>
                        )}
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
