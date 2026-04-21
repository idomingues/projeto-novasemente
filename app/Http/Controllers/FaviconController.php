<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class FaviconController extends Controller
{
    /**
     * Retorna favicon circular em SVG (imagem embutida em base64).
     */
    public function __invoke(Request $request)
    {
        $img = $request->query('img');
        $base64 = $this->loadImageAsBase64($img);

        if (! $base64) {
            abort(404);
        }

        $svg = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
            .'<defs><clipPath id="c"><circle cx="16" cy="16" r="16"/></clipPath></defs>'
            .'<image width="32" height="32" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)" href="'.htmlspecialchars($base64).'"/>'
            .'</svg>';

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    private function loadImageAsBase64(?string $img): ?string
    {
        if (! $img || ! is_string($img)) {
            return $this->loadDefaultLogo();
        }

        $path = parse_url($img, PHP_URL_PATH);
        if ($path && str_starts_with($path, '/')) {
            $filePath = public_path(ltrim($path, '/'));
            if (is_file($filePath)) {
                $mime = mime_content_type($filePath) ?: 'image/png';

                return 'data:'.$mime.';base64,'.base64_encode(file_get_contents($filePath));
            }
        }

        if ($path && preg_match('#^/(?:storage|media)/(.+)$#', $path, $m)) {
            if (Storage::disk('public')->exists($m[1])) {
                $mime = Storage::disk('public')->mimeType($m[1]) ?: 'image/png';

                return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($m[1]));
            }
        }

        if (filter_var($img, FILTER_VALIDATE_URL)) {
            try {
                $res = Http::timeout(5)->get($img);
                if ($res->successful()) {
                    $mime = explode(';', $res->header('Content-Type') ?? 'image/png')[0];

                    return 'data:'.$mime.';base64,'.base64_encode($res->body());
                }
            } catch (\Throwable $e) {
                //
            }
        }

        return $this->loadDefaultLogo();
    }

    private function loadDefaultLogo(): ?string
    {
        $filePath = public_path('logo-ns.png');
        if (is_file($filePath)) {
            return 'data:image/png;base64,'.base64_encode(file_get_contents($filePath));
        }

        return null;
    }
}
