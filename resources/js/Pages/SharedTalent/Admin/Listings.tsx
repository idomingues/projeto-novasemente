import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link, router } from '@inertiajs/react';

interface Listing {
    id: number;
    title: string;
    category_name: string | null;
    author_name: string | null;
    status: string;
    status_label: string;
    slots_total: number;
    slots_filled: number;
    modality_label: string;
    created_at: string | null;
    rejection_reason: string | null;
}

interface Props {
    listings: Listing[];
    statusFilter: string;
    statusOptions: { value: string; label: string }[];
}

export default function SharedTalentAdminListings({ listings, statusFilter, statusOptions }: Props) {
    const moderate = (id: number, action: string) => {
        router.post(route('shared-talents.admin.listings.moderate', id), { action });
    };

    const setFilter = (status: string) => {
        router.get(route('shared-talents.admin.listings'), { status }, { preserveState: true });
    };

    return (
        <AdminLayout>
            <Head title="Publicações — Doar Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('shared-talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar ao painel
                    </Link>
                }
                title="Publicações"
                subtitle="Aprovar e moderar talentos compartilhados"
            />

            <div className="mb-4 flex flex-wrap gap-2">
                {statusOptions.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => setFilter(o.value)}
                        className={`rounded-lg px-3 py-1.5 text-sm ${
                            statusFilter === o.value
                                ? 'bg-brand-600 text-white'
                                : 'border border-zinc-300 dark:border-zinc-600'
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {listings.map((listing) => (
                    <div
                        key={listing.id}
                        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-zinc-900 dark:text-white">{listing.title}</p>
                                <p className="text-sm text-zinc-500">
                                    {listing.category_name} · {listing.modality_label} · {listing.author_name}
                                </p>
                                <p className="text-xs text-zinc-400">
                                    {listing.status_label} · {listing.slots_filled}/{listing.slots_total} vagas ·{' '}
                                    {listing.created_at}
                                </p>
                                {listing.rejection_reason && (
                                    <p className="mt-1 text-sm text-red-600">{listing.rejection_reason}</p>
                                )}
                            </div>
                            {listing.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => moderate(listing.id, 'approve')}
                                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
                                    >
                                        Aprovar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moderate(listing.id, 'reject')}
                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                                    >
                                        Rejeitar
                                    </button>
                                </div>
                            )}
                            {listing.status === 'active' && (
                                <button
                                    type="button"
                                    onClick={() => moderate(listing.id, 'suspend')}
                                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                                >
                                    Suspender
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
