import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import PageHeader from '@/Components/PageHeader';
import VolunteerRequestsStaffSection, {
    type VolunteerRequestRow,
} from '@/Components/Volunteers/VolunteerRequestsStaffSection';
import { Head, Link } from '@inertiajs/react';

type VolunteerRequestMinistryOption = {
    id: number;
    name: string;
    schedule_roles: Array<{ id: number; name: string }>;
};

type VolunteerAttachOption = {
    id: number;
    name: string;
    email: string | null;
};

type Props = {
    volunteerRequestRows: VolunteerRequestRow[];
    volunteerRequestMinistries: VolunteerRequestMinistryOption[];
    volunteerRequestStoreUrl: string;
    volunteersForAttach: VolunteerAttachOption[];
    attachVolunteerPickerUrl?: string;
    volunteerRequestFilters: { arquivados: boolean };
    volunteerRequestArchivedCount: number;
    volunteerRequestActiveCount: number;
    centralUrl: string;
};

export default function Pedidos({
    volunteerRequestRows,
    volunteerRequestMinistries,
    volunteerRequestStoreUrl,
    volunteersForAttach,
    attachVolunteerPickerUrl,
    volunteerRequestFilters,
    volunteerRequestArchivedCount,
    volunteerRequestActiveCount,
    centralUrl,
}: Props) {
    return (
        <AdminLayout>
            <Head title="Pedidos de voluntário" />
            <FlashMessages />
            <PageHeader
                title="Pedidos"
                subtitle="Pedidos de líderes e da secretaria. Abra um pedido para detalhes, chat ou anexar voluntário."
                lead={
                    <Link href={centralUrl} className="cursor-pointer text-sm text-zinc-600 hover:underline dark:text-zinc-400">
                        ← Voluntários
                    </Link>
                }
            />
            <VolunteerRequestsStaffSection
                rows={volunteerRequestRows}
                ministries={volunteerRequestMinistries}
                storeUrl={volunteerRequestStoreUrl}
                volunteersForAttach={volunteersForAttach}
                attachVolunteerPickerUrl={attachVolunteerPickerUrl}
                filters={volunteerRequestFilters}
                archivedCount={volunteerRequestArchivedCount}
                activeCount={volunteerRequestActiveCount}
            />
        </AdminLayout>
    );
}
