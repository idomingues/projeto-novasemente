<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class UserProfilePhotoResolver
{
    /**
     * @return array<string, list<\Illuminate\Contracts\Validation\ValidationRule|string>>
     */
    public static function validationRules(bool $required = true): array
    {
        $photoRules = ['nullable', 'image', 'max:4096'];
        $avatarRules = ['nullable', 'string', Rule::in(BibleAvatarCatalog::keys())];

        if ($required) {
            $photoRules[] = 'required_without:avatar_key';
            $avatarRules[] = 'required_without:photo_file';
        }

        return [
            'photo_file' => $photoRules,
            'avatar_key' => $avatarRules,
        ];
    }

    public static function assertExclusivePhotoOrAvatar(Request $request): void
    {
        if ($request->hasFile('photo_file') && $request->filled('avatar_key')) {
            throw ValidationException::withMessages([
                'photo_file' => ['Envie uma foto ou escolha um avatar, não os dois ao mesmo tempo.'],
            ]);
        }
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

        if ($request->filled('avatar_key')) {
            return BibleAvatarCatalog::urlForKey($request->string('avatar_key')->toString());
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
