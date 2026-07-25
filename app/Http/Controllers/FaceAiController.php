<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\PhotoAlbum;
use App\Models\UserFaceIdentity;
use App\Services\DriveFolderImagesService;
use App\Support\StorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FaceAiController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $identity = UserFaceIdentity::query()
            ->where('user_id', $user->id)
            ->first();

        return Inertia::render('FaceAi/Index', [
            'identity' => $identity === null ? null : [
                'id' => $identity->id,
                'reference_photo_url' => StorageUrl::publicMediaUrl($identity->reference_photo_path),
                'embedding' => $identity->embedding,
                'embedding_dim' => $identity->embedding_dim,
                'model_version' => $identity->model_version,
                'liveness_passed_at' => $identity->liveness_passed_at?->toIso8601String(),
                'updated_at' => $identity->updated_at?->toIso8601String(),
            ],
            'hasDriveApiKey' => filled(config('services.google.drive_api_key')),
        ]);
    }

    /**
     * Lista imagens de uma pasta pública do Google Drive (mesmo fluxo dos álbuns).
     */
    public function listDriveImages(Request $request, DriveFolderImagesService $driveImages): JsonResponse
    {
        $validated = $request->validate([
            'drive_folder_url' => ['required', 'string', 'max:1024'],
        ]);

        $folderId = PhotoAlbum::driveFolderIdFromUrl($validated['drive_folder_url']);
        if ($folderId === null) {
            throw ValidationException::withMessages([
                'drive_folder_url' => 'Link do Google Drive inválido. Cole o link da pasta (drive/folders/...).',
            ]);
        }

        if (! filled(config('services.google.drive_api_key'))) {
            return response()->json([
                'message' => 'A chave da API do Google Drive não está configurada neste ambiente.',
                'images' => [],
            ], 422);
        }

        $images = $driveImages->listPublicFolderImages($folderId, 80);
        // Limite para a fila de teste (evita travar o browser).
        $images = array_slice($images, 0, 40);

        return response()->json([
            'folder_id' => $folderId,
            'count' => count($images),
            'images' => array_map(static fn (array $img): array => [
                'id' => $img['id'],
                'name' => $img['name'] ?? ('drive-'.$img['id'].'.jpg'),
            ], $images),
        ]);
    }

    /**
     * Proxy de download de um arquivo de imagem do Drive (evita CORS no browser).
     *
     * A API `alt=media` costuma ser bloqueada (403 HTML “automated queries”).
     * Por isso tentamos também uc/thumbnail públicos — o mesmo padrão dos álbuns.
     */
    public function proxyDriveImage(Request $request, string $fileId): HttpResponse|JsonResponse
    {
        if (! preg_match('/^[a-zA-Z0-9_-]+$/', $fileId)) {
            return response()->json(['message' => 'ID de arquivo inválido.'], 422);
        }

        $apiKey = (string) config('services.google.drive_api_key');
        if (trim($apiKey) === '') {
            return response()->json(['message' => 'API do Google Drive não configurada.'], 422);
        }

        $downloaded = $this->downloadDriveImageBytes($fileId, $apiKey);
        if ($downloaded === null) {
            return response()->json([
                'message' => 'Não foi possível baixar a imagem do Drive.',
            ], 502);
        }

        return response($downloaded['body'], 200, [
            'Content-Type' => $downloaded['content_type'],
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    /**
     * @return array{body: string, content_type: string}|null
     */
    private function downloadDriveImageBytes(string $fileId, string $apiKey): ?array
    {
        $browserHeaders = [
            'Accept' => 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'User-Agent' => 'Mozilla/5.0 (compatible; NovaSementeFaceAi/1.0)',
        ];

        $candidates = [
            // Download público direto (alt=media da API costuma cair em 403 antibot)
            [
                'url' => 'https://drive.google.com/uc',
                'query' => ['export' => 'download', 'id' => $fileId],
                'headers' => $browserHeaders,
            ],
            // Thumbnail grande (bom o bastante para face-api)
            [
                'url' => 'https://drive.google.com/thumbnail',
                'query' => ['id' => $fileId, 'sz' => 'w2000'],
                'headers' => $browserHeaders,
            ],
            // API oficial por último
            [
                'url' => 'https://www.googleapis.com/drive/v3/files/'.$fileId,
                'query' => ['key' => $apiKey, 'alt' => 'media'],
                'headers' => ['Accept' => 'image/*,*/*'],
            ],
        ];

        foreach ($candidates as $candidate) {
            $parsed = $this->tryDownloadDriveCandidate($candidate);
            if ($parsed !== null) {
                return $parsed;
            }
        }

        // Último recurso: thumbnailLink lh3 do metadata
        try {
            $meta = Http::timeout(8)->get('https://www.googleapis.com/drive/v3/files/'.$fileId, [
                'key' => $apiKey,
                'fields' => 'thumbnailLink',
            ]);
            $thumb = trim((string) $meta->json('thumbnailLink', ''));
            if ($meta->successful() && $thumb !== '') {
                $thumb = preg_replace('/=s\d+$/', '=s2000', $thumb) ?? $thumb;
                $parsed = $this->tryDownloadDriveCandidate([
                    'url' => $thumb,
                    'query' => [],
                    'headers' => $browserHeaders,
                ]);
                if ($parsed !== null) {
                    return $parsed;
                }
            }
        } catch (\Throwable) {
            // ignore
        }

        return null;
    }

    /**
     * @param  array{url: string, query: array<string, string>, headers: array<string, string>}  $candidate
     * @return array{body: string, content_type: string}|null
     */
    private function tryDownloadDriveCandidate(array $candidate): ?array
    {
        try {
            $response = Http::timeout(45)
                ->withHeaders($candidate['headers'])
                ->withOptions(['allow_redirects' => true])
                ->get($candidate['url'], $candidate['query']);
        } catch (\Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $body = $response->body();
        if ($body === '' || strlen($body) < 100) {
            return null;
        }

        $contentType = (string) ($response->header('Content-Type') ?: '');
        $sniffed = $this->sniffImageContentType($body);
        if ($sniffed !== null) {
            return ['body' => $body, 'content_type' => $sniffed];
        }

        if (str_starts_with($contentType, 'image/')) {
            return [
                'body' => $body,
                'content_type' => strtok($contentType, ';') ?: 'image/jpeg',
            ];
        }

        return null;
    }

    private function sniffImageContentType(string $body): ?string
    {
        if (str_starts_with($body, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }
        if (str_starts_with($body, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }
        if (str_starts_with($body, 'GIF87a') || str_starts_with($body, 'GIF89a')) {
            return 'image/gif';
        }
        if (str_starts_with($body, 'RIFF') && str_contains(substr($body, 0, 16), 'WEBP')) {
            return 'image/webp';
        }

        return null;
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $validated = $request->validate([
            'photo' => ['required', 'image', 'max:5120'],
            'embedding_json' => ['required', 'string', 'max:20000'],
            'model_version' => ['required', 'string', 'max:64'],
            'liveness_passed' => ['required', 'accepted'],
        ]);

        /** @var mixed $decoded */
        $decoded = json_decode($validated['embedding_json'], true);
        if (! is_array($decoded) || count($decoded) < 64 || count($decoded) > 1024) {
            throw ValidationException::withMessages([
                'embedding_json' => 'A matriz facial é inválida. Tente novamente.',
            ]);
        }

        $embedding = [];
        foreach ($decoded as $value) {
            if (! is_numeric($value)) {
                throw ValidationException::withMessages([
                    'embedding_json' => 'A matriz facial é inválida. Tente novamente.',
                ]);
            }
            $embedding[] = (float) $value;
        }
        $dim = count($embedding);

        $churchId = $this->currentChurchId();
        $relativeDir = 'face-id/'.($churchId ?? '0');
        $filename = $user->id.'.jpg';

        $existing = UserFaceIdentity::query()->where('user_id', $user->id)->first();
        if ($existing !== null && $existing->reference_photo_path !== '' && Storage::disk('public')->exists($existing->reference_photo_path)) {
            Storage::disk('public')->delete($existing->reference_photo_path);
        }

        $stored = $request->file('photo')->storeAs($relativeDir, $filename, 'public');

        $identity = UserFaceIdentity::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'church_id' => $churchId,
                'reference_photo_path' => $stored,
                'embedding' => $embedding,
                'embedding_dim' => $dim,
                'model_version' => $validated['model_version'],
                'liveness_passed_at' => now(),
            ],
        );

        $message = 'Rosto cadastrado com sucesso. A identificação está pronta para testes.';
        $request->session()->flash('success', $message);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'identity' => [
                    'id' => $identity->id,
                    'reference_photo_url' => StorageUrl::publicMediaUrl($identity->reference_photo_path),
                    'embedding_dim' => $identity->embedding_dim,
                    'model_version' => $identity->model_version,
                    'liveness_passed_at' => $identity->liveness_passed_at?->toIso8601String(),
                    'updated_at' => $identity->updated_at?->toIso8601String(),
                ],
            ]);
        }

        return redirect()
            ->route('face-ai.index')
            ->with('success', $message);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $identity = UserFaceIdentity::query()->where('user_id', $user->id)->first();
        if ($identity === null) {
            return redirect()->route('face-ai.index');
        }

        if ($identity->reference_photo_path !== '' && Storage::disk('public')->exists($identity->reference_photo_path)) {
            Storage::disk('public')->delete($identity->reference_photo_path);
        }

        $identity->delete();

        return redirect()
            ->route('face-ai.index')
            ->with('success', 'Cadastro facial limpo.');
    }
}
