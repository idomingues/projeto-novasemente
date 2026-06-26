import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import type { ReactNode } from 'react';

type Props = {
    label: string;
    specsId: string;
    specsText: ReactNode;
    imageFile: File | null;
    fileThumbUrl: string | null;
    imageUrl: string;
    resolvedThumbSrc: string;
    imageUrlError?: string;
    imageFileError?: string;
    fileInputId?: string;
    urlInputId?: string;
    onImageFileChange: (file: File | null) => void;
    onImageUrlChange: (url: string) => void;
    accept?: string;
};

export default function NewsCoverImagePicker({
    label,
    specsId,
    specsText,
    imageFile,
    fileThumbUrl,
    imageUrl,
    resolvedThumbSrc,
    imageUrlError,
    imageFileError,
    fileInputId = 'image_file',
    urlInputId = 'image_url',
    onImageFileChange,
    onImageUrlChange,
    accept = GALLERY_IMAGE_ACCEPT,
}: Props) {
    const thumbSrc = fileThumbUrl || resolvedThumbSrc;

    return (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <InputLabel htmlFor={fileInputId} value={label} />
            <p
                id={specsId}
                className="mt-1.5 rounded-xl border border-teal-200/80 bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/35 dark:text-teal-100"
            >
                {specsText}
            </p>

            <div className="mt-3 flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                    {thumbSrc ? (
                        <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <PhotoIcon className="h-7 w-7 text-zinc-400" aria-hidden />
                    )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <label
                        htmlFor={fileInputId}
                        className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                        Enviar imagem
                    </label>
                    <input
                        id={fileInputId}
                        type="file"
                        accept={accept}
                        aria-describedby={specsId}
                        className="sr-only"
                        onChange={(e) => {
                            onImageFileChange(e.target.files?.[0] ?? null);
                            e.target.value = '';
                        }}
                    />
                    {imageFile ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="truncate">{imageFile.name}</span>
                            <button
                                type="button"
                                onClick={() => onImageFileChange(null)}
                                className="shrink-0 cursor-pointer font-semibold text-red-700 underline dark:text-red-400"
                            >
                                Remover
                            </button>
                        </div>
                    ) : null}
                    <TextInput
                        id={urlInputId}
                        value={imageUrl}
                        onChange={(e) => onImageUrlChange(e.target.value)}
                        className="block w-full"
                        placeholder="Ou cole uma URL https://…"
                    />
                </div>
            </div>
            <InputError message={imageUrlError} className="mt-1" />
            <InputError message={imageFileError} className="mt-1" />
        </div>
    );
}
