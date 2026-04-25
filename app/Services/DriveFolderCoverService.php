<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class DriveFolderCoverService
{
    /**
     * Tenta obter uma URL de capa (thumbnail) para a primeira imagem de uma pasta pública.
     *
     * Requer API key opcional (config('services.google.drive_api_key')).
     * Se não houver chave, ou se a API falhar, devolve null (fallback seguro).
     */
    public function coverUrlForPublicFolder(string $folderId): ?string
    {
        $apiKey = (string) config('services.google.drive_api_key');
        if (trim($apiKey) === '') {
            return null;
        }

        $cacheKey = 'drive_folder_cover:first_image:'.$folderId;

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($folderId, $apiKey) {
            try {
                $q = sprintf(
                    "'%s' in parents and mimeType contains 'image/' and trashed = false",
                    addslashes($folderId),
                );

                $response = Http::timeout(8)->get('https://www.googleapis.com/drive/v3/files', [
                    'key' => $apiKey,
                    'q' => $q,
                    'pageSize' => 1,
                    'orderBy' => 'createdTime asc',
                    'fields' => 'files(id,mimeType,name)',
                ]);

                if (! $response->successful()) {
                    return null;
                }

                $files = $response->json('files');
                if (! is_array($files) || count($files) === 0) {
                    return null;
                }

                $first = $files[0];
                $id = is_array($first) ? ($first['id'] ?? null) : null;
                if (! is_string($id) || $id === '') {
                    return null;
                }

                // Para arquivos públicos, este thumbnail costuma funcionar sem token.
                return "https://drive.google.com/thumbnail?id={$id}&sz=w1000";
            } catch (\Throwable $e) {
                report($e);
                return null;
            }
        });
    }
}

