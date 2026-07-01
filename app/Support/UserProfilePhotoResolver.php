<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class UserProfilePhotoResolver
{
    /**
     * @return array<string, list<\Illuminate\Contracts\Validation\ValidationRule|string>>
     */
    public static function validationRules(bool $required = true): array
    {
        $photoRules = ['nullable', 'image', 'max:4096'];

        if ($required) {
            $photoRules[] = 'required';
        }

        return [
            'photo_file' => $photoRules,
        ];
    }

    public static function storeUploadedPhoto(UploadedFile $file): string
    {
        $path = $file->store('users/photos', 'public');
        if (! is_string($path) || $path === '') {
            throw ValidationException::withMessages([
                'photo_file' => ['Não foi possível salvar a foto. Tente outra imagem ou entre em contato com a equipe.'],
            ]);
        }

        return StorageUrl::publicMediaUrl($path);
    }

    public static function resolveFromRequest(Request $request, ?string $currentUrl = null): ?string
    {
        if ($request->hasFile('photo_file')) {
            return self::storeUploadedPhoto($request->file('photo_file'));
        }

        return $currentUrl;
    }

    public static function deleteStoredUploadIfAny(?string $photoUrl): void
    {
        $relative = StorageUrl::relativePathFromAnyPublicUrl($photoUrl);
        if ($relative === null) {
            return;
        }

        \Illuminate\Support\Facades\Storage::disk('public')->delete($relative);
    }
}
