<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;

class PublicDiskFileController extends Controller
{
    /** Caminhos permitidos dentro de storage/app/public (sem path traversal). */
    private const ALLOWED_PREFIXES = [
        'logos/',
        'users/photos/',
        'news/',
        'pastors/',
        'mission/volunteers/',
        'inventory/photos/',
        'events/',
        'photos/',
        'library/',
    ];

    public function __invoke(string $path)
    {
        $path = trim(str_replace('\\', '/', $path), '/');
        if ($path === '' || str_contains($path, '..')) {
            abort(404);
        }

        $allowed = false;
        foreach (self::ALLOWED_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $allowed = true;
                break;
            }
        }
        if (! $allowed) {
            abort(404);
        }

        if (! Storage::disk('public')->exists($path)) {
            // BD copiada de outro ambiente: referência a logos/… sem arquivo local — evita 404 na UI e no DevTools.
            if (str_starts_with($path, 'logos/')) {
                $fallback = public_path('logo-ns.png');
                if (is_file($fallback)) {
                    return response()->file($fallback, [
                        'Cache-Control' => 'public, max-age=300',
                    ]);
                }
            }
            abort(404);
        }

        return Storage::disk('public')->response($path, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
