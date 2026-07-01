<?php

namespace App\Http\Controllers;

use App\Models\RevistaAdventistaEdition;
use App\Services\RevistaAdventistaArchiveSyncService;
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
        $baseUrl = $request->getSchemeAndHttpHost();

        $year = (int) $request->query('ano', 0);
        $availableYears = RevistaAdventistaEdition::query()
            ->select('year')
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->map(fn ($value) => (int) $value)
            ->values()
            ->all();

        if ($year <= 0) {
            $year = $availableYears[0] ?? (int) date('Y');
        }

        $status = trim((string) $request->query('status', 'all'));
        if (! in_array($status, ['all', 'active', 'inactive'], true)) {
            $status = 'all';
        }

        $editions = RevistaAdventistaEdition::query()
            ->when($year > 0, fn ($q) => $q->where('year', $year))
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderByDesc('year')
            ->orderBy('month')
            ->paginate(24)
            ->withQueryString();

        $editions->getCollection()->transform(fn (RevistaAdventistaEdition $edition) => [
            'id' => $edition->id,
            'title' => $edition->title,
            'year' => $edition->year,
            'month' => $edition->month,
            'month_label' => $edition->monthLabel(),
            'cover_url' => $edition->resolvedCoverUrl($baseUrl),
            'has_pdf' => $edition->hasLocalPdf() || $edition->resolvedSourcePdfUrl() !== null,
            'pdf_cached' => $edition->hasLocalPdf(),
            'cover_cached' => $edition->hasLocalCover(),
            'is_active' => (bool) $edition->is_active,
            'synced_at' => $edition->synced_at?->toIso8601String(),
        ]);

        return Inertia::render('RevistaAdventista/Index', [
            'editions' => $editions,
            'canManage' => $canManage,
            'availableYears' => $availableYears,
            'filters' => [
                'ano' => $year,
                'status' => $status,
            ],
        ]);
    }

    public function setEditionActive(Request $request, RevistaAdventistaEdition $revistaAdventistaEdition): RedirectResponse
    {
        $this->authorize('news.manage');

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $revistaAdventistaEdition->update(['is_active' => (bool) $data['is_active']]);

        return back()->with(
            'success',
            $revistaAdventistaEdition->is_active
                ? 'Edição ativada com sucesso.'
                : 'Edição desativada com sucesso.'
        );
    }

    public function syncArchive(Request $request, RevistaAdventistaArchiveSyncService $syncService): RedirectResponse
    {
        $this->authorize('news.manage');

        $years = $request->input('year');
        if (! is_array($years) || $years === []) {
            $years = null;
        } else {
            $years = array_values(array_map('intval', $years));
        }

        $cachePdfs = (bool) $request->boolean('cache_pdfs');
        $forceCovers = (bool) $request->boolean('force_covers');

        $result = $syncService->sync($years, cachePdfs: $cachePdfs, forceCovers: $forceCovers);

        if (! ($result['ok'] ?? false)) {
            return back()->with('error', $result['error'] ?? 'Não foi possível sincronizar o acervo da Revista Adventista.');
        }

        return back()->with(
            'success',
            sprintf(
                'Acervo sincronizado: %d novas, %d atualizadas, %d ignoradas, %d capas baixadas, %d PDFs baixados.',
                $result['created'],
                $result['updated'],
                $result['skipped'],
                $result['covers_downloaded'],
                $result['pdfs_downloaded'],
            ),
        );
    }

    public function syncArticles(Request $request, RevistaAdventistaSyncService $syncService): RedirectResponse
    {
        $this->authorize('news.manage');

        $years = $request->input('year');
        if (! is_array($years) || $years === []) {
            $years = [2025, 2026];
        }
        $years = array_values(array_map('intval', $years));

        $result = $syncService->sync($years);

        if (! ($result['ok'] ?? false)) {
            return back()->with('error', $result['error'] ?? 'Não foi possível sincronizar os artigos da Revista Adventista.');
        }

        return back()->with(
            'success',
            sprintf(
                'Artigos sincronizados: %d novos, %d atualizados, %d ignorados.',
                $result['created'],
                $result['updated'],
                $result['skipped'],
            ),
        );
    }
}
