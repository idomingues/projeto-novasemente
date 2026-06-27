<?php

namespace App\Http\Controllers;

use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\Musica;
use App\Models\News;
use App\Services\PublicationBroadcastNotifier;
use App\Support\InstagramUrl;
use App\Support\SearchTerm;
use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class HealthController extends Controller
{
    public function __construct(
        private readonly PublicationBroadcastNotifier $publicationBroadcast,
    ) {}

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function normalizeBody(string $body): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $body);
        $lines = array_map(
            static fn (string $line) => rtrim(preg_replace('/[^\S\n]+/u', ' ', $line) ?? $line),
            explode("\n", $normalized),
        );

        return trim(implode("\n", $lines));
    }

    private function normalizeExcerpt(?string $excerpt): ?string
    {
        $text = trim((string) $excerpt);
        if ($text === '') {
            return null;
        }

        return Str::limit($text, 500, '…');
    }

    private function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            \UPLOAD_ERR_INI_SIZE, \UPLOAD_ERR_FORM_SIZE => 'Arquivo muito grande para o servidor. Vídeo até 50 MB na app — confirme Nginx client_max_body_size 64M e PHP upload_max_filesize 64M.',
            \UPLOAD_ERR_PARTIAL => 'Upload interrompido antes de concluir. Ajuste limites do Nginx/PHP e tente novamente.',
            \UPLOAD_ERR_NO_FILE => 'Nenhum arquivo foi recebido.',
            default => 'O arquivo não chegou completo ao servidor. Revise limites de upload do Nginx e PHP.',
        };
    }

    private function assertUploadFilesValid(Request $request): void
    {
        foreach (['image_file', 'video_file', 'pdf_file'] as $field) {
            $file = $request->file($field);
            if ($file !== null && ! $file->isValid()) {
                throw ValidationException::withMessages([
                    $field => $this->uploadErrorMessage($file->getError()),
                ]);
            }
        }
    }

    private function assertPayload(Request $request, ?News $existing = null): array
    {
        $this->assertUploadFilesValid($request);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', Rule::in([
                News::TYPE_ARTICLE,
                News::TYPE_YOUTUBE,
                News::TYPE_PDF,
                News::TYPE_IMAGE,
                News::TYPE_INSTAGRAM_FEED,
                News::TYPE_INSTAGRAM_LINK,
            ])],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string', 'max:65000'],
            'youtube_url' => ['nullable', 'string', 'max:500'],
            'instagram_url' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:2048'],
            'video_file' => ['nullable', 'file', 'mimes:mp4,mov,quicktime,webm', 'max:51200'],
            'pdf_file' => ['nullable', 'file', 'mimes:pdf', 'max:12288'],
            'published_at' => ['nullable', 'date'],
        ], [
            'title.required' => 'Informe o título da publicação de saúde.',
            'excerpt.max' => 'O resumo pode ter no máximo 500 caracteres.',
            'body.max' => 'O conteúdo pode ter no máximo 65.000 caracteres. Reduza o texto ou divida em partes.',
            'image_url.max' => 'A URL da capa é muito longa. Envie a imagem como arquivo em vez de colar link enorme.',
            'image_file.uploaded' => 'A imagem não chegou ao servidor (413?). Aumente client_max_body_size no Nginx para 64M.',
            'video_file.uploaded' => 'O vídeo não chegou ao servidor (413?). Aumente client_max_body_size no Nginx para 64M e PHP upload_max_filesize para 64M.',
            'video_file.max' => 'O vídeo pode ter no máximo 50 MB.',
            'pdf_file.uploaded' => 'O PDF não chegou ao servidor por completo. Revise limites de upload no Nginx e PHP.',
        ]);

        $type = $data['content_type'];

        if ($type === News::TYPE_ARTICLE && trim((string) ($data['body'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'body' => 'Escreva o conteúdo da publicação de saúde.',
            ]);
        }

        if ($type === News::TYPE_YOUTUBE) {
            $url = trim((string) ($data['youtube_url'] ?? ''));
            if ($url === '') {
                throw ValidationException::withMessages([
                    'youtube_url' => 'Informe o link do vídeo no YouTube.',
                ]);
            }
            if (! Musica::youtubeVideoId($url)) {
                throw ValidationException::withMessages([
                    'youtube_url' => 'Link do YouTube inválido.',
                ]);
            }
            $data['youtube_url'] = $url;
        }

        if ($type === News::TYPE_INSTAGRAM_LINK) {
            $url = trim((string) ($data['instagram_url'] ?? ''));
            if ($url === '') {
                throw ValidationException::withMessages([
                    'instagram_url' => 'Informe o link da publicação no Instagram.',
                ]);
            }
            $normalized = InstagramUrl::normalize($url);
            if ($normalized === null) {
                throw ValidationException::withMessages([
                    'instagram_url' => 'Link do Instagram inválido. Use um link de post, reel ou IGTV.',
                ]);
            }
            $data['instagram_url'] = $normalized;
        }

        if ($type === News::TYPE_PDF) {
            $hasFile = $request->hasFile('pdf_file');
            $hasExisting = $existing && $existing->pdf_path;
            if (! $hasFile && ! $hasExisting) {
                throw ValidationException::withMessages([
                    'pdf_file' => 'Envie um arquivo PDF.',
                ]);
            }
        }

        if ($type === News::TYPE_IMAGE) {
            $hasFile = $request->hasFile('image_file');
            $hasUrl = trim((string) ($data['image_url'] ?? '')) !== '';
            $hasExisting = $existing && $existing->image_url;
            if (! $hasFile && ! $hasUrl && ! $hasExisting) {
                throw ValidationException::withMessages([
                    'image_file' => 'Adicione uma imagem (arquivo ou URL).',
                ]);
            }
        }

        if ($type === News::TYPE_INSTAGRAM_FEED) {
            $hasImageFile = $request->hasFile('image_file');
            $hasImageUrl = trim((string) ($data['image_url'] ?? '')) !== '';
            $hasExistingImage = $existing && $existing->image_url;
            $hasVideoFile = $request->hasFile('video_file');
            $hasExistingVideo = $existing && $existing->video_path;

            if (! $hasImageFile && ! $hasImageUrl && ! $hasExistingImage && ! $hasVideoFile && ! $hasExistingVideo) {
                throw ValidationException::withMessages([
                    'image_file' => 'Adicione uma imagem ou um vídeo para a publicação.',
                    'video_file' => 'Adicione uma imagem ou um vídeo para a publicação.',
                ]);
            }

            $this->normalizeOptionalInstagramUrl($data);
        }

        return $data;
    }

    /** @param  array<string, mixed>  $data */
    private function normalizeOptionalInstagramUrl(array &$data): void
    {
        $url = trim((string) ($data['instagram_url'] ?? ''));
        if ($url === '') {
            $data['instagram_url'] = null;

            return;
        }

        $normalized = InstagramUrl::normalize($url);
        if ($normalized === null) {
            throw ValidationException::withMessages([
                'instagram_url' => 'Link do Instagram inválido. Use um link de post, reel ou IGTV.',
            ]);
        }

        $data['instagram_url'] = $normalized;
    }

    private function instagramUrlForSave(string $contentType, ?string $instagramUrl): ?string
    {
        return match ($contentType) {
            News::TYPE_INSTAGRAM_LINK, News::TYPE_INSTAGRAM_FEED => $instagramUrl,
            default => null,
        };
    }

    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $user = $request->user();
        $canManage = $user?->can('news.manage') ?? false;
        $churchId = $this->currentChurchId();

        $query = News::query()->with('author')
            ->where('section', News::SECTION_HEALTH)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        if (! $canManage) {
            $query->visibleToPublic();
        }

        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($query, ['title', 'excerpt', 'body'], $search);
        }

        $posts = $query
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->paginate(50)
            ->withQueryString();

        $host = $request->getSchemeAndHttpHost();
        $posts->load('author');
        $posts->getCollection()->transform(function (News $n) use ($host) {
            $arr = $n->toArray();
            $arr['cover_url'] = $n->resolvedCoverUrl($host);
            $arr['pdf_url'] = $n->resolvedPdfUrl($host);
            $arr['video_url'] = $n->resolvedVideoUrl($host);

            if ($n->author !== null) {
                $photoUrl = $n->author->photo_url;
                if ($photoUrl && ! str_starts_with($photoUrl, 'http')) {
                    $photoUrl = $host.$photoUrl;
                }
                $arr['author'] = [
                    'name' => (string) $n->author->name,
                    'photo_url' => $photoUrl,
                ];
            }

            return $arr;
        });

        return Inertia::render('Health/Index', [
            'posts' => $posts,
            'filters' => ['search' => $search],
            'canManage' => $canManage,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('news.manage');

        $data = $this->assertPayload($request, null);

        $slugBase = Str::slug($data['title']);
        if ($slugBase === '') {
            $slugBase = 'saude-'.now()->format('Ymd-His');
        }
        $slug = $slugBase;
        $i = 1;
        while (News::where('slug', $slug)->exists()) {
            $slug = $slugBase.'-'.$i++;
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('health.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        $imageUrl = null;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('health', 'public');
            $imageUrl = StorageUrl::publicMediaUrl($path);
        } else {
            $t = trim((string) ($data['image_url'] ?? ''));
            $imageUrl = $t !== '' ? $t : null;
        }

        $pdfPath = null;
        if ($data['content_type'] === News::TYPE_PDF && $request->hasFile('pdf_file')) {
            $pdfPath = $request->file('pdf_file')->store('health/pdfs', 'public');
        }

        $videoPath = null;
        if ($data['content_type'] === News::TYPE_INSTAGRAM_FEED && $request->hasFile('video_file')) {
            $videoPath = $request->file('video_file')->store('health/videos', 'public');
        }

        $publishedAt = isset($data['published_at']) && $data['published_at'] !== '' ? $data['published_at'] : now();

        $health = News::create([
            'church_id' => $churchId,
            'section' => News::SECTION_HEALTH,
            'title' => $data['title'],
            'slug' => $slug,
            'content_type' => $data['content_type'],
            'excerpt' => $data['content_type'] === News::TYPE_INSTAGRAM_FEED
                ? null
                : $this->normalizeExcerpt($data['excerpt'] ?? null),
            'body' => $data['content_type'] === News::TYPE_PDF
                ? ''
                : $this->normalizeBody((string) ($data['body'] ?? '')),
            'youtube_url' => $data['content_type'] === News::TYPE_YOUTUBE ? ($data['youtube_url'] ?? null) : null,
            'instagram_url' => $this->instagramUrlForSave($data['content_type'], $data['instagram_url'] ?? null),
            'pdf_path' => $data['content_type'] === News::TYPE_PDF ? $pdfPath : null,
            'video_path' => $data['content_type'] === News::TYPE_INSTAGRAM_FEED ? $videoPath : null,
            'image_url' => $imageUrl,
            'published_at' => $publishedAt,
            'created_by' => $request->user()?->id,
        ]);

        $this->publicationBroadcast->notifyNews($health, $request->user()?->id);

        return ListModalRedirect::toIndexEdit('health.index', $health, 'Publicação de saúde criada com sucesso.');
    }

    public function update(Request $request, News $health)
    {
        $this->authorize('news.manage');
        abort_unless($health->section === News::SECTION_HEALTH, 404);

        $data = $this->assertPayload($request, $health);

        if ($data['title'] !== $health->title) {
            $slugBase = Str::slug($data['title']);
            if ($slugBase === '') {
                $slugBase = 'saude-'.now()->format('Ymd-His');
            }
            $slug = $slugBase;
            $i = 1;
            while (News::where('slug', $slug)->where('id', '!=', $health->id)->exists()) {
                $slug = $slugBase.'-'.$i++;
            }
            $health->slug = $slug;
        }

        $imageUrl = $health->image_url;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('health', 'public');
            $imageUrl = StorageUrl::publicMediaUrl($path);
        } else {
            $t = trim((string) ($data['image_url'] ?? ''));
            $imageUrl = $t !== '' ? $t : null;
        }

        $pdfPath = $health->pdf_path;
        if ($data['content_type'] === News::TYPE_PDF) {
            if ($request->hasFile('pdf_file')) {
                $pdfPath = $request->file('pdf_file')->store('health/pdfs', 'public');
            }
        } else {
            $pdfPath = null;
        }

        $videoPath = $health->video_path;
        if ($data['content_type'] === News::TYPE_INSTAGRAM_FEED) {
            if ($request->hasFile('video_file')) {
                $videoPath = $request->file('video_file')->store('health/videos', 'public');
            }
        } else {
            $videoPath = null;
        }

        $publishedAt = isset($data['published_at']) && $data['published_at'] !== '' ? $data['published_at'] : ($health->published_at ?? now());

        $health->fill([
            'section' => News::SECTION_HEALTH,
            'title' => $data['title'],
            'content_type' => $data['content_type'],
            'excerpt' => $data['content_type'] === News::TYPE_INSTAGRAM_FEED
                ? null
                : $this->normalizeExcerpt($data['excerpt'] ?? null),
            'body' => $data['content_type'] === News::TYPE_PDF
                ? ''
                : $this->normalizeBody((string) ($data['body'] ?? '')),
            'youtube_url' => $data['content_type'] === News::TYPE_YOUTUBE ? ($data['youtube_url'] ?? null) : null,
            'instagram_url' => $this->instagramUrlForSave($data['content_type'], $data['instagram_url'] ?? null),
            'pdf_path' => $pdfPath,
            'video_path' => $videoPath,
            'image_url' => $imageUrl,
            'published_at' => $publishedAt,
        ])->save();

        return ListModalRedirect::toIndexEdit('health.index', $health->fresh(), 'Publicação de saúde atualizada com sucesso.');
    }

    public function setActive(Request $request, News $health)
    {
        $this->authorize('news.manage');
        abort_unless($health->section === News::SECTION_HEALTH, 404);

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $health->update(['is_active' => (bool) $data['is_active']]);

        return redirect()->route('health.index')->with(
            'success',
            $health->is_active ? 'Publicação ativada com sucesso.' : 'Publicação desativada com sucesso.'
        );
    }

    public function destroy(News $health)
    {
        $this->authorize('news.manage');
        abort_unless($health->section === News::SECTION_HEALTH, 404);

        $health->delete();

        return redirect()->route('health.index')->with('success', 'Publicação de saúde removida com sucesso.');
    }
}
