import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import { Head, Link } from '@inertiajs/react';

interface Props {
    metrics: {
        listings_total: number;
        listings_pending: number;
        listings_approved: number;
        reports_pending: number;
        reports_commercial: number;
        interests_active: number;
    };
    canModerate: boolean;
}

export default function TalentConnectionAdminDashboard({ metrics, canModerate }: Props) {
    return (
        <AdminLayout>
            <Head title="Central de Serviços" />
            <FlashMessages />
            <PageHeader title="Central de Serviços" subtitle="Serviços, habilidades e colaboração entre membros" />

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard label="Publicações" value={metrics.listings_total} />
                <MetricCard label="Aguardando aprovação" value={metrics.listings_pending} highlight />
                <MetricCard label="Ativas" value={metrics.listings_approved} />
                <MetricCard label="Denúncias pendentes" value={metrics.reports_pending} />
                <MetricCard label="Abuso comercial (abertas)" value={metrics.reports_commercial} />
                <MetricCard label="Conexões em andamento" value={metrics.interests_active} />
            </div>

            <div className="flex flex-wrap gap-3">
                {canModerate && (
                    <>
                        <Link
                            href={route('talents.admin.listings')}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                        >
                            Aprovar publicações
                        </Link>
                        <Link
                            href={route('talents.admin.listings')}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                        >
                            Cadastrar / gerenciar publicações
                        </Link>
                        <Link
                            href={route('talents.admin.reports')}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                        >
                            Denúncias
                        </Link>
                        <Link
                            href={route('talents.admin.categories')}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                        >
                            Categorias
                        </Link>
                        <Link
                            href={route('talents.admin.logs')}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                        >
                            Logs
                        </Link>
                    </>
                )}
                <Link
                    href={route('mobile.talents.index')}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                >
                    Ver no app (membros)
                </Link>
            </div>

            <p className="mt-8 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                O módulo não intermedia pagamentos. O tesoureiro acompanha denúncias de abuso comercial e métricas
                administrativas, sem editar publicações diretamente.
            </p>
        </AdminLayout>
    );
}

function MetricCard({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: number;
    highlight?: boolean;
}) {
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
