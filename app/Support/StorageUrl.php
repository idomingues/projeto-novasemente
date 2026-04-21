<?php

namespace App\Support;

final class StorageUrl
{
    /**
     * URL absoluta para um ficheiro em storage/app/public (via rota /media/…).
     */
    public static function publicMediaUrl(string $pathOnPublicDisk): string
    {
        $path = trim(str_replace('\\', '/', $pathOnPublicDisk), '/');

        return route('media.public', ['path' => $path], absolute: true);
    }

    /**
     * Caminho relativo no disco public a partir de URL /storage/… ou /media/… (ou URL absoluta com esse path).
     */
    public static function relativePathFromAnyPublicUrl(?string $url): ?string
    {
        if (! is_string($url) || $url === '') {
            return null;
        }
        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return null;
        }
        foreach (['/storage/', '/media/'] as $prefix) {
            $pos = strpos($path, $prefix);
            if ($pos !== false) {
                $rel = substr($path, $pos + strlen($prefix));
                $rel = urldecode($rel);

                return $rel !== '' ? $rel : null;
            }
        }

        return null;
    }
}
