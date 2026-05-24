<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

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
