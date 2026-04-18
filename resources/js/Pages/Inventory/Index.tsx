import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import {
    PencilIcon,
    TrashIcon,
    ArchiveBoxIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    CameraIcon,
    XMarkIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Html5Qrcode } from 'html5-qrcode';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import InputError from '@/Components/InputError';
import { useState, useEffect, useRef, FormEventHandler } from 'react';
import axios from 'axios';
import { confirmAction } from '@/utils/confirmDialog';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import SelectInput from '@/Components/SelectInput';

const DESKTOP_BARCODE_SCANNER_ID = 'inventory-desktop-barcode-scanner';

interface InventoryItem {
    id: number;
    barcode: string;
    serial_number: string | null;
    name: string;
    description: string | null;
    location: string | null;
    category: string | null;
    brand: string | null;
    item_type: string | null;
    classification: string | null;
    acquisition_date: string | null;
    acquisition_value: string | null;
    current_value: string | null;
    status: string;
    movements_count: number;
    photo_url?: string | null;
}

interface Movement {
    id: number;
    type: string;
    type_label: string;
    from_location: string | null;
    to_location: string | null;
    notes: string | null;
    user_name: string | null;
    created_at: string;
}

interface Props {
    items: InventoryItem[];
    filters: { search?: string };
}

function photoSrc(url: string | null | undefined, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

export default function Index({ items, filters }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    const [history, setHistory] = useState<Movement[]>([]);
    const [search, setSearch] = useState(filters.search ?? '');
    const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
    const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
    const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
    /** `search` = filtrar a lista; `form` = preencher código no modal de item */
    const [barcodeScanPurpose, setBarcodeScanPurpose] = useState<'form' | 'search'>('form');
    const [barcodeCameraError, setBarcodeCameraError] = useState<string | null>(null);
    const barcodeScannerRef = useRef<Html5Qrcode | null>(null);
    const barcodeScanHandledRef = useRef(false);
    const barcodeScanPurposeRef = useRef<'form' | 'search'>('form');
    const skipSearchDebounceRef = useRef(false);
    const setBarcodeFromScanRef = useRef((_: string) => {});
    /** Em telemóvel fica fechado por defeito; em md+ abre ao criar (ver openCreateModal) */
    const [inventoryOptionalOpen, setInventoryOptionalOpen] = useState(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        barcode: '',
        serial_number: '',
        name: '',
        description: '',
        location: '',
        category: '',
        brand: '',
        item_type: '',
        classification: '',
        acquisition_date: '',
        acquisition_value: '',
        current_value: '',
        status: 'active',
        photo: null as File | null,
    });

    setBarcodeFromScanRef.current = (code: string) => {
        const trimmed = code.trim();
        if (barcodeScanPurposeRef.current === 'search') {
            skipSearchDebounceRef.current = true;
            setSearch(trimmed);
            router.get(route('inventory.index'), { search: trimmed }, { preserveState: true, replace: true });
        } else {
            setData('barcode', trimmed);
        }
    };

    useEffect(() => {
        if (!barcodeScannerOpen) return;

        barcodeScanHandledRef.current = false;
        setBarcodeCameraError(null);

        const start = async () => {
            try {
                const html5QrCode = new Html5Qrcode(DESKTOP_BARCODE_SCANNER_ID);
                barcodeScannerRef.current = html5QrCode;
                const w = typeof window !== 'undefined' ? Math.min(360, window.innerWidth - 48) : 320;
                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: w, height: Math.round(w * 0.45) },
                    },
                    (decodedText) => {
                        if (barcodeScanHandledRef.current) return;
                        barcodeScanHandledRef.current = true;
                        html5QrCode
                            .stop()
                            .then(() => html5QrCode.clear())
                            .catch(() => {})
                            .finally(() => {
                                barcodeScannerRef.current = null;
                                setBarcodeScannerOpen(false);
                                setBarcodeFromScanRef.current(decodedText.trim());
                            });
                    },
                    () => {},
                );
            } catch (err) {
                const msg =
                    err instanceof Error
                        ? err.message
                        : 'Não foi possível usar a câmara. Verifique as permissões ou use HTTPS.';
                setBarcodeCameraError(msg);
                setBarcodeScannerOpen(false);
            }
        };

        const t = window.setTimeout(() => void start(), 0);

        return () => {
            window.clearTimeout(t);
            const h = barcodeScannerRef.current;
            barcodeScannerRef.current = null;
            if (h) {
                h.stop()
                    .then(() => h.clear())
                    .catch(() => {});
            }
        };
    }, [barcodeScannerOpen]);

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setExistingPhotoUrl(null);
        setBarcodeScannerOpen(false);
        reset();
        clearErrors();
        setInventoryOptionalOpen(
            typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
        );
        setIsModalOpen(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setIsEditing(true);
        setEditingId(item.id);
        setBarcodeScannerOpen(false);
        setInventoryOptionalOpen(true);
        setExistingPhotoUrl(item.photo_url ?? null);
        setData({
            barcode: item.barcode,
            serial_number: item.serial_number ?? '',
            name: item.name,
            description: item.description ?? '',
            location: item.location ?? '',
            category: item.category ?? '',
            brand: item.brand ?? '',
            item_type: item.item_type ?? '',
            classification: item.classification ?? '',
            acquisition_date: item.acquisition_date ? item.acquisition_date.split('T')[0] : '',
            acquisition_value: item.acquisition_value ?? '',
            current_value: item.current_value ?? '',
            status: item.status || 'active',
            photo: null,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setBarcodeScannerOpen(false);
        setInventoryOptionalOpen(false);
        setExistingPhotoUrl(null);
        reset();
    };

    useEffect(() => {
        const f = data.photo;
        if (!f) {
            setNewPhotoPreview(null);
            return;
        }
        const url = URL.createObjectURL(f);
        setNewPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [data.photo]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('inventory.update', editingId), {
                forceFormData: true,
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('inventory.store'), {
                forceFormData: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir item do inventário?',
            text: 'O histórico de movimentos também será removido. Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('inventory.destroy', id));
        }
    };

    const openHistory = (item: InventoryItem) => {
        setHistoryItem(item);
        setHistoryModalOpen(true);
        setHistory([]);
        axios.get(route('inventory.history', item.id)).then((res) => {
            setHistory(res.data.movements ?? []);
        });
    };

    const formatDate = (s: string) => {
        return new Date(s).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    };

    useEffect(() => {
        if (search === (filters.search ?? '')) {
            return;
        }
        if (skipSearchDebounceRef.current) {
            skipSearchDebounceRef.current = false;
            return;
        }
        const timeout = setTimeout(() => {
            router.get(
                route('inventory.index'),
                { search },
                {
                    preserveState: true,
                    replace: true,
                },
            );
        }, 400);
        return () => clearTimeout(timeout);
    }, [search, filters.search]);

    return (
        <AdminLayout>
            <Head title="Inventário" />
            <PageHeader title="Inventário">
                <AddButton onClick={openCreateModal}>Novo Item</AddButton>
            </PageHeader>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Gerencie os objetos da igreja com código de barras. Use a busca para encontrar por código ou nome e visualize o histórico de cada item.
            </p>

            <div className="mb-6">
                <div className="relative max-w-md flex items-stretch gap-2">
                    <div className="relative flex-1 min-w-0">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none z-10" />
                        <input
                            type="search"
                            name="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por código de barras ou nome..."
                            className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                barcodeScanPurposeRef.current = 'search';
                                setBarcodeScanPurpose('search');
                                setBarcodeCameraError(null);
                                setBarcodeScannerOpen(true);
                            }}
                            className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title="Ler código de barras com a câmara e buscar"
                            aria-label="Ler código de barras com a câmara e buscar"
                        >
                            <CameraIcon className="h-5 w-5" aria-hidden />
                        </button>
                    </div>
                </div>
                {barcodeScanPurpose === 'search' && barcodeCameraError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                        {barcodeCameraError}
                    </p>
                )}
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Código / Série</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nome</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">Categoria / Marca</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Localização</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Histórico</th>
                                <th className="px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-sm text-zinc-900 dark:text-white">{item.barcode}</span>
                                        {item.serial_number && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.serial_number}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="font-medium text-zinc-900 dark:text-white">{item.name}</span>
                                        {item.description && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{item.description}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300 hidden lg:table-cell">
                                        {[item.category, item.brand].filter(Boolean).join(' • ') || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300">{item.location ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <button
                                            type="button"
                                            onClick={() => openHistory(item)}
                                            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                        >
                                            <ClockIcon className="w-4 h-4" />
                                            {item.movements_count} {item.movements_count === 1 ? 'movimento' : 'movimentos'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(item)}
                                                className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                title="Excluir"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {items.length === 0 && (
                    <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                        {filters.search ? 'Nenhum item encontrado para esta busca.' : 'Nenhum item cadastrado. Clique em \"Novo Item\" para começar.'}
                    </div>
                )}
            </div>

            <Modal show={isModalOpen} onClose={closeModal}>
                <form
                    onSubmit={submit}
                    className="flex max-h-[min(92dvh,56rem)] flex-col overflow-hidden sm:max-h-[min(90dvh,900px)]"
                >
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 md:mb-5">
                            {isEditing ? 'Editar item' : 'Novo item'}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 md:hidden">
                            Campos principais primeiro; os restantes ficam em «Outros campos».
                        </p>

                        <div className="rounded-2xl border-2 border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-600 dark:bg-zinc-900/80">
                            <p className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300 mb-4">
                                Campos principais
                            </p>
                            <div>
                                <InputLabel htmlFor="barcode" value="Código de barras" />
                                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start">
                                    <TextInput
                                        id="barcode"
                                        value={data.barcode}
                                        onChange={(e) => setData('barcode', e.target.value)}
                                        className="block w-full min-w-0 font-mono sm:flex-1"
                                        placeholder="Ex: 7891234567890"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            barcodeScanPurposeRef.current = 'form';
                                            setBarcodeScanPurpose('form');
                                            setBarcodeCameraError(null);
                                            setBarcodeScannerOpen(true);
                                        }}
                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 sm:py-2.5 md:hidden"
                                        title="Ler código de barras com a câmara (telemóvel)"
                                    >
                                        <CameraIcon className="h-5 w-5" aria-hidden />
                                        Ler com câmara
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span className="md:hidden">
                                        Toque em «Ler com câmara» para preencher pelo código de barras, ou digite no campo.
                                    </span>
                                    <span className="hidden md:inline">
                                        Digite o código de barras. A leitura com câmara aparece neste formulário em ecrã de telemóvel
                                        (ou use o inventário na app móvel).
                                    </span>
                                </p>
                                {barcodeCameraError && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                                        {barcodeCameraError}
                                    </p>
                                )}
                                <InputError message={errors.barcode} className="mt-1" />
                            </div>
                            <div className="mt-4">
                                <InputLabel htmlFor="serial_number" value="Número de série (opcional)" />
                                <TextInput
                                    id="serial_number"
                                    value={data.serial_number}
                                    onChange={(e) => setData('serial_number', e.target.value)}
                                    className="mt-1 block w-full font-mono"
                                    placeholder="Ex: 0A239QBW505407"
                                />
                                <InputError message={errors.serial_number} className="mt-1" />
                            </div>
                            <div className="mt-4">
                                <InputLabel htmlFor="name" value="Nome" />
                                <TextInput
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex: Projetor Epson"
                                />
                                <InputError message={errors.name} className="mt-1" />
                            </div>
                            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 p-3 dark:bg-zinc-950/40">
                                <InputLabel htmlFor="photo" value="Foto do objeto (opcional)" />
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-2">
                                    Tire uma foto ou escolha um ficheiro da galeria (telemóvel: pode usar a câmara).
                                </p>
                                <input
                                    id="photo"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="block w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:text-white dark:file:bg-zinc-200 dark:file:text-zinc-900"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        setData('photo', f ?? null);
                                    }}
                                />
                                <InputError message={errors.photo} className="mt-2" />
                                {(newPhotoPreview || (isEditing && existingPhotoUrl && !data.photo)) && (
                                    <div className="relative mt-3 rounded-lg border border-zinc-200 dark:border-zinc-600 overflow-hidden bg-white dark:bg-zinc-950 max-h-48">
                                        <img
                                            src={newPhotoPreview ?? photoSrc(existingPhotoUrl, appUrl)}
                                            alt=""
                                            className="w-full h-full max-h-48 object-contain"
                                        />
                                        {isEditing && existingPhotoUrl && !data.photo && !newPhotoPreview ? (
                                            <ImageDownloadButton
                                                src={photoSrc(existingPhotoUrl, appUrl)}
                                                appUrl={appUrl}
                                                filenameBase={`inventario-${data.barcode || editingId || 'item'}`}
                                                className="absolute bottom-2 right-2 z-10"
                                                size="sm"
                                            />
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setInventoryOptionalOpen((o) => !o)}
                                className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                <span>
                                    <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
                                        Outros campos
                                    </span>
                                    <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Localização, descrição, categoria, valores, estado…
                                    </span>
                                </span>
                                <ChevronDownIcon
                                    className={`h-6 w-6 shrink-0 text-zinc-500 transition-transform ${inventoryOptionalOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {inventoryOptionalOpen && (
                                <div className="px-4 pb-4 pt-0 space-y-4 border-t border-zinc-200 dark:border-zinc-800">
                                    <div>
                                        <InputLabel htmlFor="location" value="Localização (onde está o objeto)" />
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-1">
                                            Opcional — sala, armário, corredor, etc.
                                        </p>
                                        <TextInput
                                            id="location"
                                            value={data.location}
                                            onChange={(e) => setData('location', e.target.value)}
                                            className="mt-1 block w-full"
                                            placeholder="Ex: Sala de reuniões 1, depósito"
                                        />
                                        <InputError message={errors.location} className="mt-1" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="description" value="Descrição (opcional)" />
                                        <textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={2}
                                            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                                            placeholder="Detalhes do item"
                                        />
                                        <InputError message={errors.description} className="mt-1" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <InputLabel htmlFor="category" value="Categoria (opcional)" />
                                            <TextInput
                                                id="category"
                                                value={data.category}
                                                onChange={(e) => setData('category', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="Ex: Eletrônicos"
                                            />
                                            <InputError message={errors.category} className="mt-1" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="brand" value="Marca (opcional)" />
                                            <TextInput
                                                id="brand"
                                                value={data.brand}
                                                onChange={(e) => setData('brand', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="Ex: Yamaha"
                                            />
                                            <InputError message={errors.brand} className="mt-1" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <InputLabel htmlFor="item_type" value="Tipo (opcional)" />
                                            <TextInput
                                                id="item_type"
                                                value={data.item_type}
                                                onChange={(e) => setData('item_type', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="Ex: Mesa de som"
                                            />
                                            <InputError message={errors.item_type} className="mt-1" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="classification" value="Classificação (opcional)" />
                                            <TextInput
                                                id="classification"
                                                value={data.classification}
                                                onChange={(e) => setData('classification', e.target.value)}
                                                className="mt-1 block w-full"
                                                placeholder="Ex: Básico, Franquia"
                                            />
                                            <InputError message={errors.classification} className="mt-1" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <InputLabel htmlFor="acquisition_date" value="Data de aquisição" />
                                            <TextInput
                                                id="acquisition_date"
                                                type="date"
                                                value={data.acquisition_date}
                                                onChange={(e) => setData('acquisition_date', e.target.value)}
                                                className="mt-1 block w-full"
                                            />
                                            <InputError message={errors.acquisition_date} className="mt-1" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="acquisition_value" value="Valor de compra (R$)" />
                                            <TextInput
                                                id="acquisition_value"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.acquisition_value}
                                                onChange={(e) => setData('acquisition_value', e.target.value)}
                                                className="mt-1 block w-full"
                                            />
                                            <InputError message={errors.acquisition_value} className="mt-1" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="current_value" value="Valor atual (R$)" />
                                            <TextInput
                                                id="current_value"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.current_value}
                                                onChange={(e) => setData('current_value', e.target.value)}
                                                className="mt-1 block w-full"
                                            />
                                            <InputError message={errors.current_value} className="mt-1" />
                                        </div>
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="status" value="Status" />
                                        <SelectInput
                                            id="status"
                                            className="mt-1"
                                            value={data.status}
                                            onChange={(e) => setData('status', e.target.value)}
                                        >
                                            <option value="active">Ativo</option>
                                            <option value="inactive">Inativo</option>
                                            <option value="maintenance">Em manutenção</option>
                                            <option value="disposed">Baixado</option>
                                        </SelectInput>
                                        <InputError message={errors.status} className="mt-1" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
                        <div className="flex justify-end gap-2">
                            <SecondaryButton type="button" onClick={closeModal}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing}>
                                {isEditing ? 'Salvar' : 'Cadastrar'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal show={historyModalOpen} onClose={() => setHistoryModalOpen(false)}>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Histórico do item</h2>
                    {historyItem && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                            {historyItem.name} — <span className="font-mono">{historyItem.barcode}</span>
                        </p>
                    )}
                    <div className="max-h-80 overflow-y-auto space-y-3">
                        {history.length === 0 && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
                        )}
                        {history.map((m) => (
                            <div
                                key={m.id}
                                className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-sm"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-zinc-900 dark:text-white">{m.type_label}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(m.created_at)}</span>
                                </div>
                                {(m.from_location || m.to_location) && (
                                    <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                                        {m.from_location && <>De: {m.from_location}</>}
                                        {m.from_location && m.to_location && ' → '}
                                        {m.to_location && <>Para: {m.to_location}</>}
                                    </p>
                                )}
                                {m.notes && (
                                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">{m.notes}</p>
                                )}
                                {m.user_name && (
                                    <p className="mt-1 text-xs text-zinc-400">Por: {m.user_name}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <SecondaryButton type="button" onClick={() => setHistoryModalOpen(false)}>Fechar</SecondaryButton>
                    </div>
                </div>
            </Modal>

            {barcodeScannerOpen && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col bg-black"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Leitor de código de barras"
                >
                    <div className="flex items-center justify-between p-4 text-white">
                        <span className="font-semibold">
                            {barcodeScanPurpose === 'search'
                                ? 'Buscar pela leitura do código'
                                : 'Aponte a câmara para o código'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setBarcodeScannerOpen(false)}
                            className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                            aria-label="Fechar leitor"
                        >
                            <XMarkIcon className="h-8 w-8" />
                        </button>
                    </div>
                    <div className="flex flex-1 items-center justify-center px-4 pb-8">
                        <div
                            id={DESKTOP_BARCODE_SCANNER_ID}
                            className="w-full max-w-md min-h-[240px] overflow-hidden rounded-2xl bg-zinc-900"
                        />
                    </div>
                    <p className="px-6 pb-8 text-center text-sm text-white/80">
                        Em telemóveis usa a câmara traseira; no computador pode pedir acesso à webcam.
                    </p>
                </div>
            )}
        </AdminLayout>
    );
}
