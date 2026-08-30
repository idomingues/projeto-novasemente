import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { ArrowUpTrayIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DragEvent, ReactNode } from 'react';

function isVideoFile(file: File): boolean {
    return file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
    file: File | null;
    existingUrl: string | null;
    previewUrl: string | null;
    error?: string;
    inputId?: string;
    label?: string;
    hint?: string;
    specsId?: string;
    specsText?: ReactNode;
    onFileChange: (file: File | null) => void;
};

export default function NewsVideoFilePicker({
    file,
    existingUrl,
    previewUrl,
    error,
    inputId = 'video_file',
    label = 'Vídeo',
    hint,
    specsId = 'news_video_specs',
    specsText,
    onFileChange,
}: Props) {
    const hasExisting = Boolean(existingUrl) && !file;
    const playableSrc = previewUrl || (hasExisting ? existingUrl : null);

    const applyDroppedFile = (event: DragEvent) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files?.[0] ?? null;
        if (dropped && isVideoFile(dropped)) {
            onFileChange(dropped);
        }
    };

    return (
        <div>
            <InputLabel htmlFor={inputId} value={label} />
            {hint ? (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
            ) : null}

            {specsText ? (
                <details className="group mt-1">
                    <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
                        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                        Recomendações de tamanho
                    </summary>
                    <p id={specsId} className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {specsText}
                    </p>
                </details>
            ) : null}

            <input
                id={inputId}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                aria-describedby={specsText ? specsId : undefined}
                className="sr-only"
                onChange={(e) => {
                    onFileChange(e.target.files?.[0] ?? null);
                    e.target.value = '';
                }}
            />

            {playableSrc ? (
                <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="relative mx-auto aspect-[9/16] max-h-72 w-full max-w-[180px] bg-zinc-950">
                        <video src={playableSrc} className="h-full w-full object-cover" muted playsInline preload="metadata" controls />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
                        <p className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {file ? `${file.name} · ${formatFileSize(file.size)}` : 'Vídeo atual'}
                        </p>
                        <label
                            htmlFor={inputId}
                            className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                            Trocar
                        </label>
                        {file ? (
                            <button
                                type="button"
                                onClick={() => onFileChange(null)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                                <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
                                Remover
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={inputId}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={applyDroppedFile}
                    className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                        <ArrowUpTrayIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Escolher vídeo</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">9:16 · MP4, MOV ou WebM</span>
                </label>
            )}

            <InputError message={error} className="mt-1" />
        </div>
    );
}
