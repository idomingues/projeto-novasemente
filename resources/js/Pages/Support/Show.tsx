import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import SupportTicketDetailPanel, { type SupportTicketDetailPanelProps } from '@/Components/Support/SupportTicketDetailPanel';

export default function SupportShow(props: SupportTicketDetailPanelProps) {
    return (
        <AdminLayout>
            <Head title="Suporte do app" />
            <SupportTicketDetailPanel {...props} variant="page" />
        </AdminLayout>
    );
}
