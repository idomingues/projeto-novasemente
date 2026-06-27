<?php

namespace App\Http\Controllers;

use App\Models\RevistaAdventistaArticle;
use App\Services\RevistaAdventistaSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RevistaAdventistaArticleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user?->can('news.view') || $user?->can('news.manage'), 403);

        $canManage = $user?->can('news.manage') ?? false;

        $section = trim((string) $request->query('section', ''));
        $validSections = array_keys(RevistaAdventistaArticle::sectionLabels());
        if ($section !== '' && ! in_array($section, $validSections, true)) {
            $section = '';
        }

        $search = trim((string) $request->query('q', ''));
        if (mb_strlen($search) > 0 && mb_strlen($search) < 2) {
            $search = '';
        }

        $status = trim((string) $request->query('status', 'all'));
        if (! in_array($status, ['all', 'active', 'inactive'], true)) {
            $status = 'all';
        }

        $articles = RevistaAdventistaArticle::query()
            ->when($section !== '', fn ($q) => $q->where('section', $section))
            ->when($search !== '', fn ($q) => $q->search($search))
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->whereNotNull('published_at')
            ->orderByDesc('published_at')
            ->paginate(24)
            ->withQueryString();

        $articles->getCollection()->transform(fn (RevistaAdventistaArticle $article) => [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'section' => $article->section,
            'section_label' => $article->sectionLabel(),
            'author_name' => $article->author_name,
            'source_url' => $article->source_url,
            'image_url' => $article->image_url,
            'cover_url' => $article->image_url,
            'published_at' => $article->published_at?->toIso8601String(),
            'is_active' => (bool) $article->is_active,
        ]);

        return Inertia::render('RevistaAdventista/Index', [
            'articles' => $articles,
            'canManage' => $canManage,
            'sections' => collect(RevistaAdventistaArticle::sectionLabels())
                ->map(fn (string $label, string $key) => ['value' => $key, 'label' => $label])
                ->values()
                ->all(),
            'filters' => [
                'section' => $section !== '' ? $section : null,
                'q' => $search !== '' ? $search : null,
                'status' => $status,
            ],
        ]);
    }

    public function setActive(Request $request, RevistaAdventistaArticle $revistaAdventistaArticle): RedirectResponse
    {
        $this->authorize('news.manage');

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $revistaAdventistaArticle->update(['is_active' => (bool) $data['is_active']]);

        return back()->with(
            'success',
            $revistaAdventistaArticle->is_active
                ? 'Publicação ativada com sucesso.'
                : 'Publicação desativada com sucesso.'
        );
    }

    public function sync(Request $request, RevistaAdventistaSyncService $syncService): RedirectResponse
    {
        $this->authorize('news.manage');

        $years = $request->input('year');
        if (! is_array($years) || $years === []) {
            $years = [2025, 2026];
        }
        $years = array_values(array_map('intval', $years));

        $result = $syncService->sync($years);

        if (! ($result['ok'] ?? false)) {
            return back()->with('error', $result['error'] ?? 'Não foi possível sincronizar a Revista Adventista.');
        }

        return back()->with(
            'success',
            sprintf(
                'Sincronização concluída: %d novos, %d atualizados, %d ignorados.',
                $result['created'],
                $result['updated'],
                $result['skipped'],
            ),
        );
    }
}
