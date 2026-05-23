import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import {
    BIBLE_AVATARS_FEMALE,
    BIBLE_AVATARS_MALE,
    type BibleAvatarGender,
    type BibleAvatarOption,
} from '@/constants/bibleAvatars';
import { useMemo, useState } from 'react';

type PhotoMode = 'avatar' | 'upload';

export type ProfilePhotoPickerProps = {
    previewUrl: string | null;
    selectedAvatarKey: string | null;
    photoPreparing: boolean;
    clientError: string | null;
    serverPhotoError?: string;
    serverAvatarError?: string;
    required?: boolean;
    inputId?: string;
    description?: string;
    onPhotoFile: (file: File | null) => void | Promise<void>;
    onAvatarSelect: (key: string | null, previewUrl: string | null) => void;
    onClear: () => void;
};

const GENDER_OPTIONS: { value: BibleAvatarGender; label: string }[] = [
    { value: 'male', label: 'Homem' },
    { value: 'female', label: 'Mulher' },
];

export default function ProfilePhotoPicker({
    previewUrl,
    selectedAvatarKey,
    photoPreparing,
    clientError,
    serverPhotoError,
    serverAvatarError,
    required = true,
    inputId = 'profile_photo_file',
    description = 'Tire ou envie uma foto (máx. 4 MB) ou escolha um avatar. A imagem ajuda a equipe a reconhecer você.',
    onPhotoFile,
    onAvatarSelect,
    onClear,
}: ProfilePhotoPickerProps) {
    const [mode, setMode] = useState<PhotoMode>(selectedAvatarKey ? 'avatar' : 'upload');
    const [avatarGender, setAvatarGender] = useState<BibleAvatarGender>(
        selectedAvatarKey?.startsWith('female:') ? 'female' : 'male'
    );

    const avatarsForGender = useMemo(
        () => (avatarGender === 'male' ? BIBLE_AVATARS_MALE : BIBLE_AVATARS_FEMALE),
        [avatarGender]
    );

    const displayError = clientError ?? serverPhotoError ?? serverAvatarError;

    const switchMode = (next: PhotoMode) => {
        setMode(next);
        if (next === 'upload') {
            onAvatarSelect(null, null);
        } else {
            void onPhotoFile(null);
        }
    };

    const selectAvatar = (avatar: BibleAvatarOption) => {
        onAvatarSelect(avatar.key, avatar.imageUrl);
    };

    const changeGender = (gender: BibleAvatarGender) => {
        setAvatarGender(gender);
        onAvatarSelect(null, null);
    };

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

                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Modo da foto">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === 'upload'}
                        onClick={() => switchMode('upload')}
                        className={[
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            mode === 'upload'
                                ? 'bg-teal-600 text-white dark:bg-teal-500'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
                        ].join(' ')}
                    >
                        Tirar ou enviar foto
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === 'avatar'}
                        onClick={() => switchMode('avatar')}
                        className={[
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            mode === 'avatar'
                                ? 'bg-teal-600 text-white dark:bg-teal-500'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
                        ].join(' ')}
                    >
                        Avatar
                    </button>
                </div>

                {mode === 'avatar' ? (
                    <div className="space-y-3">
                        <div>
                            <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo de avatar</p>
                            <div className="flex flex-wrap gap-2">
                                {GENDER_OPTIONS.map((opt) => {
                                    const selected = avatarGender === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => changeGender(opt.value)}
                                            className={[
                                                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                                                selected
                                                    ? 'border-teal-500/80 bg-teal-50 text-teal-900 dark:border-teal-500/50 dark:bg-teal-950/40 dark:text-teal-100'
                                                    : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-200',
                                            ].join(' ')}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-zinc-200 p-2 dark:border-zinc-700 sm:grid-cols-5"
                            role="listbox"
                            aria-label="Avatares"
                        >
                            {avatarsForGender.map((avatar) => {
                                const selected = selectedAvatarKey === avatar.key;
                                return (
                                    <button
                                        key={avatar.key}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        title={avatar.label}
                                        onClick={() => selectAvatar(avatar)}
                                        className={[
                                            'flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-colors',
                                            selected
                                                ? 'border-teal-500 ring-2 ring-teal-500/40 dark:border-teal-400'
                                                : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600',
                                        ].join(' ')}
                                    >
                                        <img
                                            src={avatar.imageUrl}
                                            alt=""
                                            className="h-12 w-12 rounded-full object-cover"
                                        />
                                        <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-zinc-700 dark:text-zinc-200">
                                            {avatar.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
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
                )}

                {(previewUrl || selectedAvatarKey) && !photoPreparing ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs font-semibold text-teal-700 underline dark:text-teal-400"
                    >
                        Remover {mode === 'avatar' ? 'avatar' : 'foto'}
                    </button>
                ) : null}

                {required && !previewUrl && !selectedAvatarKey ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {mode === 'avatar'
                            ? 'Selecione um avatar para continuar.'
                            : 'Envie ou tire uma foto para continuar.'}
                    </p>
                ) : null}

                {displayError ? <InputError message={displayError} /> : null}
            </div>
        </div>
    );
}
