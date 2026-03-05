<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\News;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $user = $request->user();
        $canManage = $user?->can('news.manage') ?? false;

        $query = News::query()->with('author');

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
            'published_at' => ['nullable', 'date'],
        ]);

        $slugBase = Str::slug($data['title']);
        $slug = $slugBase;
        $i = 1;
        while (News::where('slug', $slug)->exists()) {
            $slug = $slugBase . '-' . $i++;
        }

        $churchId = Church::where('slug', 'nova-semente')->value('id');

        News::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'slug' => $slug,
            'excerpt' => $data['excerpt'] ?? null,
            'body' => $data['body'],
            'image_url' => $data['image_url'] ?? null,
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

        $news->fill([
            'title' => $data['title'],
            'excerpt' => $data['excerpt'] ?? null,
            'body' => $data['body'],
            'image_url' => $data['image_url'] ?? null,
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

