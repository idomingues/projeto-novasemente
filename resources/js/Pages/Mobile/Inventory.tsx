import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import {
    ArrowLeftIcon,
    CameraIcon,
    MagnifyingGlassIcon,
    QrCodeIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

const SCANNER_ELEMENT_ID = 'inventory-barcode-scanner';

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
}

interface ListItem {
    id: number;
    barcode: string;
    name: string;
    location: string | null;
    status: string;
    photo_url: string | null;
    movements_count: number;
}

interface LookupFound {
    found: true;
    item: {
        id: number;
        barcode: string;
        name: string;
        description: string | null;
        location: string | null;
        category: string | null;
        brand: string | null;
        status: string;
        photo_url: string | null;
        movements_count: number;
    };
}

interface LookupNotFound {
    found: false;
    barcode?: string;
    message?: string;
}

type LookupState = LookupFound | LookupNotFound | null;

interface Props {
    items: ListItem[];
    filters: { search?: string };
    canManage: boolean;
}

const statusLabel: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    maintenance: 'Manutenção',
    disposed: 'Baixado',
};

export default function MobileInventory({ items, filters, canManage }: Props) {
    const page = usePage();
    const appUrl = (page.props as { appUrl?: string }).appUrl ?? '';
    const [search, setSearch] = useState(filters.search ?? '');
    const [scannerOpen, setScannerOpen] = useState(false);
    /** `lookup` = após leitura consulta API; `register` = preenche só o código no formulário de cadastro */
    const [scannerMode, setScannerMode] = useState<'lookup' | 'register'>('lookup');
    const [lookup, setLookup] = useState<LookupState>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scanHandledRef = useRef(false);
    const lookupBarcodeRef = useRef<(code: string) => Promise<void>>(async () => {});
    const registerSetBarcodeRef = useRef((_: string) => {});

    const registerForm = useForm({
        barcode: '',
        name: '',
        location: '',
        category: '',
        serial_number: '',
        description: '',
        brand: '',
        item_type: '',
        classification: '',
        acquisition_date: '',
        acquisition_value: '',
        current_value: '',
        status: 'active',
        photo: null as File | null,
        return_to: 'mobile' as const,
    });

    async function lookupBarcode(code: string) {
        const trimmed = code.trim();
        if (!trimmed) return;
        setLookupLoading(true);
        setLookupError(null);
        setLookup(null);
        try {
            const { data } = await axios.get<LookupFound | LookupNotFound>(route('inventory.lookup'), {
                params: { barcode: trimmed },
            });
            setLookup(data);
            if (!data.found && canManage) {
                registerForm.setData({
                    barcode: data.barcode ?? trimmed,
                    name: '',
                    location: '',
                    category: '',
                    serial_number: '',
                    description: '',
                    brand: '',
                    item_type: '',
                    classification: '',
                    acquisition_date: '',
                    acquisition_value: '',
                    current_value: '',
                    status: 'active',
                    photo: null,
                    return_to: 'mobile',
                });
            }
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 403) {
                setLookupError('Sem permissão para consultar o inventário.');
            } else {
                setLookupError('Não foi possível consultar o código. Tente novamente.');
            }
        } finally {
            setLookupLoading(false);
        }
    }

    lookupBarcodeRef.current = lookupBarcode;
    registerSetBarcodeRef.current = (code: string) => {
        registerForm.setData('barcode', code);
    };

    useEffect(() => {
        if (!scannerOpen) return;

        scanHandledRef.current = false;
        setCameraError(null);

        const start = async () => {
            try {
                const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID);
                scannerRef.current = html5QrCode;
                const w = typeof window !== 'undefined' ? Math.min(300, window.innerWidth - 48) : 280;
                const mode = scannerMode;
                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: w, height: Math.round(w * 0.45) },
                    },
                    (decodedText) => {
                        if (scanHandledRef.current) return;
                        scanHandledRef.current = true;
                        html5QrCode
                            .stop()
                            .then(() => html5QrCode.clear())
                            .catch(() => {})
                            .finally(() => {
                                scannerRef.current = null;
                                setScannerOpen(false);
                                const trimmed = decodedText.trim();
                                if (mode === 'register') {
                                    registerSetBarcodeRef.current(trimmed);
                                } else {
                                    void lookupBarcodeRef.current(decodedText);
                                }
                            });
                    },
                    () => {},
                );
            } catch (err) {
                const msg =
                    err instanceof Error
                        ? err.message
                        : 'Não foi possível usar a câmara. Verifique as permissões.';
                setCameraError(msg);
                setScannerOpen(false);
            }
        };

        const t = window.setTimeout(() => void start(), 0);

        return () => {
            window.clearTimeout(t);
            const h = scannerRef.current;
            scannerRef.current = null;
            if (h) {
                h.stop()
                    .then(() => h.clear())
                    .catch(() => {});
            }
        };
    }, [scannerOpen, scannerMode]);

    const [registerPhotoPreview, setRegisterPhotoPreview] = useState<string | null>(null);
    useEffect(() => {
        const f = registerForm.data.photo;
        if (!f) {
            setRegisterPhotoPreview(null);
            return;
        }
        const url = URL.createObjectURL(f);
        setRegisterPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [registerForm.data.photo]);

    const openLookupScanner = () => {
        setLookup(null);
        setLookupError(null);
        setCameraError(null);
        setScannerMode('lookup');
        setScannerOpen(true);
    };

    const openRegisterScanner = () => {
        setCameraError(null);
        setScannerMode('register');
        setScannerOpen(true);
    };

    const submitRegister: FormEventHandler = (e) => {
        e.preventDefault();
        registerForm.post(route('inventory.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                registerForm.reset();
                setLookup(null);
            },
        });
    };

    const applySearch = () => {
        router.get(
            route('mobile.inventory'),
            { search: search.trim() || undefined },
            { preserveState: true, replace: true },
        );
    };

    return (
        <MobileLayout>
            <Head title="Inventário" />
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('mobile.more')}
                        className="p-2 -ml-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label="Voltar"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Inventário</h1>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Use a câmara do telemóvel para ler o código de barras ou pesquise manualmente.
                    </p>
                    <button
                        type="button"
                        onClick={openLookupScanner}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-3 font-semibold active:scale-[0.99] transition-transform"
                    >
                        <CameraIcon className="w-6 h-6" />
                        Ler código de barras
                    </button>
                    {cameraError && (
                        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                            {cameraError}
                        </p>
                    )}
                </div>

                {scannerOpen && (
                    <div className="fixed inset-0 z-50 bg-black flex flex-col">
                        <div className="flex items-center justify-between p-4 text-white">
                            <span className="font-semibold">
                                {scannerMode === 'register'
                                    ? 'Leia o código de barras do objeto'
                                    : 'Aponte para o código'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setScannerOpen(false)}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="w-8 h-8" />
                            </button>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4 pb-8">
                            <div
                                id={SCANNER_ELEMENT_ID}
                                className="w-full max-w-md min-h-[240px] overflow-hidden rounded-2xl bg-zinc-900"
                            />
                        </div>
                        <p className="text-center text-white/80 text-sm px-6 pb-8">
                            A câmara traseira é usada por defeito. Autorize o acesso se o browser pedir.
                        </p>
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder="Pesquisar nome, código ou série…"
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={applySearch}
                        className="px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium text-zinc-800 dark:text-zinc-200 dark:bg-zinc-800"
                    >
                        Buscar
                    </button>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
                    <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        <QrCodeIcon className="w-5 h-5 text-zinc-500" />
                        Consulta por código
                    </h2>
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const code = String(fd.get('manualBarcode') ?? '');
                            void lookupBarcode(code);
                        }}
                    >
                        <input
                            name="manualBarcode"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="Digite ou cole o código"
                            className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={lookupLoading}
                            className="px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-white disabled:opacity-50"
                        >
                            {lookupLoading ? '…' : 'Consultar'}
                        </button>
                    </form>
                </div>

                {lookupError && (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                        {lookupError}
                    </p>
                )}

                {lookup?.found && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 space-y-3">
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            Item encontrado
                        </p>
                        {lookup.item.photo_url && (
                            <div className="aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                <img
                                    src={imageSrc(lookup.item.photo_url, appUrl)}
                                    alt=""
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        )}
                        <dl className="space-y-1 text-sm">
                            <div>
                                <dt className="text-zinc-500 dark:text-zinc-400">Nome</dt>
                                <dd className="font-medium text-zinc-900 dark:text-white">{lookup.item.name}</dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500 dark:text-zinc-400">Código</dt>
                                <dd className="font-mono text-zinc-800 dark:text-zinc-200">{lookup.item.barcode}</dd>
                            </div>
                            {lookup.item.location && (
                                <div>
                                    <dt className="text-zinc-500 dark:text-zinc-400">Local</dt>
                                    <dd>{lookup.item.location}</dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-zinc-500 dark:text-zinc-400">Estado</dt>
                                <dd>{statusLabel[lookup.item.status] ?? lookup.item.status}</dd>
                            </div>
                        </dl>
                        <button
                            type="button"
                            onClick={() => setLookup(null)}
                            className="text-sm font-medium text-emerald-800 dark:text-emerald-300 underline"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                {lookup && !lookup.found && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-3">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                            {lookup.message ?? 'Nenhum item com este código.'}
                        </p>
                        {canManage && (
                            <form onSubmit={submitRegister} className="space-y-3 pt-2 border-t border-amber-200/80 dark:border-amber-800/60">
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Preencha primeiro o <strong className="font-semibold">código</strong> e o{' '}
                                    <strong className="font-semibold">nome</strong>. Foto e outros dados ficam num bloco
                                    opcional abaixo para o ecrã ficar mais curto.
                                </p>

                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 p-3 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        Dados básicos (obrigatórios)
                                    </p>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                            Código de barras
                                        </label>
                                        <button
                                            type="button"
                                            onClick={openRegisterScanner}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-2.5 text-sm font-semibold active:scale-[0.99] transition-transform"
                                        >
                                            <CameraIcon className="w-5 h-5" />
                                            Ler código (câmara)
                                        </button>
                                        {registerForm.data.barcode ? (
                                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                                <span className="font-mono font-medium text-zinc-900 dark:text-white">
                                                    {registerForm.data.barcode}
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                                                Leia o código ou digite manualmente na caixa em baixo.
                                            </p>
                                        )}
                                        <details className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50/80 dark:bg-zinc-950/40">
                                            <summary className="px-2.5 py-2 cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400 list-none [&::-webkit-details-marker]:hidden">
                                                Digitar código manualmente (se não conseguir ler)
                                            </summary>
                                            <div className="px-2.5 pb-2.5 pt-0">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    value={registerForm.data.barcode}
                                                    onChange={(e) => registerForm.setData('barcode', e.target.value)}
                                                    placeholder="Código"
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm"
                                                />
                                            </div>
                                        </details>
                                        {registerForm.errors.barcode && (
                                            <p className="text-sm text-red-600">{registerForm.errors.barcode}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                            Nome do item
                                        </label>
                                        <input
                                            type="text"
                                            value={registerForm.data.name}
                                            onChange={(e) => registerForm.setData('name', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                            required
                                        />
                                        {registerForm.errors.name && (
                                            <p className="text-sm text-red-600">{registerForm.errors.name}</p>
                                        )}
                                    </div>
                                </div>

                                <details className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/30 group">
                                    <summary className="px-3 py-2.5 cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 list-none flex flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                                        <span>Detalhes opcionais</span>
                                        <span className="text-xs font-normal text-zinc-500">foto, local, notas…</span>
                                    </summary>
                                    <div className="px-3 pb-3 pt-0 space-y-3 border-t border-zinc-200/80 dark:border-zinc-800">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                Foto do objeto
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:bg-zinc-900 file:text-white dark:file:bg-zinc-200 dark:file:text-zinc-900"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    registerForm.setData('photo', f ?? null);
                                                }}
                                            />
                                            {registerPhotoPreview && (
                                                <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 max-h-40">
                                                    <img
                                                        src={registerPhotoPreview}
                                                        alt=""
                                                        className="w-full h-full max-h-40 object-contain"
                                                    />
                                                </div>
                                            )}
                                            {registerForm.errors.photo && (
                                                <p className="text-sm text-red-600">{registerForm.errors.photo}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                Local
                                            </label>
                                            <input
                                                type="text"
                                                value={registerForm.data.location}
                                                onChange={(e) => registerForm.setData('location', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                Descrição
                                            </label>
                                            <textarea
                                                value={registerForm.data.description}
                                                onChange={(e) => registerForm.setData('description', e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm resize-y min-h-[2.75rem]"
                                            />
                                            {registerForm.errors.description && (
                                                <p className="text-sm text-red-600">{registerForm.errors.description}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    N.º de série
                                                </label>
                                                <input
                                                    type="text"
                                                    value={registerForm.data.serial_number}
                                                    onChange={(e) =>
                                                        registerForm.setData('serial_number', e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                                />
                                                {registerForm.errors.serial_number && (
                                                    <p className="text-sm text-red-600">
                                                        {registerForm.errors.serial_number}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    Categoria
                                                </label>
                                                <input
                                                    type="text"
                                                    value={registerForm.data.category}
                                                    onChange={(e) => registerForm.setData('category', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    Marca
                                                </label>
                                                <input
                                                    type="text"
                                                    value={registerForm.data.brand}
                                                    onChange={(e) => registerForm.setData('brand', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    Tipo
                                                </label>
                                                <input
                                                    type="text"
                                                    value={registerForm.data.item_type}
                                                    onChange={(e) => registerForm.setData('item_type', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                Classificação
                                            </label>
                                            <input
                                                type="text"
                                                value={registerForm.data.classification}
                                                onChange={(e) =>
                                                    registerForm.setData('classification', e.target.value)
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="space-y-1.5 sm:col-span-1">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    Data aquisição
                                                </label>
                                                <input
                                                    type="date"
                                                    value={registerForm.data.acquisition_date}
                                                    onChange={(e) =>
                                                        registerForm.setData('acquisition_date', e.target.value)
                                                    }
                                                    className="w-full px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    Valor aquisição
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={registerForm.data.acquisition_value}
                                                    onChange={(e) =>
                                                        registerForm.setData('acquisition_value', e.target.value)
                                                    }
                                                    className="w-full px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    Valor atual
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={registerForm.data.current_value}
                                                    onChange={(e) =>
                                                        registerForm.setData('current_value', e.target.value)
                                                    }
                                                    className="w-full px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                Estado
                                            </label>
                                            <select
                                                value={registerForm.data.status}
                                                onChange={(e) => registerForm.setData('status', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                                            >
                                                <option value="active">Ativo</option>
                                                <option value="inactive">Inativo</option>
                                                <option value="maintenance">Manutenção</option>
                                                <option value="disposed">Baixado</option>
                                            </select>
                                            {registerForm.errors.status && (
                                                <p className="text-sm text-red-600">{registerForm.errors.status}</p>
                                            )}
                                        </div>
                                    </div>
                                </details>

                                <button
                                    type="submit"
                                    disabled={registerForm.processing || !registerForm.data.barcode.trim()}
                                    className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold disabled:opacity-50"
                                >
                                    {registerForm.processing ? 'A guardar…' : 'Cadastrar item'}
                                </button>
                            </form>
                        )}
                        <button
                            type="button"
                            onClick={() => setLookup(null)}
                            className="text-sm font-medium text-amber-900 dark:text-amber-200 underline"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                <div>
                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                        Itens ({items.length})
                    </h2>
                    {items.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
                            Nenhum item encontrado com este filtro.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {items.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                >
                                    <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
                                        {item.photo_url ? (
                                            <img
                                                src={imageSrc(item.photo_url, appUrl)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                                                —
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-zinc-900 dark:text-white truncate">{item.name}</p>
                                        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{item.barcode}</p>
                                        {item.location && (
                                            <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">
                                                {item.location}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}
