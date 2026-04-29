<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DriveFolderImagesService
{
    private function debugLog(string $runId, string $hypothesisId, string $message, array $data = []): void
    {
        try {
            $payload = [
                'sessionId' => 'cadcbe',
                'runId' => $runId,
                'hypothesisId' => $hypothesisId,
                'location' => 'app/Services/DriveFolderImagesService.php',
                'message' => $message,
                'data' => $data,
                'timestamp' => (int) round(microtime(true) * 1000),
            ];
            file_put_contents(
                '/Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente/.cursor/debug-cadcbe.log',
                json_encode($payload, JSON_UNESCAPED_UNICODE)."\n",
                FILE_APPEND
            );
        } catch (\Throwable) {
            // ignore
        }
    }

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
        $runId = 'pre-fix';
        // v2: invalida caches antigos (incluindo listas vazias) após ajustes em produção.
        $cacheKey = 'drive_folder_images:list:v2:'.$folderId.':'.$pageSize;
        $this->debugLog($runId, 'H1', 'listPublicFolderImages called', [
            'folderId' => $folderId,
            'pageSize' => $pageSize,
            'apiKeyPresent' => trim($apiKey) !== '',
            'cacheKey' => $cacheKey,
            'cacheHas' => Cache::has($cacheKey),
        ]);
        Log::info('DriveFolderImagesService.listPublicFolderImages called', [
            'folderIdPrefix' => substr($folderId, 0, 12),
            'pageSize' => $pageSize,
            'apiKeyPresent' => trim($apiKey) !== '',
            'cacheHas' => Cache::has($cacheKey),
        ]);

        if (trim($apiKey) === '') {
            $this->debugLog($runId, 'H1', 'Missing GOOGLE_DRIVE_API_KEY (config services.google.drive_api_key)', [
                'folderId' => $folderId,
            ]);
            Log::warning('DriveFolderImagesService missing GOOGLE_DRIVE_API_KEY', [
                'folderIdPrefix' => substr($folderId, 0, 12),
            ]);

            return [];
        }

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
                        $this->debugLog('pre-fix', 'H2', 'Drive API request failed', [
                            'folderId' => $folderId,
                            'httpStatus' => $response->status(),
                            'bodyPrefix' => substr((string) $response->body(), 0, 300),
                        ]);
                        Log::warning('DriveFolderImagesService Drive API request failed', [
                            'folderIdPrefix' => substr($folderId, 0, 12),
                            'httpStatus' => $response->status(),
                            'bodyPrefix' => substr((string) $response->body(), 0, 200),
                        ]);

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
                        // alternativa que em alguns ambientes carrega melhor no <img> (sem UI do Drive)
                        'view_image_url' => "https://drive.google.com/uc?export=view&id={$id}",
                        // download direto (pode abrir em nova aba e salvar)
                        'download_url' => "https://drive.google.com/uc?export=download&id={$id}",
                        'view_url' => "https://drive.google.com/file/d/{$id}/view",
                    ];
                }

                $this->debugLog('pre-fix', 'H3', 'Drive API request ok', [
                    'folderId' => $folderId,
                    'filesCount' => count($files),
                    'outCount' => count($out),
                ]);
                Log::info('DriveFolderImagesService Drive API request ok', [
                    'folderIdPrefix' => substr($folderId, 0, 12),
                    'filesCount' => count($files),
                    'outCount' => count($out),
                ]);

                return $out;
            } catch (\Throwable $e) {
                $this->debugLog('pre-fix', 'H4', 'Exception while listing Drive images', [
                    'folderId' => $folderId,
                    'exception' => get_class($e),
                    'messagePrefix' => substr((string) $e->getMessage(), 0, 200),
                ]);
                Log::error('DriveFolderImagesService exception while listing Drive images', [
                    'folderIdPrefix' => substr($folderId, 0, 12),
                    'exception' => get_class($e),
                    'messagePrefix' => substr((string) $e->getMessage(), 0, 200),
                ]);
                report($e);

                return [];
            }
        });
    }
}
