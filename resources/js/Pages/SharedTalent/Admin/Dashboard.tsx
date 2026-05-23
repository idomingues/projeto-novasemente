import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link } from '@inertiajs/react';

interface Props {
    metrics: {
        listings_active: number;
        listings_pending: number;
        enrollments_total: number;
        enrollments_pending: number;
        reports_pending: number;
        listings_closed: number;
    };
    topListings: { id: number; title: string; enrollments_count: number }[];
    canModerate: boolean;
}

export default function SharedTalentAdminDashboard({ metrics, topListings, canModerate }: Props) {
    return (
        <AdminLayout>
            <Head title="Doar Talentos" />
            <FlashMessages />
            <PageHeader
                title="Doar Talentos"
                subtitle="Compartilhamento gratuito de talentos, aprendizado e apoio na comunidade"
            />

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard label="Talentos ativos" value={metrics.listings_active} />
                <MetricCard label="Aguardando aprovação" value={metrics.listings_pending} highlight />
                <MetricCard label="Inscrições" value={metrics.enrollments_total} />
                <MetricCard label="Inscrições pendentes" value={metrics.enrollments_pending} />
                <MetricCard label="Denúncias pendentes" value={metrics.reports_pending} />
                <MetricCard label="Encerrados" value={metrics.listings_closed} />
            </div>

            {topListings.length > 0 && (
                <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="mb-3 font-semibold text-zinc-900 dark:text-white">Mais procurados</h2>
                    <ul className="space-y-2 text-sm">
                        {topListings.map((l) => (
                            <li key={l.id} className="flex justify-between">
                                <span>{l.title}</span>
                                <span className="text-zinc-500">{l.enrollments_count} inscrições</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {canModerate && (
                <div className="flex flex-wrap gap-3">
                    <Link
                        href={route('shared-talents.admin.listings')}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                        Publicações
                    </Link>
                    <Link
                        href={route('shared-talents.admin.enrollments')}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                    >
                        Inscrições
                    </Link>
                    <Link
                        href={route('shared-talents.admin.reports')}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                    >
                        Denúncias
                    </Link>
                    <Link
                        href={route('shared-talents.admin.categories')}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                    >
                        Categorias
                    </Link>
                    <Link
                        href={route('shared-talents.admin.reviews')}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                    >
                        Avaliações
                    </Link>
                    <Link
                        href={route('shared-talents.admin.logs')}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                    >
                        Logs
                    </Link>
                    <Link
                        href={route('mobile.shared-talents.index')}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                    >
                        Ver no app
                    </Link>
                </div>
            )}

            <p className="mt-8 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                Este módulo não intermedia pagamentos nem contratação de serviços. O foco é colaboração, discipulado e
                crescimento mútuo entre membros.
            </p>
        </AdminLayout>
    );
}

function MetricCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div
            className={`rounded-xl border p-4 ${
                highlight
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
        >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
        </div>
    );
}
