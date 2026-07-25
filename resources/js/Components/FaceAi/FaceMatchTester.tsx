import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import {
    CheckCircleIcon,
    ClipboardDocumentIcon,
    PhotoIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import {
    FACE_MATCH_THRESHOLD,
    matchReferenceInImageFile,
} from '@/utils/faceEnrollment';

type QueueItem = {
    id: string;
    number: number;
    file: File;
    previewUrl: string;
};

type MatchResult = {
    id: string;
    number: number;
    name: string;
    previewUrl: string;
    status: 'match' | 'no_match' | 'no_face' | 'error';
    label: string;
    facesLabel: string;
    distance: number | null;
    facesFound: number;
    /** Código compacto para diagnóstico (local ou produção). */
    debugCode: string;
};

type Props = {
    referenceEmbedding: number[];
    hasDriveApiKey?: boolean;
};

function facesIdentifiedLabel(count: number): string {
    if (count <= 0) {
        return '0 rostos identificados';
    }
    return count === 1 ? '1 rosto identificado' : `${count} rostos identificados`;
}

function makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function statusCode(status: MatchResult['status']): string {
    switch (status) {
        case 'match':
            return 'E';
        case 'no_match':
            return 'N';
        case 'no_face':
            return 'S';
        case 'error':
            return 'X';
        default:
            return '?';
    }
}

/**
 * Código legível para colar no chat de suporte/dev.
 * Ex.: IAF#3|rostos=2|dist=0.721|limiar=0.50|status=N|arq=foto.jpeg
 */
function buildDebugCode(input: {
    number: number;
    facesFound: number;
    distance: number | null;
    status: MatchResult['status'];
    fileName: string;
    threshold: number;
}): string {
    const dist = input.distance === null ? '-' : input.distance.toFixed(3);
    const safeName = input.fileName.replace(/\|/g, '_').slice(0, 80);
    return [
        `IAF#${input.number}`,
        `rostos=${input.facesFound}`,
        `dist=${dist}`,
        `limiar=${input.threshold.toFixed(2)}`,
        `status=${statusCode(input.status)}`,
        `arq=${safeName}`,
    ].join('|');
}

const cardClass =
    'space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900';

export default function FaceMatchTester({
    referenceEmbedding,
    hasDriveApiKey = false,
}: Props) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const nextNumberRef = useRef(1);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [results, setResults] = useState<MatchResult[] | null>(null);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [driveUrl, setDriveUrl] = useState('');
    const [driveLoading, setDriveLoading] = useState(false);
    const [driveProgress, setDriveProgress] = useState<{ current: number; total: number } | null>(
        null,
    );

    useEffect(() => {
        return () => {
            queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- limpa URLs ao desmontar
    }, []);

    const addFiles = (fileList: FileList | File[] | null) => {
        if (!fileList || (Array.isArray(fileList) ? fileList.length === 0 : fileList.length === 0)) {
            return;
        }
        const list = Array.isArray(fileList) ? fileList : Array.from(fileList);
        const next: QueueItem[] = [];
        list.forEach((file) => {
            if (!file.type.startsWith('image/')) {
                return;
            }
            next.push({
                id: makeId(),
                number: nextNumberRef.current++,
                file,
                previewUrl: URL.createObjectURL(file),
            });
        });
        if (next.length === 0) {
            return;
        }
        setQueue((prev) => [...prev, ...next]);
        setResults(null);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const onDropFiles = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        if (running || driveLoading) {
            return;
        }
        addFiles(event.dataTransfer.files);
    };

    const importFromDrive = async () => {
        const url = driveUrl.trim();
        if (!url || driveLoading || running) {
            return;
        }
        if (!hasDriveApiKey) {
            setError(
                'A chave da API do Google Drive não está configurada. Use upload local ou configure GOOGLE_DRIVE_API_KEY.',
            );
            return;
        }

        setDriveLoading(true);
        setError(null);
        setDriveProgress(null);

        try {
            const csrf =
                document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const listRes = await fetch(route('face-ai.drive-list'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ drive_folder_url: url }),
            });

            const listData = await listRes.json().catch(() => null);
            if (!listRes.ok) {
                const msg =
                    listData?.message ||
                    listData?.errors?.drive_folder_url?.[0] ||
                    'Não foi possível listar as fotos do Drive.';
                throw new Error(msg);
            }

            const images = Array.isArray(listData?.images) ? listData.images : [];
            if (images.length === 0) {
                throw new Error(
                    'Nenhuma imagem encontrada nesta pasta. Confira se o link é público e contém fotos.',
                );
            }

            setDriveProgress({ current: 0, total: images.length });
            const files: File[] = [];

            for (let i = 0; i < images.length; i++) {
                const img = images[i] as { id: string; name?: string };
                setDriveProgress({ current: i + 1, total: images.length });
                const proxyUrl = route('face-ai.drive-proxy', { fileId: img.id });
                const fileRes = await fetch(proxyUrl, {
                    headers: { Accept: 'image/*', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                if (!fileRes.ok) {
                    continue;
                }
                const blob = await fileRes.blob();
                if (!blob.type.startsWith('image/')) {
                    continue;
                }
                const ext = blob.type.includes('png')
                    ? 'png'
                    : blob.type.includes('webp')
                      ? 'webp'
                      : 'jpg';
                const baseName = (img.name || `drive-${img.id}`).replace(/\.[^.]+$/, '');
                files.push(new File([blob], `${baseName}.${ext}`, { type: blob.type }));
            }

            if (files.length === 0) {
                throw new Error('As imagens do Drive não puderam ser baixadas.');
            }

            addFiles(files);
            setDriveUrl('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Falha ao importar do Drive.');
        } finally {
            setDriveLoading(false);
            setDriveProgress(null);
        }
    };

    const removeItem = (id: string) => {
        setQueue((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((item) => item.id !== id);
        });
        setResults(null);
    };

    const clearQueue = () => {
        queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setQueue([]);
        setResults(null);
        setProgress(null);
        setError(null);
        nextNumberRef.current = 1;
    };

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            window.setTimeout(() => setCopiedCode((cur) => (cur === code ? null : cur)), 2000);
        } catch {
            setError('Não foi possível copiar o código. Selecione e copie manualmente.');
        }
    };

    const runIdentify = async () => {
        if (queue.length === 0 || running) {
            return;
        }
        if (!referenceEmbedding.length) {
            setError('Matriz de referência indisponível. Cadastre o rosto novamente.');
            return;
        }

        setRunning(true);
        setError(null);
        setResults(null);
        setProgress({ current: 0, total: queue.length });

        const collected: MatchResult[] = [];

        try {
            for (let i = 0; i < queue.length; i++) {
                const item = queue[i];
                setProgress({ current: i + 1, total: queue.length });

                try {
                    const match = await matchReferenceInImageFile(item.file, referenceEmbedding);
                    const status: MatchResult['status'] =
                        match.facesFound === 0
                            ? 'no_face'
                            : match.matched
                              ? 'match'
                              : 'no_match';
                    const label =
                        status === 'match' ? 'Rosto encontrado' : 'Rosto não encontrado';
                    const facesFound = match.facesFound;
                    const distance = match.bestDistance;

                    collected.push({
                        id: item.id,
                        number: item.number,
                        name: item.file.name,
                        previewUrl: item.previewUrl,
                        status,
                        label,
                        facesLabel: facesIdentifiedLabel(facesFound),
                        distance,
                        facesFound,
                        debugCode: buildDebugCode({
                            number: item.number,
                            facesFound,
                            distance,
                            status,
                            fileName: item.file.name,
                            threshold: match.threshold,
                        }),
                    });
                } catch {
                    collected.push({
                        id: item.id,
                        number: item.number,
                        name: item.file.name,
                        previewUrl: item.previewUrl,
                        status: 'error',
                        label: 'Rosto não encontrado',
                        facesLabel: facesIdentifiedLabel(0),
                        distance: null,
                        facesFound: 0,
                        debugCode: buildDebugCode({
                            number: item.number,
                            facesFound: 0,
                            distance: null,
                            status: 'error',
                            fileName: item.file.name,
                            threshold: FACE_MATCH_THRESHOLD,
                        }),
                    });
                }
            }

            setResults(collected);
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'Não foi possível carregar o reconhecimento facial.',
            );
        } finally {
            setRunning(false);
            setProgress(null);
        }
    };

    const matchCount = results?.filter((r) => r.status === 'match').length ?? 0;
    const noMatchCount =
        results?.filter(
            (r) => r.status === 'no_match' || r.status === 'no_face' || r.status === 'error',
        ).length ?? 0;

    return (
        <>
            {/* Card: upload */}
            <section className={cardClass} aria-labelledby="face-match-upload-title">
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                            2
                        </span>
                        <h2
                            id="face-match-upload-title"
                            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
                        >
                            Fase 2 — Upload das fotos
                        </h2>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Arraste fotos, escolha arquivos ou cole o link de uma pasta do Google Drive
                        (como nos álbuns). Cada foto recebe um número (#1, #2…) para reportar erros.
                    </p>
                </div>

                <label
                    htmlFor={inputId}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!running && !driveLoading) setDragActive(true);
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!running && !driveLoading) setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActive(false);
                    }}
                    onDrop={onDropFiles}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition ${
                        dragActive
                            ? 'border-teal-500 bg-teal-50/70 dark:border-teal-500 dark:bg-teal-950/30'
                            : 'border-zinc-300 bg-zinc-50 hover:border-teal-400 hover:bg-teal-50/40 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:border-teal-600 dark:hover:bg-teal-950/20'
                    }`}
                >
                    <PhotoIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" aria-hidden />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Arraste fotos aqui ou clique para escolher
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        JPG, PNG ou WEBP — várias de uma vez
                    </span>
                    <input
                        ref={inputRef}
                        id={inputId}
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={running || driveLoading}
                        onChange={(e) => addFiles(e.target.files)}
                    />
                </label>

                <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Pasta do Google Drive
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Mesmo tipo de link usado em Fotos / álbuns:{' '}
                        <span className="font-mono">drive.google.com/drive/folders/…</span>
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            type="url"
                            value={driveUrl}
                            onChange={(e) => setDriveUrl(e.target.value)}
                            disabled={running || driveLoading || !hasDriveApiKey}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-500/30 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <PrimaryButton
                            type="button"
                            className="cursor-pointer shrink-0"
                            disabled={
                                running ||
                                driveLoading ||
                                !hasDriveApiKey ||
                                driveUrl.trim() === ''
                            }
                            onClick={() => void importFromDrive()}
                        >
                            {driveLoading
                                ? driveProgress
                                    ? `Baixando… ${driveProgress.current}/${driveProgress.total}`
                                    : 'Listando…'
                                : 'Importar do Drive'}
                        </PrimaryButton>
                    </div>
                    {!hasDriveApiKey ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            API do Drive não configurada neste ambiente. Use arrastar/escolher
                            arquivos.
                        </p>
                    ) : null}
                </div>

                {queue.length > 0 ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {queue.length} foto{queue.length === 1 ? '' : 's'} na fila
                            </p>
                            <button
                                type="button"
                                className="cursor-pointer text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
                                disabled={running || driveLoading}
                                onClick={clearQueue}
                            >
                                Limpar fila
                            </button>
                        </div>
                        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {queue.map((item) => (
                                <li
                                    key={item.id}
                                    className="relative overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700"
                                >
                                    <img
                                        src={item.previewUrl}
                                        alt={`Foto #${item.number} — ${item.file.name}`}
                                        className="aspect-square w-full object-cover"
                                    />
                                    <span className="absolute left-1.5 top-1.5 rounded-md bg-zinc-900/85 px-1.5 py-0.5 text-[11px] font-bold text-white">
                                        #{item.number}
                                    </span>
                                    <p className="truncate bg-zinc-900/70 px-2 py-1 text-[10px] text-white">
                                        {item.file.name}
                                    </p>
                                    <button
                                        type="button"
                                        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed"
                                        disabled={running || driveLoading}
                                        aria-label={`Remover foto #${item.number}`}
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </section>

            {/* Card: identificar + resultado */}
            <section className={cardClass} aria-labelledby="face-match-run-title">
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                            3
                        </span>
                        <h2
                            id="face-match-run-title"
                            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
                        >
                            Fase 3 — Identificar e resultado
                        </h2>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Busca todos os rostos e compara com o cadastrado. O limiar varia: 1 rosto
                        0,55 · 2 rostos 0,52 · 3+ rostos 0,66. Em caso de erro, copie o código da
                        foto e envie no suporte.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <PrimaryButton
                        type="button"
                        className="cursor-pointer"
                        disabled={queue.length === 0 || running || driveLoading}
                        onClick={() => void runIdentify()}
                    >
                        {running
                            ? progress
                                ? `Identificando… ${progress.current} de ${progress.total}`
                                : 'Identificando…'
                            : 'Identificar'}
                    </PrimaryButton>
                    {queue.length === 0 ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Adicione fotos no upload para habilitar.
                        </p>
                    ) : null}
                </div>

                {error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}

                {results ? (
                    <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            Resultado
                        </h3>

                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                                {matchCount} rosto encontrado{matchCount === 1 ? '' : 's'}
                            </span>
                            <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">
                                {noMatchCount} rosto não encontrado{noMatchCount === 1 ? '' : 's'}
                            </span>
                        </div>

                        <ul className="space-y-2">
                            {results.map((item) => {
                                const found = item.status === 'match';
                                const ring = found
                                    ? 'ring-emerald-400'
                                    : item.status === 'no_match'
                                      ? 'ring-red-400'
                                      : 'ring-zinc-300 dark:ring-zinc-600';
                                const badge = found
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-red-600 text-white';

                                return (
                                    <li
                                        key={item.id}
                                        className={`flex gap-3 rounded-xl bg-zinc-50 p-3 ring-2 dark:bg-zinc-950 ${ring}`}
                                    >
                                        <div className="relative shrink-0">
                                            <img
                                                src={item.previewUrl}
                                                alt={`Foto #${item.number}`}
                                                className="h-16 w-16 rounded-lg object-cover"
                                            />
                                            <span className="absolute -left-1 -top-1 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                #{item.number}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                Foto #{item.number} · {item.facesLabel}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge}`}
                                                >
                                                    {found ? (
                                                        <CheckCircleIcon className="h-3.5 w-3.5" />
                                                    ) : null}
                                                    {item.label}
                                                </span>
                                                {item.distance !== null ? (
                                                    <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                                        dist {item.distance.toFixed(3)}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                                                {item.name}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <code className="max-w-full truncate rounded-md bg-zinc-100 px-2 py-1 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                    {item.debugCode}
                                                </code>
                                                <button
                                                    type="button"
                                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                    onClick={() => void copyCode(item.debugCode)}
                                                >
                                                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                                    {copiedCode === item.debugCode
                                                        ? 'Copiado'
                                                        : 'Copiar código'}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <SecondaryButton
                            type="button"
                            className="cursor-pointer"
                            disabled={running}
                            onClick={() => setResults(null)}
                        >
                            Limpar resultados
                        </SecondaryButton>
                    </div>
                ) : null}
            </section>
        </>
    );
}
