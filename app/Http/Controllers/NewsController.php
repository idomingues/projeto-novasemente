<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\News;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    private function currentChurchId(): ?int
    {
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return (int) $church->id;
            }
        }
        return Church::where('active', true)->orderBy('name')->value('id');
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

        if (!$canManage) {
            $query->whereNotNull('published_at')->where('published_at', '<=', now());
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        $posts = $query
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('News/Index', [
            'posts' => $posts,
            'filters' => ['search' => $search],
            'canManage' => $canManage,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('news.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:2048'],
            'published_at' => ['nullable', 'date'],
        ]);

        $slugBase = Str::slug($data['title']);
        $slug = $slugBase;
        $i = 1;
        while (News::where('slug', $slug)->exists()) {
            $slug = $slugBase . '-' . $i++;
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('news.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        $imageUrl = $data['image_url'] ?? null;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('news', 'public');
            $imageUrl = Storage::disk('public')->url($path);
        }

        News::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'slug' => $slug,
            'excerpt' => $data['excerpt'] ?? null,
            'body' => $data['body'],
            'image_url' => $imageUrl,
            'published_at' => $data['published_at'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('news.index')->with('success', 'Notícia criada com sucesso.');
    }

    public function update(Request $request, News $news)
    {
        $this->authorize('news.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:2048'],
            'published_at' => ['nullable', 'date'],
        ]);

        if ($data['title'] !== $news->title) {
            $slugBase = Str::slug($data['title']);
            $slug = $slugBase;
            $i = 1;
            while (News::where('slug', $slug)->where('id', '!=', $news->id)->exists()) {
                $slug = $slugBase . '-' . $i++;
            }
            $news->slug = $slug;
        }

        $imageUrl = $data['image_url'] ?? $news->image_url;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('news', 'public');
            $imageUrl = Storage::disk('public')->url($path);
        }

        $news->fill([
            'title' => $data['title'],
            'excerpt' => $data['excerpt'] ?? null,
            'body' => $data['body'],
            'image_url' => $imageUrl,
            'published_at' => $data['published_at'] ?? null,
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

