import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, Link, router } from '@inertiajs/react';

interface Props {
    reviews: {
        id: number;
        rating: number;
        comment: string | null;
        status: string;
        reviewer_name: string | null;
        reviewed_name: string | null;
        listing_title: string | null;
        created_at: string | null;
    }[];
}

export default function SharedTalentAdminReviews({ reviews }: Props) {
    return (
        <AdminLayout>
            <Head title="Avaliações — Doar Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('shared-talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar
                    </Link>
                }
                title="Avaliações"
            />
            <div className="space-y-3">
                {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border p-4 dark:border-zinc-800">
                        <p className="font-semibold">
                            {r.rating}★ — {r.listing_title}
                        </p>
                        <p className="text-sm text-zinc-500">
                            {r.reviewer_name} → {r.reviewed_name} · {r.created_at}
                        </p>
                        {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                        {r.status === 'visible' && (
                            <SecondaryButton
                                className="mt-2"
                                onClick={() => router.post(route('shared-talents.admin.reviews.hide', r.id))}
                            >
                                Ocultar
                            </SecondaryButton>
                        )}
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
