import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowPathIcon,
    BookOpenIcon,
    ChartBarIcon,
    CheckCircleIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    SparklesIcon,
    Squares2X2Icon,
    TrashIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import SelectInput from '@/Components/SelectInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import { FormEventHandler, useMemo, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

type Row = {
    id: number;
    livro: string;
    capitulo: number;
    versiculo_inicio: number;
    versiculo_fim: number;
    categoria: string;
    nota: number;
    peso: number;
    ativo: boolean;
    ref: string;
    textPreview: string | null;
};

type ImportResult = {
    imported: number;
    skipped_duplicate: number;
    skipped_missing: number;
    skipped_excluded: number;
    scanned?: number;
    errors?: string[];
};

type ImportPreviewItem = {
    key: string;
    livro: string;
    capitulo: number;
    versiculo_inicio: number;
    versiculo_fim: number;
    categoria: string;
    nota: number;
    peso: number;
    motivo: string;
    ref: string;
    textPreview: string | null;
    status: 'ready' | 'duplicate' | 'missing' | 'excluded';
    selected: boolean;
};

type ImportPreviewSummary = {
    suggested: number;
    ready: number;
    duplicate: number;
    missing: number;
    excluded: number;
};

type PreviewResponse = {
    ok?: boolean;
    message?: string;
    items?: ImportPreviewItem[];
    summary?: ImportPreviewSummary;
    scanned?: number;
};

type CategoryStat = {
    categoria: string;
    total: number;
    active: number;
};

type IndexStats = {
    total: number;
    active: number;
    inactive: number;
    categoriesUsed: number;
    books: number;
    avgNota: number;
    avgPeso: number;
    byCategory: CategoryStat[];
};

const defaultStats: IndexStats = {
    total: 0,
    active: 0,
    inactive: 0,
    categoriesUsed: 0,
    books: 0,
    avgNota: 0,
    avgPeso: 0,
    byCategory: [],
};

function formatStat(n: number): string {
    return n.toLocaleString('pt-BR');
}

type Props = {
    rows: Row[];
    stats: IndexStats;
    categories: string[];
    books: string[];
    schemaReady?: boolean;
    bibleReady?: boolean;
    canManage?: boolean;
    filters?: { q: string; categoria: string; ativo: string };
    importResult?: ImportResult | null;
    aiConfigured?: boolean;
    aiDefaultPrompt?: string;
};

export default function VersiculosCaixinhaIndex({
    rows,
    stats = defaultStats,
    categories,
    books,
    schemaReady = true,
    bibleReady = true,
    canManage = true,
    filters = { q: '', categoria: '', ativo: '' },
    importResult = null,
    aiConfigured = false,
    aiDefaultPrompt = '',
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters.q);
    const [filterCategoria, setFilterCategoria] = useState(filters.categoria);
    const [filterAtivo, setFilterAtivo] = useState(filters.ativo);
    const [aiPrompt, setAiPrompt] = useState(aiDefaultPrompt);
    const [aiLimit, setAiLimit] = useState('15');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewImporting, setPreviewImporting] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
    const [previewSummary, setPreviewSummary] = useState<ImportPreviewSummary | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const [previewScanned, setPreviewScanned] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        livro: books[0] ?? '',
        capitulo: '1',
        versiculo_inicio: '1',
        versiculo_fim: '1',
        categoria: categories[0] ?? 'Esperança',
        nota: '8',
        peso: '5',
        ativo: true,
    });

    const {
        data: scanData,
        setData: setScanData,
    } = useForm({
        limit: '50',
        min_nota: '8',
    });

    const filteredCount = rows.length;

    const previewText = useMemo(() => {
        if (!isModalOpen) return '';
        const match = isEditing
            ? rows.find((r) => r.id === editingId)
            : rows.find(
                  (r) =>
                      r.livro === data.livro &&
                      Number(data.capitulo) === r.capitulo &&
                      Number(data.versiculo_inicio) === r.versiculo_inicio &&
                      Number(data.versiculo_fim) === r.versiculo_fim,
              );
        return match?.textPreview ?? null;
    }, [isModalOpen, isEditing, editingId, rows, data.livro, data.capitulo, data.versiculo_inicio, data.versiculo_fim]);

    const applyFilters = (overrides?: { q?: string; categoria?: string; ativo?: string }) => {
        const q = overrides?.q !== undefined ? overrides.q : search.trim();
        const categoria = overrides?.categoria !== undefined ? overrides.categoria : filterCategoria;
        const ativo = overrides?.ativo !== undefined ? overrides.ativo : filterAtivo;

        if (overrides?.q !== undefined) {
            setSearch(overrides.q);
        }
        if (overrides?.categoria !== undefined) {
            setFilterCategoria(overrides.categoria);
        }
        if (overrides?.ativo !== undefined) {
            setFilterAtivo(overrides.ativo);
        }

        router.get(
            route('promise-box-verses.index'),
            {
                q: q || undefined,
                categoria: categoria || undefined,
                ativo: ativo || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const filterByCategory = (categoria: string) => {
        applyFilters({ categoria });
    };

    const summaryCards = useMemo(
        () => [
            {
                name: 'Total cadastradas',
                value: formatStat(stats.total),
                hint: `${formatStat(stats.books)} livro(s) distinto(s)`,
                icon: BookOpenIcon,
            },
            {
                name: 'Ativas',
                value: formatStat(stats.active),
                hint: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% do acervo` : '—',
                icon: CheckCircleIcon,
            },
            {
                name: 'Inativas',
                value: formatStat(stats.inactive),
                hint: 'Ocultas no app móvel',
                icon: XCircleIcon,
            },
            {
                name: 'Categorias',
                value: formatStat(stats.categoriesUsed),
                hint: `Nota média ${stats.avgNota.toLocaleString('pt-BR')} · Peso médio ${stats.avgPeso.toLocaleString('pt-BR')}`,
                icon: Squares2X2Icon,
            },
        ],
        [stats],
    );

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        setData('livro', books[0] ?? '');
        setData('categoria', categories[0] ?? 'Esperança');
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (row: Row) => {
        setIsEditing(true);
        setEditingId(row.id);
        setData({
            livro: row.livro,
            capitulo: String(row.capitulo),
            versiculo_inicio: String(row.versiculo_inicio),
            versiculo_fim: String(row.versiculo_fim),
            categoria: row.categoria,
            nota: String(row.nota),
            peso: String(row.peso),
            ativo: row.ativo,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setEditingId(null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('promise-box-verses.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('promise-box-verses.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover promessa?',
            text: 'Esta referência deixará de aparecer na Caixa de Promessas.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('promise-box-verses.destroy', id));
        }
    };

    const resetPreview = () => {
        setPreviewItems([]);
        setPreviewSummary(null);
        setPreviewError('');
        setPreviewTitle('');
        setPreviewScanned(null);
        setIsPreviewOpen(false);
    };

    const openPreview = (title: string, data: PreviewResponse) => {
        setPreviewTitle(title);
        setPreviewItems(data.items ?? []);
        setPreviewSummary(data.summary ?? null);
        setPreviewScanned(typeof data.scanned === 'number' ? data.scanned : null);
        setPreviewError('');
        setIsPreviewOpen(true);
    };

    const fetchPreview = async (url: string, body?: Record<string, unknown>) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrf,
            },
            body: JSON.stringify(body ?? {}),
        });

        return (await res.json()) as PreviewResponse & { message?: string };
    };

    const runPopularPreview = async () => {
        if (!bibleReady) return;
        setPreviewLoading(true);
        setPreviewError('');
        try {
            const data = await fetchPreview(route('promise-box-verses.preview-popular'));
            if (!data.ok) {
                setPreviewError(data.message || 'Não foi possível gerar a prévia.');
                return;
            }
            openPreview('Versículos populares', data);
        } catch {
            setPreviewError('Não foi possível conectar ao servidor. Tente novamente.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const runScanPreview = async () => {
        if (!bibleReady) return;
        setPreviewLoading(true);
        setPreviewError('');
        try {
            const data = await fetchPreview(route('promise-box-verses.preview-scan'), {
                limit: Number(scanData.limit) || 50,
                min_nota: Number(scanData.min_nota) || 8,
            });
            if (!data.ok) {
                setPreviewError(data.message || 'Não foi possível gerar a prévia.');
                return;
            }
            openPreview('Varredura da Bíblia', data);
        } catch {
            setPreviewError('Não foi possível conectar ao servidor. Tente novamente.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const runAiPreview = async () => {
        if (!aiConfigured || !bibleReady) return;
        setPreviewLoading(true);
        setPreviewError('');
        try {
            const data = await fetchPreview(route('promise-box-verses.ai-preview'), {
                prompt: aiPrompt,
                limit: Number(aiLimit) || 15,
            });
            if (!data.ok) {
                setPreviewError(data.message || 'Não foi possível gerar a prévia com IA.');
                return;
            }
            openPreview('Busca com IA', data);
        } catch {
            setPreviewError('Não foi possível conectar ao servidor. Tente novamente.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const togglePreviewItem = (key: string, selected: boolean) => {
        setPreviewItems((items) => items.map((item) => (item.key === key ? { ...item, selected } : item)));
    };

    const importPreviewSelected = () => {
        const selected = previewItems.filter((item) => item.selected && item.status === 'ready');
        if (selected.length === 0) return;

        setPreviewImporting(true);
        router.post(
            route('promise-box-verses.import-selected'),
            {
                items: selected.map(({ livro, capitulo, versiculo_inicio, versiculo_fim, categoria, nota, peso }) => ({
                    livro,
                    capitulo,
                    versiculo_inicio,
                    versiculo_fim,
                    categoria,
                    nota,
                    peso,
                })),
            },
            {
                onSuccess: () => {
                    setIsImportOpen(false);
                    resetPreview();
                },
                onFinish: () => setPreviewImporting(false),
            },
        );
    };

    const previewSelectedCount = previewItems.filter((item) => item.selected && item.status === 'ready').length;

    const previewStatusLabel = (status: ImportPreviewItem['status']) => {
        switch (status) {
            case 'ready':
                return 'Novo';
            case 'duplicate':
                return 'Duplicata';
            case 'missing':
                return 'Não encontrado';
            case 'excluded':
                return 'Excluído';
        }
    };

    return (
        <AdminLayout>
            <Head title="Caixa de Promessas" />
            <PageHeader
                title="Caixa de Promessas"
                subtitle="Gerencie o acervo de promessas exibidas no app móvel"
                actions={
                    schemaReady && canManage ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <SecondaryButton type="button" onClick={() => setIsImportOpen(true)}>
                                Importar
                            </SecondaryButton>
                            <AddButton variant="icon" onClick={openCreateModal} title="Nova promessa">
                                Nova promessa
                            </AddButton>
                        </div>
                    ) : undefined
                }
            />

            {!schemaReady && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    A tabela <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">versiculos_caixinha</code> ainda não
                    existe. Execute as migrations para ativar esta área.
                </div>
            )}

            {importResult && (
                <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                    <p className="font-semibold">Resultado da importação</p>
                    <p className="mt-1">
                        Importadas: {importResult.imported} · Duplicadas ignoradas: {importResult.skipped_duplicate} · Não
                        encontradas: {importResult.skipped_missing}
                        {typeof importResult.scanned === 'number' ? ` · Versículos analisados: ${importResult.scanned}` : ''}
                    </p>
                    {importResult.errors && importResult.errors.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs opacity-90">
                            {importResult.errors.slice(0, 5).map((err) => (
                                <li key={err}>{err}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {schemaReady && stats.total > 0 && (
                <>
                    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map((card) => (
                            <Card key={card.name} className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
                                        <card.icon className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                            {card.name}
                                        </p>
                                        <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                            {card.value}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{card.hint}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {stats.byCategory.length > 0 && (
                        <Card className="mb-6 p-4">
                            <div className="mb-3 flex items-start gap-3">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
                                    <ChartBarIcon className="h-5 w-5" aria-hidden />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Por categoria</h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Clique em uma categoria para filtrar a lista abaixo.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                {stats.byCategory.map((item) => {
                                    const isSelected = filterCategoria === item.categoria;
                                    return (
                                        <button
                                            key={item.categoria}
                                            type="button"
                                            onClick={() => filterByCategory(isSelected ? '' : item.categoria)}
                                            className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                                isSelected
                                                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600/30 dark:border-brand-500 dark:bg-brand-950/40 dark:ring-brand-500/30'
                                                    : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
                                            }`}
                                        >
                                            <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                                {item.categoria}
                                            </p>
                                            <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                                                {formatStat(item.total)}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                                {formatStat(item.active)} ativa(s)
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                            {filterCategoria && (
                                <button
                                    type="button"
                                    onClick={() => filterByCategory('')}
                                    className="mt-3 cursor-pointer text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                                >
                                    Limpar filtro de categoria
                                </button>
                            )}
                        </Card>
                    )}
                </>
            )}

            {schemaReady && (
                <>
                    <Card className="mb-6 p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <div className="md:col-span-2">
                                <InputLabel htmlFor="search" value="Buscar" />
                                <div className="relative mt-1">
                                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <TextInput
                                        id="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                        className="pl-9"
                                        placeholder="Livro ou categoria"
                                    />
                                </div>
                            </div>
                            <div>
                                <InputLabel htmlFor="filter-categoria" value="Categoria" />
                                <SelectInput
                                    id="filter-categoria"
                                    className="mt-1 block w-full"
                                    value={filterCategoria}
                                    onChange={(e) => setFilterCategoria(e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="filter-ativo" value="Status" />
                                <SelectInput
                                    id="filter-ativo"
                                    className="mt-1 block w-full"
                                    value={filterAtivo}
                                    onChange={(e) => setFilterAtivo(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="1">Ativos</option>
                                    <option value="0">Inativos</option>
                                </SelectInput>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <SecondaryButton type="button" onClick={applyFilters}>
                                Filtrar
                            </SecondaryButton>
                        </div>
                    </Card>

                    {rows.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                                <BookOpenIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma promessa encontrada</p>
                            <p className="mt-1 text-sm text-zinc-500">Adicione manualmente ou importe versículos populares.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="border-b border-zinc-100 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                Exibindo {filteredCount} promessa(s)
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-950/40">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Referência</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Texto</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Categoria</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Nota</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Peso</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {rows.map((row) => (
                                            <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-950/20">
                                                <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.ref}</td>
                                                <td className="max-w-md px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                                    {row.textPreview ? (
                                                        <span className="line-clamp-2">{row.textPreview}</span>
                                                    ) : (
                                                        <span className="italic text-zinc-400">Texto não encontrado na Bíblia</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{row.categoria}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{row.nota}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{row.peso}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                            row.ativo
                                                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                        }`}
                                                    >
                                                        {row.ativo ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(row)}
                                                            className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                                                            title="Editar"
                                                        >
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(row.id)}
                                                            className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                                                            title="Excluir"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            <Modal
                show={isModalOpen}
                onClose={closeModal}
                maxWidth="lg"
                footer={
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="promise-form" disabled={processing}>
                            {isEditing ? 'Salvar' : 'Adicionar'}
                        </PrimaryButton>
                    </div>
                }
            >
                <form id="promise-form" onSubmit={submit} className="space-y-4 px-5 py-6 sm:px-7">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                            {isEditing ? 'Editar promessa' : 'Nova promessa'}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">Informe a referência bíblica. Duplicatas são bloqueadas automaticamente.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <InputLabel htmlFor="livro" value="Livro" />
                            <SelectInput id="livro" className="mt-1 block w-full" value={data.livro} onChange={(e) => setData('livro', e.target.value)}>
                                {books.map((book) => (
                                    <option key={book} value={book}>
                                        {book}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.livro} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="capitulo" value="Capítulo" />
                            <TextInput id="capitulo" type="number" min={1} className="mt-1 block w-full" value={data.capitulo} onChange={(e) => setData('capitulo', e.target.value)} />
                            <InputError message={errors.capitulo} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="versiculo_inicio" value="Versículo início" />
                            <TextInput id="versiculo_inicio" type="number" min={1} className="mt-1 block w-full" value={data.versiculo_inicio} onChange={(e) => setData('versiculo_inicio', e.target.value)} />
                            <InputError message={errors.versiculo_inicio} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="versiculo_fim" value="Versículo fim" />
                            <TextInput id="versiculo_fim" type="number" min={1} className="mt-1 block w-full" value={data.versiculo_fim} onChange={(e) => setData('versiculo_fim', e.target.value)} />
                            <InputError message={errors.versiculo_fim} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="categoria" value="Categoria" />
                            <SelectInput id="categoria" className="mt-1 block w-full" value={data.categoria} onChange={(e) => setData('categoria', e.target.value)}>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.categoria} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="nota" value="Nota (1–10)" />
                            <TextInput id="nota" type="number" min={1} max={10} className="mt-1 block w-full" value={data.nota} onChange={(e) => setData('nota', e.target.value)} />
                            <InputError message={errors.nota} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="peso" value="Peso (1–10)" />
                            <TextInput id="peso" type="number" min={1} max={10} className="mt-1 block w-full" value={data.peso} onChange={(e) => setData('peso', e.target.value)} />
                            <InputError message={errors.peso} className="mt-1" />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <Checkbox id="ativo" checked={data.ativo} onChange={(e) => setData('ativo', e.target.checked)} />
                            <InputLabel htmlFor="ativo" value="Ativo na Caixa de Promessas" />
                        </div>
                    </div>

                    {previewText && (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                            {previewText}
                        </div>
                    )}
                </form>
            </Modal>

            <Modal
                show={isImportOpen}
                onClose={() => {
                    setIsImportOpen(false);
                    setPreviewError('');
                }}
                maxWidth="lg"
                footer={
                    <SecondaryButton
                        type="button"
                        onClick={() => {
                            setIsImportOpen(false);
                            setPreviewError('');
                        }}
                    >
                        Fechar
                    </SecondaryButton>
                }
            >
                <div className="space-y-5 px-5 py-6 sm:px-7">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Importar promessas</h2>
                        <p className="mt-1 text-sm text-zinc-500">
                            Escolha uma fonte, gere a prévia e confirme o que deseja importar.
                        </p>
                    </div>

                    {!bibleReady && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                            Importe a Bíblia no sistema antes de usar estas ferramentas.
                        </div>
                    )}

                    {previewError && !isPreviewOpen && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                            {previewError}
                        </div>
                    )}

                    <Card className="p-4">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Versículos populares</h3>
                        <p className="mt-1 text-sm text-zinc-500">
                            Lista curada com promessas conhecidas (João 3:16, Filipenses 4:13, Salmos 23, etc.).
                        </p>
                        <PrimaryButton type="button" className="mt-4" disabled={!bibleReady || previewLoading} onClick={runPopularPreview}>
                            Gerar prévia
                        </PrimaryButton>
                    </Card>

                    <Card className="p-4">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Varrer a Bíblia</h3>
                        <p className="mt-1 text-sm text-zinc-500">
                            Analisa todos os versículos importados e sugere apenas os devocionais com nota alta.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="scan-limit" value="Quantidade máxima" />
                                <TextInput id="scan-limit" type="number" min={1} max={200} className="mt-1 block w-full" value={scanData.limit} onChange={(e) => setScanData('limit', e.target.value)} />
                            </div>
                            <div>
                                <InputLabel htmlFor="scan-nota" value="Nota mínima" />
                                <TextInput id="scan-nota" type="number" min={6} max={10} className="mt-1 block w-full" value={scanData.min_nota} onChange={(e) => setScanData('min_nota', e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                                <PrimaryButton type="button" disabled={!bibleReady || previewLoading} className="inline-flex items-center gap-2" onClick={runScanPreview}>
                                    <ArrowPathIcon className="h-4 w-4" />
                                    Gerar prévia
                                </PrimaryButton>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
                                <SparklesIcon className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Busca com IA</h3>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Descreva o tipo de versículos que deseja. A IA sugere referências para você revisar antes de importar.
                                </p>
                            </div>
                        </div>

                        {!aiConfigured && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                                Configure <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">OPENAI_API_KEY</code> no servidor para ativar a busca com IA.
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <div>
                                <InputLabel htmlFor="ai-prompt" value="Prompt de busca" />
                                <Textarea
                                    id="ai-prompt"
                                    className="mt-1 block w-full"
                                    rows={4}
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Ex.: versículos sobre paz, confiança em Deus e esperança para momentos difíceis"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
                                <div>
                                    <InputLabel htmlFor="ai-limit" value="Quantidade sugerida" />
                                    <TextInput
                                        id="ai-limit"
                                        type="number"
                                        min={1}
                                        max={20}
                                        className="mt-1 block w-full"
                                        value={aiLimit}
                                        onChange={(e) => setAiLimit(e.target.value)}
                                    />
                                </div>
                            </div>

                            <PrimaryButton
                                type="button"
                                disabled={!aiConfigured || !bibleReady || previewLoading}
                                className="inline-flex items-center gap-2"
                                onClick={runAiPreview}
                            >
                                <SparklesIcon className="h-4 w-4" aria-hidden />
                                {previewLoading ? 'Gerando prévia…' : 'Gerar prévia com IA'}
                            </PrimaryButton>
                        </div>
                    </Card>
                </div>
            </Modal>

            <Modal
                show={isPreviewOpen}
                onClose={resetPreview}
                maxWidth="lg"
                footer={
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                        <SecondaryButton type="button" onClick={resetPreview}>
                            Voltar
                        </SecondaryButton>
                        <PrimaryButton type="button" disabled={previewSelectedCount === 0 || previewImporting} onClick={importPreviewSelected}>
                            {previewImporting ? 'Importando…' : `Importar selecionados (${previewSelectedCount})`}
                        </PrimaryButton>
                    </div>
                }
            >
                <div className="space-y-4 px-5 py-6 sm:px-7">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Prévia da importação</h2>
                        <p className="mt-1 text-sm text-zinc-500">{previewTitle}</p>
                    </div>

                    {previewSummary && (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                            Sugeridos: {previewSummary.suggested} · Novos: {previewSummary.ready} · Duplicatas: {previewSummary.duplicate} · Não
                            encontrados: {previewSummary.missing}
                            {previewScanned !== null ? ` · Versículos analisados: ${previewScanned}` : ''}
                        </div>
                    )}

                    {previewItems.length === 0 ? (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
                            Nenhum registro encontrado para importar.
                        </div>
                    ) : (
                        <ul className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto pr-1">
                            {previewItems.map((item) => (
                                <li key={item.key} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id={`preview-${item.key}`}
                                            checked={item.selected}
                                            disabled={item.status !== 'ready'}
                                            onChange={(e) => togglePreviewItem(item.key, e.target.checked)}
                                            className="mt-1"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item.ref}</p>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                        item.status === 'ready'
                                                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                            : item.status === 'duplicate'
                                                              ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                                                    }`}
                                                >
                                                    {previewStatusLabel(item.status)}
                                                </span>
                                                <span className="text-[11px] font-medium text-zinc-500">{item.categoria}</span>
                                            </div>
                                            {item.textPreview ? (
                                                <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{item.textPreview}</p>
                                            ) : (
                                                <p className="mt-2 text-sm italic text-zinc-400">Texto não encontrado na Bíblia importada.</p>
                                            )}
                                            {item.motivo && (
                                                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Motivo: {item.motivo}</p>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
