import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import { titleBarAddLabelClass } from '@/Components/AddButton';
import TalentConnectionAdminListingsPanel, {
    type TalentConnectionAdminListing,
} from '@/Components/Talents/TalentConnectionAdminListingsPanel';
import { Head, Link } from '@inertiajs/react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Props {
    listings: TalentConnectionAdminListing[];
    statusFilter: string;
    statusOptions: { value: string; label: string }[];
    categories: { id: number; name: string }[];
    typeOptions: { value: string; label: string }[];
    publisherOptions: { value: number; label: string }[];
}

export default function TalentConnectionAdminListings({
    listings,
    statusFilter,
    statusOptions,
    categories,
    typeOptions,
    publisherOptions,
}: Props) {
    return (
        <AdminLayout>
            <Head title="Publicações — Central de Serviços" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar ao painel
                    </Link>
                }
                title="Publicações"
                subtitle="Cadastrar, aprovar e gerenciar talentos da comunidade"
                actions={
                    <Link
                        href={route('talents.admin.listings', { status: statusFilter, modal: 'create' })}
                        className={titleBarAddLabelClass}
                        title="Cadastrar publicação"
                        aria-label="Cadastrar publicação"
                    >
                        <PlusIcon className="h-5 w-5" strokeWidth={2.25} />
                        Nova publicação
                    </Link>
                }
            />

            <TalentConnectionAdminListingsPanel
                listings={listings}
                statusFilter={statusFilter}
                statusOptions={statusOptions}
                categories={categories}
                typeOptions={typeOptions}
                publisherOptions={publisherOptions}
                statusFilterRoute="talents.admin.listings"
                reloadOnly={['listings']}
                showSectionHeader={false}
            />
        </AdminLayout>
    );
}
