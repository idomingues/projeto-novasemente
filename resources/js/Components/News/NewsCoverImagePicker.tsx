import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { ArrowUpTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import { useEffect, useState, type DragEvent, type ReactNode } from 'react';

type Props = {
    label: string;
    hint?: string;
    specsId: string;
    specsText: ReactNode;
    imageFile: File | null;
    fileThumbUrl: string | null;
    imageUrl: string;
    resolvedThumbSrc: string;
    autoThumbLabel?: string | null;
    imageUrlError?: string;
    imageFileError?: string;
    fileInputId?: string;
    urlInputId?: string;
    onImageFileChange: (file: File | null) => void;
    onImageUrlChange: (url: string) => void;
    accept?: string;
    previewAspectClass?: string;
};

function isImageFile(file: File): boolean {
    return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export default function NewsCoverImagePicker({
    label,
    hint,
    specsId,
    specsText,
    imageFile,
    fileThumbUrl,
    imageUrl,
    resolvedThumbSrc,
    autoThumbLabel = null,
    imageUrlError,
    imageFileError,
    fileInputId = 'image_file',
    urlInputId = 'image_url',
    onImageFileChange,
    onImageUrlChange,
    accept = GALLERY_IMAGE_ACCEPT,
    previewAspectClass = 'aspect-[16/10]',
}: Props) {
    const thumbSrc = fileThumbUrl || resolvedThumbSrc;
    const hasOwnImage = Boolean(imageFile || imageUrl.trim());
    const [urlOpen, setUrlOpen] = useState(Boolean(imageUrl.trim()));

    useEffect(() => {
        if (imageUrl.trim()) {
            setUrlOpen(true);
        }
    }, [imageUrl]);

    const applyDroppedFile = (event: DragEvent) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files?.[0] ?? null;
        if (dropped && isImageFile(dropped)) {
            onImageFileChange(dropped);
        }
    };

    const clearImage = () => {
        onImageFileChange(null);
        onImageUrlChange('');
    };

    const statusLabel = imageFile?.name
        || (imageUrl.trim() ? 'Imagem pelo link' : autoThumbLabel)
        || 'Imagem selecionada';

    return (
        <div>
            <InputLabel htmlFor={fileInputId} value={label} />
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
                id={fileInputId}
                type="file"
                accept={accept}
                aria-describedby={specsText ? specsId : undefined}
                className="sr-only"
                onChange={(e) => {
                    onImageFileChange(e.target.files?.[0] ?? null);
                    e.target.value = '';
                }}
            />

            {thumbSrc ? (
                <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <div className={`relative bg-zinc-100 dark:bg-zinc-800 ${previewAspectClass}`}>
                        <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
                        <p className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{statusLabel}</p>
                        <label
                            htmlFor={fileInputId}
                            className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                            Trocar
                        </label>
                        {hasOwnImage ? (
                            <button
                                type="button"
                                onClick={clearImage}
                                className="inline-flex cursor-pointer items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                                Remover
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={fileInputId}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={applyDroppedFile}
                    className={`mt-2 flex ${previewAspectClass} cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 px-4 text-center transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900`}
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                        <ArrowUpTrayIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Escolher imagem</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">ou arraste o arquivo aqui</span>
                </label>
            )}

            {urlOpen ? (
                <TextInput
                    id={urlInputId}
                    value={imageUrl}
                    onChange={(e) => onImageUrlChange(e.target.value)}
                    className="mt-2 block w-full"
                    placeholder="Cole o link da imagem (https://…)"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setUrlOpen(true)}
                    className="mt-2 cursor-pointer text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    Ou colar um link da imagem
                </button>
            )}

            <InputError message={imageUrlError} className="mt-1" />
            <InputError message={imageFileError} className="mt-1" />
        </div>
    );
}
