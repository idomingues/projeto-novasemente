import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import PageHeader from '@/Components/PageHeader';
import SecondaryButton from '@/Components/SecondaryButton';
import Card from '@/Components/Card';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import AppPhonePreviewButton from '@/Components/AppPhonePreview/AppPhonePreviewButton';
import { usePublicationAppPreview } from '@/hooks/usePublicationAppPreview';
import { confirmAction } from '@/utils/confirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    PhotoIcon,
    PowerIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Edition {
    id: number;
    title: string;
    year: number;
    month: number;
    month_label: string;
    cover_url: string | null;
    has_pdf: boolean;
    pdf_cached: boolean;
    cover_cached: boolean;
    is_active: boolean;
    synced_at: string | null;
}

interface Props {
    editions: {
        data: Edition[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
    };
    canManage: boolean;
    availableYears: number[];
    filters: {
        ano: number;
        status: 'all' | 'active' | 'inactive';
    };
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildQuery(filters: { ano: number; status: string }): Record<string, string> {
    const params: Record<string, string> = { ano: String(filters.ano) };
    if (filters.status !== 'all') params.status = filters.status;
    return params;
}

export default function RevistaAdventistaAcervoIndex({ editions, canManage, availableYears, filters }: Props) {
    const [syncing, setSyncing] = useState(false);
    const [syncingPdfs, setSyncingPdfs] = useState(false);
    const { openPreview, previewModal } = usePublicationAppPreview();

    const applyYear = (year: number) => {
        router.get(route('revista-adventista-acervo.index'), buildQuery({ ...filters, ano: year }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const applyStatus = (status: 'all' | 'active' | 'inactive') => {
        router.get(route('revista-adventista-acervo.index'), buildQuery({ ...filters, status }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const toggleActive = async (edition: Edition, isActive: boolean) => {
        const ok = await confirmAction({
            title: isActive ? 'Ativar edição?' : 'Desativar edição?',
            text: isActive
                ? 'A edição voltará a aparecer no app móvel.'
                : 'A edição deixará de aparecer no app móvel.',
            confirmButtonText: isActive ? 'Ativar' : 'Desativar',
            danger: !isActive,
        });
        if (!ok) return;

        router.patch(route('revista-adventista-acervo.edition.active', edition.id), { is_active: isActive }, { preserveScroll: true });
    };

    const deleteEdition = async (edition: Edition) => {
        const ok = await confirmAction({
            title: 'Excluir edição?',
            text: 'A edição será removida do acervo e os arquivos locais serão apagados. Depois, você poderá sincronizar o acervo para buscá-la novamente.',
            confirmButtonText: 'Excluir',
            danger: true,
        });
        if (!ok) return;

        router.delete(route('revista-adventista-acervo.edition.destroy', edition.id), { preserveScroll: true });
    };

    const syncArchive = (cachePdfs: boolean) => {
        if (cachePdfs) {
            setSyncingPdfs(true);
        } else {
            setSyncing(true);
        }

        router.post(
            route('revista-adventista-acervo.sync-archive'),
            { cache_pdfs: cachePdfs ? 1 : 0 },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSyncing(false);
                    setSyncingPdfs(false);
                },
            },
        );
    };

    return (
        <AdminLayout>
            <Head title="Acervo Revista Adventista" />
            <FlashMessages />

            <PageHeader
                title="Acervo Revista Adventista"
                subtitle="Edições históricas da Revista Adventista a partir do acervo da CPB (capa e PDF)."
                actions={
                    canManage ? (
                        <div className="flex flex-wrap gap-2">
                            <SecondaryButton
                                type="button"
                                onClick={() => syncArchive(false)}
                                disabled={syncing || syncingPdfs}
                                className="cursor-pointer"
                            >
                                <ArrowPathIcon className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                                Sincronizar acervo
                            </SecondaryButton>
                            <SecondaryButton
                                type="button"
                                onClick={() => syncArchive(true)}
                                disabled={syncing || syncingPdfs}
                                className="cursor-pointer"
                            >
                                <ArrowPathIcon className={`mr-2 h-4 w-4 ${syncingPdfs ? 'animate-spin' : ''}`} />
                                Baixar PDFs
                            </SecondaryButton>
                        </div>
                    ) : null
                }
            />

            <div className="mb-4 flex flex-wrap gap-2">
                {availableYears.slice(0, 24).map((year) => (
                    <button
                        key={year}
                        type="button"
                        onClick={() => applyYear(year)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                            filters.ano === year
                                ? 'bg-teal-600 text-white'
                                : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                    >
                        {year}
                    </button>
                ))}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {(['all', 'active', 'inactive'] as const).map((status) => (
                    <button
                        key={status}
                        type="button"
                        onClick={() => applyStatus(status)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition ${
                            filters.status === status
                                ? 'bg-teal-600 text-white'
                                : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                    >
                        {status === 'all' ? 'Todas' : status === 'active' ? 'Ativas' : 'Inativas'}
                    </button>
                ))}
            </div>

            {editions.data.length === 0 ? (
                <Card className="py-12 text-center">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-zinc-400" />
                    <p className="mt-4 font-medium text-zinc-600 dark:text-zinc-400">
                        Nenhuma edição encontrada para {filters.ano}.
                    </p>
                    {canManage ? (
                        <p className="mt-1 text-sm text-zinc-500">
                            Use &quot;Sincronizar acervo&quot; para importar e complementar as edições disponíveis.
                        </p>
                    ) : null}
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {editions.data.map((edition) => (
                        <Card key={edition.id} className="overflow-hidden">
                            <div className="flex gap-4">
                                <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                    {edition.cover_url ? (
                                        <img src={edition.cover_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <PhotoIcon className="h-8 w-8 text-zinc-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white">{edition.title}</h2>
                                    <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        <CalendarDaysIcon className="h-4 w-4" />
                                        Sincronizado em {formatDate(edition.synced_at)}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <span
                                            className={`rounded-full px-2 py-0.5 ${edition.cover_cached ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}
                                        >
                                            {edition.cover_cached ? 'Capa local' : 'Capa remota'}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 ${edition.pdf_cached ? 'bg-emerald-100 text-emerald-800' : edition.has_pdf ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}
                                        >
                                            {edition.pdf_cached ? 'PDF local' : edition.has_pdf ? 'PDF remoto' : 'Sem PDF'}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 ${edition.is_active ? 'bg-teal-100 text-teal-800' : 'bg-zinc-200 text-zinc-700'}`}
                                        >
                                            {edition.is_active ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <ListCardActionRow className="mt-4">
                                <Link
                                    href={route('mobile.acervo-revista-adventista.show', edition.id)}
                                    target="_blank"
                                    className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
                                >
                                    Ver no app
                                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                </Link>
                                <div className="flex items-center gap-1">
                                    <AppPhonePreviewButton
                                        onClick={() =>
                                            openPreview({
                                                typeLabel: 'Edição',
                                                title: edition.title,
                                                excerpt: `${edition.month_label} de ${edition.year}`,
                                                imageUrl: edition.cover_url,
                                                publishedLabel: formatDate(edition.synced_at),
                                                meta: [
                                                    edition.pdf_cached
                                                        ? 'PDF local'
                                                        : edition.has_pdf
                                                          ? 'PDF remoto'
                                                          : 'Sem PDF',
                                                    edition.is_active ? 'Ativa' : 'Inativa',
                                                ],
                                                backLabel: '← Revista',
                                            })
                                        }
                                    />
                                    {canManage ? (
                                        <>
                                            <ListCardIconActionButton
                                                label={edition.is_active ? 'Desativar' : 'Ativar'}
                                                icon={<PowerIcon className="h-5 w-5" />}
                                                onClick={() => toggleActive(edition, !edition.is_active)}
                                                tone={edition.is_active ? 'danger' : 'default'}
                                            />
                                            <ListCardIconActionButton
                                                label="Excluir"
                                                icon={<TrashIcon className="h-5 w-5" />}
                                                onClick={() => deleteEdition(edition)}
                                                tone="danger"
                                            />
                                        </>
                                    ) : null}
                                </div>
                            </ListCardActionRow>
                        </Card>
                    ))}
                </div>
            )}

            {editions.last_page > 1 ? (
                <nav className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Paginação">
                    {editions.links.map((link, index) => {
                        if (!link.url) {
                            return (
                                <span
                                    key={`${link.label}-${index}`}
                                    className="inline-flex min-w-[2.25rem] cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            );
                        }

                        return (
                            <Link
                                key={`${link.label}-${index}`}
                                href={link.url}
                                preserveScroll
                                className={`inline-flex min-w-[2.25rem] cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm transition ${
                                    link.active
                                        ? 'border-teal-600 bg-teal-600 text-white'
                                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        );
                    })}
                </nav>
            ) : null}

            {previewModal}
        </AdminLayout>
    );
}
