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

class NewsController extends Controller
{
    public function __construct(
        private readonly PublicationBroadcastNotifier $publicationBroadcast,
    ) {}

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function normalizeNewsBody(string $body): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $body);
        // Colapsa espaços no fim de cada linha; mantém linhas vazias (parágrafos).
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
            \UPLOAD_ERR_INI_SIZE, \UPLOAD_ERR_FORM_SIZE => 'Arquivo demasiado grande para o servidor. Vídeo até 50 MB na app — confirme Nginx client_max_body_size 64M e PHP upload_max_filesize 64M (ver deployment/apply-upload-limits.sh).',
            \UPLOAD_ERR_PARTIAL => 'Upload cortado a meio (muito comum com Nginx: aumente client_max_body_size para 64M e recarregue o Nginx).',
            \UPLOAD_ERR_NO_FILE => 'Nenhum arquivo foi recebido.',
            default => 'O arquivo não chegou ao servidor por completo. Revise limites Nginx (client_max_body_size) e PHP (upload_max_filesize, post_max_size).',
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

    private function assertNewsPayload(Request $request, ?News $existing = null): array
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
            'has_video' => ['nullable', 'boolean'],
        ], [
            'excerpt.max' => 'O resumo pode ter no máximo 500 caracteres.',
            'image_file.uploaded' => 'A imagem não chegou ao servidor (413?). Aumente client_max_body_size no Nginx para 64M.',
            'video_file.uploaded' => 'O vídeo não chegou ao servidor (413?). Aumente client_max_body_size no Nginx para 64M e PHP upload_max_filesize para 64M.',
            'video_file.max' => 'O vídeo pode ter no máximo 50 MB.',
            'pdf_file.uploaded' => 'O PDF não chegou ao servidor por completo. Revise limites de upload no Nginx e PHP.',
        ]);

        $type = $data['content_type'];

        if ($type === News::TYPE_ARTICLE && trim((string) ($data['body'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'body' => 'Escreva o conteúdo da notícia.',
            ]);
        }

        if ($type === News::TYPE_YOUTUBE) {
            $url = trim((string) ($data['youtube_url'] ?? ''));
            if ($url === '') {
                throw ValidationException::withMessages([
                    'youtube_url' => 'Indique o link do vídeo no YouTube.',
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
                    'instagram_url' => 'Indique o link da publicação no Instagram.',
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
                    'image_file' => 'Adicione uma imagem ou um vídeo para o feed.',
                    'video_file' => 'Adicione uma imagem ou um vídeo para o feed.',
                ]);
            }

            $this->normalizeOptionalInstagramUrl($data);
        }

        if (in_array($type, [News::TYPE_ARTICLE, News::TYPE_IMAGE, News::TYPE_YOUTUBE, News::TYPE_PDF], true)) {
            $this->normalizeOptionalInstagramUrl($data);
        }

        $data['has_video'] = $request->boolean('has_video');

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
            News::TYPE_INSTAGRAM_LINK,
            News::TYPE_INSTAGRAM_FEED,
            News::TYPE_ARTICLE,
            News::TYPE_IMAGE,
            News::TYPE_YOUTUBE,
            News::TYPE_PDF => $instagramUrl,
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
            ->where('section', News::SECTION_NEWS)
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

        return Inertia::render('News/Index', [
            'posts' => $posts,
            'filters' => ['search' => $search],
            'canManage' => $canManage,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('news.manage');

        $data = $this->assertNewsPayload($request, null);

        $slugBase = Str::slug($data['title']);
        $slug = $slugBase;
        $i = 1;
        while (News::where('slug', $slug)->exists()) {
            $slug = $slugBase.'-'.$i++;
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('news.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        $imageUrl = null;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('news', 'public');
            $imageUrl = StorageUrl::publicMediaUrl($path);
        } else {
            $t = trim((string) ($data['image_url'] ?? ''));
            $imageUrl = $t !== '' ? $t : null;
        }

        $pdfPath = null;
        if ($data['content_type'] === News::TYPE_PDF && $request->hasFile('pdf_file')) {
            $pdfPath = $request->file('pdf_file')->store('news/pdfs', 'public');
        }

        $videoPath = null;
        if ($data['content_type'] === News::TYPE_INSTAGRAM_FEED && $request->hasFile('video_file')) {
            $videoPath = $request->file('video_file')->store('news/videos', 'public');
        }

        $publishedAt = isset($data['published_at']) && $data['published_at'] !== '' ? $data['published_at'] : now();

        $news = News::create([
            'church_id' => $churchId,
            'section' => News::SECTION_NEWS,
            'title' => $data['title'],
            'slug' => $slug,
            'content_type' => $data['content_type'],
            'excerpt' => $data['content_type'] === News::TYPE_INSTAGRAM_FEED
                ? null
                : $this->normalizeExcerpt($data['excerpt'] ?? null),
            'body' => $data['content_type'] === News::TYPE_PDF
                ? ''
                : $this->normalizeNewsBody((string) ($data['body'] ?? '')),
            'youtube_url' => $data['content_type'] === News::TYPE_YOUTUBE ? ($data['youtube_url'] ?? null) : null,
            'instagram_url' => $this->instagramUrlForSave($data['content_type'], $data['instagram_url'] ?? null),
            'pdf_path' => $data['content_type'] === News::TYPE_PDF ? $pdfPath : null,
            'video_path' => $data['content_type'] === News::TYPE_INSTAGRAM_FEED ? $videoPath : null,
            'has_video' => (bool) ($data['has_video'] ?? false),
            'image_url' => $imageUrl,
            'published_at' => $publishedAt,
            'created_by' => $request->user()?->id,
        ]);

        $this->publicationBroadcast->notifyNews($news, $request->user()?->id);

        return ListModalRedirect::toIndexEdit('news.index', $news, 'Notícia criada com sucesso.');
    }

    public function update(Request $request, News $news)
    {
        $this->authorize('news.manage');
        abort_unless($news->section === News::SECTION_NEWS, 404);

        $data = $this->assertNewsPayload($request, $news);

        if ($data['title'] !== $news->title) {
            $slugBase = Str::slug($data['title']);
            $slug = $slugBase;
            $i = 1;
            while (News::where('slug', $slug)->where('id', '!=', $news->id)->exists()) {
                $slug = $slugBase.'-'.$i++;
            }
            $news->slug = $slug;
        }

        $imageUrl = $news->image_url;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('news', 'public');
            $imageUrl = StorageUrl::publicMediaUrl($path);
        } else {
            $t = trim((string) ($data['image_url'] ?? ''));
            $imageUrl = $t !== '' ? $t : null;
        }

        $pdfPath = $news->pdf_path;
        if ($data['content_type'] === News::TYPE_PDF) {
            if ($request->hasFile('pdf_file')) {
                $pdfPath = $request->file('pdf_file')->store('news/pdfs', 'public');
            }
        } else {
            $pdfPath = null;
        }

        $videoPath = $news->video_path;
        if ($data['content_type'] === News::TYPE_INSTAGRAM_FEED) {
            if ($request->hasFile('video_file')) {
                $videoPath = $request->file('video_file')->store('news/videos', 'public');
            }
        } else {
            $videoPath = null;
        }

        $publishedAt = isset($data['published_at']) && $data['published_at'] !== '' ? $data['published_at'] : ($news->published_at ?? now());

        $news->fill([
            'section' => News::SECTION_NEWS,
            'title' => $data['title'],
            'content_type' => $data['content_type'],
            'excerpt' => $data['content_type'] === News::TYPE_INSTAGRAM_FEED
                ? null
                : $this->normalizeExcerpt($data['excerpt'] ?? null),
            'body' => $data['content_type'] === News::TYPE_PDF
                ? ''
                : $this->normalizeNewsBody((string) ($data['body'] ?? '')),
            'youtube_url' => $data['content_type'] === News::TYPE_YOUTUBE ? ($data['youtube_url'] ?? null) : null,
            'instagram_url' => $this->instagramUrlForSave($data['content_type'], $data['instagram_url'] ?? null),
            'pdf_path' => $pdfPath,
            'video_path' => $videoPath,
            'has_video' => (bool) ($data['has_video'] ?? false),
            'image_url' => $imageUrl,
            'published_at' => $publishedAt,
        ])->save();

        return ListModalRedirect::toIndexEdit('news.index', $news->fresh(), 'Notícia atualizada com sucesso.');
    }

    public function setActive(Request $request, News $news)
    {
        $this->authorize('news.manage');
        abort_unless($news->section === News::SECTION_NEWS, 404);

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $news->update(['is_active' => (bool) $data['is_active']]);

        return redirect()->route('news.index')->with(
            'success',
            $news->is_active ? 'Notícia ativada com sucesso.' : 'Notícia desativada com sucesso.'
        );
    }

    public function destroy(News $news)
    {
        $this->authorize('news.manage');
        abort_unless($news->section === News::SECTION_NEWS, 404);

        $news->delete();

        return redirect()->route('news.index')->with('success', 'Notícia removida com sucesso.');
    }
}
