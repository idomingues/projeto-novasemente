<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class DriveFolderImagesService
{
    /**
     * Lista imagens de uma pasta pública do Google Drive.
     *
     * Requer API key opcional (config('services.google.drive_api_key')).
     * Retorna lista vazia em caso de falha (fallback seguro).
     *
     * @return array<int, array{id: string, name: string|null, thumb_url: string, full_url: string, download_url: string, view_url: string}>
     */
    public function listPublicFolderImages(string $folderId, int $pageSize = 200): array
    {
        $apiKey = (string) config('services.google.drive_api_key');
        if (trim($apiKey) === '') {
            return [];
        }

        $cacheKey = 'drive_folder_images:list:v1:'.$folderId.':'.$pageSize;

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($folderId, $apiKey, $pageSize) {
            try {
                $q = sprintf(
                    "'%s' in parents and mimeType contains 'image/' and trashed = false",
                    addslashes($folderId),
                );

                $files = [];
                $pageToken = null;

                // Paginação simples (limitado para evitar timeouts).
                for ($i = 0; $i < 3; $i++) {
                    $response = Http::timeout(10)->get('https://www.googleapis.com/drive/v3/files', array_filter([
                        'key' => $apiKey,
                        'q' => $q,
                        'pageSize' => $pageSize,
                        'orderBy' => 'createdTime asc',
                        'fields' => 'nextPageToken,files(id,name,mimeType)',
                        'pageToken' => $pageToken,
                    ], fn ($v) => $v !== null && $v !== ''));

                    if (! $response->successful()) {
                        return [];
                    }

                    $batch = $response->json('files');
                    if (is_array($batch)) {
                        $files = array_merge($files, $batch);
                    }

                    $pageToken = $response->json('nextPageToken');
                    if (! is_string($pageToken) || $pageToken === '') {
                        break;
                    }
                }

                $out = [];
                foreach ($files as $f) {
                    if (! is_array($f)) {
                        continue;
                    }
                    $id = $f['id'] ?? null;
                    if (! is_string($id) || $id === '') {
                        continue;
                    }
                    $name = isset($f['name']) && is_string($f['name']) ? $f['name'] : null;

                    $out[] = [
                        'id' => $id,
                        'name' => $name,
                        // thumbnails que geralmente funcionam para arquivos públicos sem token
                        'thumb_url' => "https://drive.google.com/thumbnail?id={$id}&sz=w600",
                        'full_url' => "https://drive.google.com/thumbnail?id={$id}&sz=w2000",
                        // download direto (pode abrir em nova aba e salvar)
                        'download_url' => "https://drive.google.com/uc?export=download&id={$id}",
                        'view_url' => "https://drive.google.com/file/d/{$id}/view",
                    ];
                }

                return $out;
            } catch (\Throwable $e) {
                report($e);
                return [];
            }
        });
    }
}

