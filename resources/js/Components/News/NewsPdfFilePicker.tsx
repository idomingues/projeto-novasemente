import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { DocumentTextIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

const PDF_MAX_MB = 12;

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
    error?: string;
    inputId?: string;
    onFileChange: (file: File | null) => void;
};

export default function NewsPdfFilePicker({
    file,
    existingUrl,
    error,
    inputId = 'pdf_file',
    onFileChange,
}: Props) {
    const hasExisting = Boolean(existingUrl) && !file;

    return (
        <div>
            <InputLabel htmlFor={inputId} value="Arquivo PDF" />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Documento principal da publicação. Tamanho máximo: {PDF_MAX_MB} MB.
            </p>

            <div
                className={`mt-2 rounded-2xl border-2 border-dashed p-4 transition-colors ${
                    error
                        ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                        : file || hasExisting
                          ? 'border-teal-300 bg-teal-50/40 dark:border-teal-800 dark:bg-teal-950/20'
                          : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0] ?? null;
                    if (dropped && (dropped.type === 'application/pdf' || dropped.name.toLowerCase().endsWith('.pdf'))) {
                        onFileChange(dropped);
                    }
                }}
            >
                {file ? (
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                            <DocumentTextIcon className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{file.name}</p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{formatFileSize(file.size)}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <label
                                    htmlFor={inputId}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                    Trocar arquivo
                                </label>
                                <button
                                    type="button"
                                    onClick={() => onFileChange(null)}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                >
                                    <XMarkIcon className="h-4 w-4" aria-hidden />
                                    Remover
                                </button>
                            </div>
                        </div>
                    </div>
                ) : hasExisting ? (
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                            <DocumentTextIcon className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">PDF já anexado</p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                Envie um novo arquivo abaixo para substituir.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <a
                                    href={existingUrl ?? '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-primary-300 dark:hover:bg-zinc-700"
                                >
                                    Ver PDF atual
                                </a>
                                <label
                                    htmlFor={inputId}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                    Substituir
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center gap-2 py-2 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            <ArrowUpTrayIcon className="h-6 w-6" aria-hidden />
                        </span>
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Escolher PDF</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">ou arraste o arquivo para esta área</span>
                    </label>
                )}

                <input
                    id={inputId}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => {
                        onFileChange(e.target.files?.[0] ?? null);
                        e.target.value = '';
                    }}
                />
            </div>

            <InputError message={error} className="mt-1" />
        </div>
    );
}

export { PDF_MAX_MB };
