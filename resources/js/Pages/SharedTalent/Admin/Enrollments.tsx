import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link } from '@inertiajs/react';

interface Props {
    enrollments: {
        id: number;
        status_label: string;
        participant_name: string | null;
        listing_title: string | null;
        created_at: string | null;
    }[];
}

export default function SharedTalentAdminEnrollments({ enrollments }: Props) {
    return (
        <AdminLayout>
            <Head title="Inscrições — Doar Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('shared-talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar
                    </Link>
                }
                title="Inscrições"
            />
            <div className="space-y-2">
                {enrollments.map((e) => (
                    <div key={e.id} className="rounded-lg border p-3 dark:border-zinc-800">
                        <p className="font-medium">{e.listing_title}</p>
                        <p className="text-sm text-zinc-500">
                            {e.participant_name} · {e.status_label} · {e.created_at}
                        </p>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
