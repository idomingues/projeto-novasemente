import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';

export type ProfilePhotoPickerProps = {
    previewUrl: string | null;
    photoPreparing: boolean;
    clientError: string | null;
    serverPhotoError?: string;
    required?: boolean;
    inputId?: string;
    description?: string;
    onPhotoFile: (file: File | null) => void | Promise<void>;
    onClear: () => void;
};

export default function ProfilePhotoPicker({
    previewUrl,
    photoPreparing,
    clientError,
    serverPhotoError,
    required = true,
    inputId = 'profile_photo_file',
    description = 'Tire ou envie uma foto (máx. 4 MB). A imagem ajuda a equipe a reconhecer você.',
    onPhotoFile,
    onClear,
}: ProfilePhotoPickerProps) {
    const displayError = clientError ?? serverPhotoError;

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                {previewUrl ? (
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <span className="text-2xl font-semibold text-zinc-500 dark:text-zinc-400">?</span>
                )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>

                <div className="space-y-2">
                    <InputLabel htmlFor={inputId} value="Selecionar foto" className="sr-only" />
                    <input
                        id={inputId}
                        type="file"
                        accept="image/*"
                        capture="user"
                        disabled={photoPreparing}
                        onChange={(e) => {
                            const raw = e.currentTarget.files?.[0] ?? null;
                            e.currentTarget.value = '';
                            void onPhotoFile(raw);
                        }}
                        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-60 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
                    />
                    {photoPreparing ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Preparando a imagem…</p>
                    ) : null}
                </div>

                {previewUrl && !photoPreparing ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs font-semibold text-teal-700 underline dark:text-teal-400"
                    >
                        Remover foto
                    </button>
                ) : null}

                {required && !previewUrl ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Envie ou tire uma foto para continuar.</p>
                ) : null}

                {displayError ? <InputError message={displayError} /> : null}
            </div>
        </div>
    );
}
