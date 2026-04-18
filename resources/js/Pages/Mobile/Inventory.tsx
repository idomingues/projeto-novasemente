import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import {
    ArrowLeftIcon,
    CameraIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    PlusCircleIcon,
    QrCodeIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import ImageDownloadButton from '@/Components/ImageDownloadButton';
import SelectInput from '@/Components/SelectInput';

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
    /** `lookup` = após leitura consulta API; `register` = preenche só o código no formulário; `listSearch` = filtra a lista */
    const [scannerMode, setScannerMode] = useState<'lookup' | 'register' | 'listSearch'>('lookup');
    const [lookup, setLookup] = useState<LookupState>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    /** Cadastro sem passar pela consulta (só quem pode gerir inventário) */
    const [standaloneRegister, setStandaloneRegister] = useState(false);
    /** Acordeão nativo (details) em muitos telemóveis não abre bem; usamos botões + estado */
    const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(false);
    const [manualBarcodeOpen, setManualBarcodeOpen] = useState(false);
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
                setStandaloneRegister(false);
                setOptionalDetailsOpen(false);
                setManualBarcodeOpen(false);
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
            if (data.found) {
                setStandaloneRegister(false);
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
                                } else if (mode === 'listSearch') {
                                    setSearch(trimmed);
                                    router.get(
                                        route('mobile.inventory'),
                                        { search: trimmed },
                                        { preserveState: true, replace: true },
                                    );
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

    const emptyRegisterPayload = {
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
    };

    const openNewItemForm = () => {
        setLookup(null);
        setLookupError(null);
        setStandaloneRegister(true);
        setOptionalDetailsOpen(false);
        setManualBarcodeOpen(false);
        registerForm.setData(emptyRegisterPayload);
    };

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

    const openListSearchScanner = () => {
        setCameraError(null);
        setScannerMode('listSearch');
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
                setStandaloneRegister(false);
                setOptionalDetailsOpen(false);
                setManualBarcodeOpen(false);
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

                {canManage && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/25 p-4 space-y-2">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Cadastrar um item novo
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Abre o formulário com <strong className="font-semibold">dados básicos</strong> visíveis e os
                            restantes campos dentro de <strong className="font-semibold">«Mais opções»</strong> (toque para
                            expandir).
                        </p>
                        <button
                            type="button"
                            onClick={openNewItemForm}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 dark:bg-emerald-600 text-white px-4 py-3 font-semibold active:scale-[0.99] transition-transform"
                        >
                            <PlusCircleIcon className="w-6 h-6 shrink-0" />
                            Novo item
                        </button>
                    </div>
                )}

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
                                    : scannerMode === 'listSearch'
                                      ? 'Buscar pela leitura do código'
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
                    <div className="relative flex-1 min-w-0">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 z-10 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder="Pesquisar nome, código ou série…"
                            className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400"
                        />
                        <button
                            type="button"
                            onClick={openListSearchScanner}
                            className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title="Ler código de barras e pesquisar na lista"
                            aria-label="Ler código de barras e pesquisar na lista"
                        >
                            <CameraIcon className="w-5 h-5" aria-hidden />
                        </button>
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
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                <img
                                    src={imageSrc(lookup.item.photo_url, appUrl)}
                                    alt=""
                                    className="w-full h-full object-contain"
                                />
                                <ImageDownloadButton
                                    src={imageSrc(lookup.item.photo_url, appUrl)}
                                    appUrl={appUrl}
                                    filenameBase={`inventario-${lookup.item.barcode}`}
                                    className="absolute bottom-2 right-2 z-10"
                                    size="sm"
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

                {canManage &&
                    !lookup?.found &&
                    (standaloneRegister || (lookup && !lookup.found)) && (
                    <div
                        className={`rounded-2xl border p-4 space-y-3 ${
                            lookup && !lookup.found
                                ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30'
                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm'
                        }`}
                    >
                        {lookup && !lookup.found && (
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                {lookup.message ?? 'Nenhum item com este código.'}
                            </p>
                        )}
                        {standaloneRegister && (
                            <div className="flex items-start gap-2">
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 min-w-0">
                                    <strong className="font-semibold">Passo 1:</strong> código e nome.{' '}
                                    <strong className="font-semibold">Passo 2:</strong> toque em{' '}
                                    <span className="whitespace-nowrap">«Outros campos»</span> para foto, local e
                                    detalhes adicionais.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setStandaloneRegister(false)}
                                    className="shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-400 underline py-1"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}

                        <form onSubmit={submitRegister} className="space-y-3 pt-1">
                                <div className="rounded-xl border-2 border-zinc-300 dark:border-zinc-600 bg-zinc-50/90 dark:bg-zinc-900/90 p-3 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                                        Campos principais
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
                                                Leia o código ou use «Digitar código» em baixo.
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setManualBarcodeOpen((o) => !o)}
                                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-zinc-400 dark:border-zinc-500 bg-white dark:bg-zinc-950 px-2.5 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300"
                                        >
                                            <span>Digitar código manualmente</span>
                                            <ChevronDownIcon
                                                className={`h-5 w-5 shrink-0 transition-transform ${manualBarcodeOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        {manualBarcodeOpen && (
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                value={registerForm.data.barcode}
                                                onChange={(e) => registerForm.setData('barcode', e.target.value)}
                                                placeholder="Código"
                                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm"
                                            />
                                        )}
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

                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/30 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setOptionalDetailsOpen((o) => !o)}
                                        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
                                    >
                                        <span>
                                            <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                                Outros campos (opcional)
                                            </span>
                                            <span className="block text-xs font-normal text-zinc-500 mt-0.5">
                                                Foto, local, descrição, valores, estado…
                                            </span>
                                        </span>
                                        <ChevronDownIcon
                                            className={`h-6 w-6 shrink-0 text-zinc-500 transition-transform ${optionalDetailsOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {optionalDetailsOpen && (
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
                                            <SelectInput
                                                value={registerForm.data.status}
                                                onChange={(e) => registerForm.setData('status', e.target.value)}
                                                className="w-full"
                                            >
                                                <option value="active">Ativo</option>
                                                <option value="inactive">Inativo</option>
                                                <option value="maintenance">Manutenção</option>
                                                <option value="disposed">Baixado</option>
                                            </SelectInput>
                                            {registerForm.errors.status && (
                                                <p className="text-sm text-red-600">{registerForm.errors.status}</p>
                                            )}
                                        </div>
                                    </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={registerForm.processing || !registerForm.data.barcode.trim()}
                                    className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold disabled:opacity-50"
                                >
                                    {registerForm.processing ? 'A salvar…' : 'Cadastrar item'}
                                </button>
                            </form>
                        <button
                            type="button"
                            onClick={() => {
                                setLookup(null);
                                setStandaloneRegister(false);
                                setOptionalDetailsOpen(false);
                                setManualBarcodeOpen(false);
                            }}
                            className={`text-sm font-medium underline ${
                                lookup && !lookup.found
                                    ? 'text-amber-900 dark:text-amber-200'
                                    : 'text-zinc-600 dark:text-zinc-400'
                            }`}
                        >
                            Fechar formulário
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
                                    <div className="relative w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
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
                                        {item.photo_url ? (
                                            <ImageDownloadButton
                                                src={imageSrc(item.photo_url, appUrl)}
                                                appUrl={appUrl}
                                                filenameBase={`inventario-${item.barcode}`}
                                                className="absolute bottom-0.5 right-0.5 z-10"
                                                size="sm"
                                                title="Salvar foto"
                                            />
                                        ) : null}
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
