<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Musica;
use App\Models\News;
use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function assertNewsPayload(Request $request, ?News $existing = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', Rule::in([
                News::TYPE_ARTICLE,
                News::TYPE_YOUTUBE,
                News::TYPE_PDF,
                News::TYPE_IMAGE,
                News::TYPE_INSTAGRAM_FEED,
            ])],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string', 'max:65000'],
            'youtube_url' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:2048'],
            'pdf_file' => ['nullable', 'file', 'mimes:pdf', 'max:12288'],
            'published_at' => ['nullable', 'date'],
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

        if ($type === News::TYPE_PDF) {
            $hasFile = $request->hasFile('pdf_file');
            $hasExisting = $existing && $existing->pdf_path;
            if (! $hasFile && ! $hasExisting) {
                throw ValidationException::withMessages([
                    'pdf_file' => 'Envie um ficheiro PDF.',
                ]);
            }
        }

        if ($type === News::TYPE_IMAGE || $type === News::TYPE_INSTAGRAM_FEED) {
            $hasFile = $request->hasFile('image_file');
            $hasUrl = trim((string) ($data['image_url'] ?? '')) !== '';
            $hasExisting = $existing && $existing->image_url;
            if (! $hasFile && ! $hasUrl && ! $hasExisting) {
                throw ValidationException::withMessages([
                    'image_file' => $type === News::TYPE_INSTAGRAM_FEED
                        ? 'Adicione uma imagem para o feed (ficheiro ou URL). Recomendado: 1080 × 1350 px, proporção 4:5 (JPG ou PNG, até 2 MB).'
                        : 'Adicione uma imagem (ficheiro ou URL).',
                ]);
            }
        }

        return $data;
    }

    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $user = $request->user();
        $canManage = $user?->can('news.manage') ?? false;
        $churchId = $this->currentChurchId();

        $query = News::query()->with('author')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        if (! $canManage) {
            $query->whereNotNull('published_at')->where('published_at', '<=', now());
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        }

        $posts = $query
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->paginate(50)
            ->withQueryString();

        $host = $request->getSchemeAndHttpHost();
        $posts->load('author');
        $posts->getCollection()->transform(function (News $n) use ($host) {
            $arr = $n->toArray();
            $arr['cover_url'] = $n->resolvedCoverUrl($host);
            $arr['pdf_url'] = $n->resolvedPdfUrl($host);

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

        $publishedAt = isset($data['published_at']) && $data['published_at'] !== '' ? $data['published_at'] : now();

        News::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'slug' => $slug,
            'content_type' => $data['content_type'],
            'excerpt' => $data['excerpt'] ?? null,
            'body' => trim((string) ($data['body'] ?? '')),
            'youtube_url' => $data['content_type'] === News::TYPE_YOUTUBE ? ($data['youtube_url'] ?? null) : null,
            'pdf_path' => $data['content_type'] === News::TYPE_PDF ? $pdfPath : null,
            'image_url' => $imageUrl,
            'published_at' => $publishedAt,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('news.index')->with('success', 'Notícia criada com sucesso.');
    }

    public function update(Request $request, News $news)
    {
        $this->authorize('news.manage');

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

        $publishedAt = isset($data['published_at']) && $data['published_at'] !== '' ? $data['published_at'] : ($news->published_at ?? now());

        $news->fill([
            'title' => $data['title'],
            'content_type' => $data['content_type'],
            'excerpt' => $data['excerpt'] ?? null,
            'body' => trim((string) ($data['body'] ?? '')),
            'youtube_url' => $data['content_type'] === News::TYPE_YOUTUBE ? ($data['youtube_url'] ?? null) : null,
            'pdf_path' => $pdfPath,
            'image_url' => $imageUrl,
            'published_at' => $publishedAt,
        ])->save();

        return redirect()->route('news.index')->with('success', 'Notícia atualizada com sucesso.');
    }

    public function destroy(News $news)
    {
        $this->authorize('news.manage');

        $news->delete();

        return redirect()->route('news.index')->with('success', 'Notícia removida com sucesso.');
    }
}
