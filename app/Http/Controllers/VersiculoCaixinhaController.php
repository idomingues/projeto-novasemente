<?php

namespace App\Http\Controllers;

use App\Models\VersiculoCaixinha;
use App\Services\PromiseBoxAiSuggestService;
use App\Services\PromiseBoxImportService;
use App\Services\PromiseBoxVerseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VersiculoCaixinhaController extends Controller
{
    public function __construct(
        private PromiseBoxVerseService $verseService,
        private PromiseBoxImportService $importService,
        private PromiseBoxAiSuggestService $aiService,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);

        if (! $this->verseService->tableReady()) {
            return Inertia::render('VersiculosCaixinha/Index', [
                'rows' => [],
                'stats' => $this->emptyIndexStats(),
                'categories' => config('promise_box.categories', []),
                'books' => [],
                'schemaReady' => false,
                'bibleReady' => $this->verseService->bibleReady(),
                'canManage' => true,
                'importResult' => $request->session()->get('importResult'),
                'aiConfigured' => $this->aiService->isConfigured(),
                'aiDefaultPrompt' => config('promise_box.ai_default_prompt'),
            ]);
        }

        $search = trim((string) $request->query('q', ''));
        $categoria = trim((string) $request->query('categoria', ''));
        $ativo = $request->query('ativo');

        $query = VersiculoCaixinha::query()->orderByDesc('peso')->orderByDesc('nota')->orderBy('livro')->orderBy('capitulo')->orderBy('versiculo_inicio');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('livro', 'like', '%'.$search.'%')
                    ->orWhere('categoria', 'like', '%'.$search.'%');
            });
        }

        if ($categoria !== '') {
            $query->where('categoria', $categoria);
        }

        if ($ativo === '1' || $ativo === '0') {
            $query->where('ativo', $ativo === '1');
        }

        $rows = $query->get()->map(fn (VersiculoCaixinha $row) => $this->mapRow($row));

        return Inertia::render('VersiculosCaixinha/Index', [
            'rows' => $rows,
            'stats' => $this->buildIndexStats(),
            'categories' => config('promise_box.categories', []),
            'books' => $this->verseService->bookNames(),
            'schemaReady' => true,
            'bibleReady' => $this->verseService->bibleReady(),
            'canManage' => true,
            'filters' => [
                'q' => $search,
                'categoria' => $categoria,
                'ativo' => is_string($ativo) ? $ativo : '',
            ],
            'importResult' => $request->session()->get('importResult'),
            'aiConfigured' => $this->aiService->isConfigured(),
            'aiDefaultPrompt' => config('promise_box.ai_default_prompt'),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);
        abort_unless($this->verseService->tableReady(), 400);

        $valid = $this->validatePayload($request);

        if ($this->verseService->isDuplicate($valid['livro'], $valid['capitulo'], $valid['versiculo_inicio'], $valid['versiculo_fim'])) {
            return back()->withErrors(['livro' => 'Esta referência já está cadastrada na Caixa de Promessas.'])->withInput();
        }

        if ($this->verseService->resolveReference($valid['livro'], $valid['capitulo'], $valid['versiculo_inicio'], $valid['versiculo_fim']) === null) {
            return back()->withErrors(['livro' => 'Referência não encontrada na Bíblia importada.'])->withInput();
        }

        VersiculoCaixinha::create($valid);

        return redirect()->route('promise-box-verses.index')->with('success', 'Promessa adicionada.');
    }

    public function update(Request $request, VersiculoCaixinha $versiculoCaixinha)
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);
        abort_unless($this->verseService->tableReady(), 400);

        $valid = $this->validatePayload($request);

        if ($this->verseService->isDuplicate($valid['livro'], $valid['capitulo'], $valid['versiculo_inicio'], $valid['versiculo_fim'], $versiculoCaixinha->id)) {
            return back()->withErrors(['livro' => 'Esta referência já está cadastrada na Caixa de Promessas.'])->withInput();
        }

        if ($this->verseService->resolveReference($valid['livro'], $valid['capitulo'], $valid['versiculo_inicio'], $valid['versiculo_fim']) === null) {
            return back()->withErrors(['livro' => 'Referência não encontrada na Bíblia importada.'])->withInput();
        }

        $versiculoCaixinha->update($valid);

        return redirect()->route('promise-box-verses.index')->with('success', 'Promessa atualizada.');
    }

    public function destroy(Request $request, VersiculoCaixinha $versiculoCaixinha)
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);
        abort_unless($this->verseService->tableReady(), 400);

        $versiculoCaixinha->delete();

        return redirect()->route('promise-box-verses.index')->with('success', 'Promessa removida.');
    }

    public function importPopular(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);
        abort_unless($this->verseService->tableReady(), 400);

        $result = $this->importService->previewPopular();

        return response()->json($result, ($result['ok'] ?? false) ? 200 : 422);
    }

    public function scanBible(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);
        abort_unless($this->verseService->tableReady(), 400);

        $valid = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'min_nota' => ['nullable', 'integer', 'min:6', 'max:10'],
        ]);

        $result = $this->importService->previewScanBible(
            limit: (int) ($valid['limit'] ?? 50),
            minNota: (int) ($valid['min_nota'] ?? 8),
        );

        return response()->json($result, ($result['ok'] ?? false) ? 200 : 422);
    }

    public function aiPreview(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);
        abort_unless($this->verseService->tableReady(), 400);

        $valid = $request->validate([
            'prompt' => ['required', 'string', 'min:10', 'max:2000'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $result = $this->aiService->preview(
            prompt: (string) $valid['prompt'],
            limit: (int) ($valid['limit'] ?? 15),
        );

        return response()->json($result, ($result['ok'] ?? false) ? 200 : 422);
    }

    public function importSelected(Request $request)
    {
        abort_unless($request->user()?->can('library.manage') ?? false, 403);
        abort_unless($this->verseService->tableReady(), 400);

        $categories = config('promise_box.categories', []);

        $valid = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.livro' => ['required', 'string', 'max:50'],
            'items.*.capitulo' => ['required', 'integer', 'min:1', 'max:200'],
            'items.*.versiculo_inicio' => ['required', 'integer', 'min:1', 'max:200'],
            'items.*.versiculo_fim' => ['required', 'integer', 'min:1', 'max:200'],
            'items.*.categoria' => ['required', 'string', Rule::in($categories)],
            'items.*.nota' => ['required', 'integer', 'min:1', 'max:10'],
            'items.*.peso' => ['required', 'integer', 'min:1', 'max:10'],
        ]);

        $result = $this->importService->importSelected($valid['items']);

        return redirect()
            ->route('promise-box-verses.index')
            ->with('success', sprintf('%d promessa(s) importada(s).', $result['imported']))
            ->with('importResult', $result);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request): array
    {
        $categories = config('promise_box.categories', []);

        $valid = $request->validate([
            'livro' => ['required', 'string', 'max:50'],
            'capitulo' => ['required', 'integer', 'min:1', 'max:200'],
            'versiculo_inicio' => ['required', 'integer', 'min:1', 'max:200'],
            'versiculo_fim' => ['required', 'integer', 'min:1', 'max:200'],
            'categoria' => ['required', 'string', Rule::in($categories)],
            'nota' => ['required', 'integer', 'min:1', 'max:10'],
            'peso' => ['required', 'integer', 'min:1', 'max:10'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        if ((int) $valid['versiculo_fim'] < (int) $valid['versiculo_inicio']) {
            [$valid['versiculo_inicio'], $valid['versiculo_fim']] = [$valid['versiculo_fim'], $valid['versiculo_inicio']];
        }

        $valid['ativo'] = $request->boolean('ativo', true);

        return $valid;
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array{
     *     total: int,
     *     active: int,
     *     inactive: int,
     *     categoriesUsed: int,
     *     books: int,
     *     avgNota: float,
     *     avgPeso: float,
     *     byCategory: list<array{categoria: string, total: int, active: int}>
     * }
     */
    private function buildIndexStats(): array
    {
        $total = VersiculoCaixinha::query()->count();
        $active = VersiculoCaixinha::query()->where('ativo', true)->count();

        $byCategory = VersiculoCaixinha::query()
            ->selectRaw('categoria, COUNT(*) as total, SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) as active')
            ->groupBy('categoria')
            ->orderByDesc('total')
            ->orderBy('categoria')
            ->get()
            ->map(fn ($row) => [
                'categoria' => (string) $row->categoria,
                'total' => (int) $row->total,
                'active' => (int) $row->active,
            ])
            ->values()
            ->all();

        return [
            'total' => $total,
            'active' => $active,
            'inactive' => max(0, $total - $active),
            'categoriesUsed' => count($byCategory),
            'books' => (int) VersiculoCaixinha::query()->distinct()->count('livro'),
            'avgNota' => round((float) VersiculoCaixinha::query()->avg('nota'), 1),
            'avgPeso' => round((float) VersiculoCaixinha::query()->avg('peso'), 1),
            'byCategory' => $byCategory,
        ];
    }

    /**
     * @return array{
     *     total: int,
     *     active: int,
     *     inactive: int,
     *     categoriesUsed: int,
     *     books: int,
     *     avgNota: float,
     *     avgPeso: float,
     *     byCategory: list<array{categoria: string, total: int, active: int}>
     * }
     */
    private function emptyIndexStats(): array
    {
        return [
            'total' => 0,
            'active' => 0,
            'inactive' => 0,
            'categoriesUsed' => 0,
            'books' => 0,
            'avgNota' => 0.0,
            'avgPeso' => 0.0,
            'byCategory' => [],
        ];
    }

    private function mapRow(VersiculoCaixinha $row): array
    {
        $resolved = $this->verseService->resolveReference(
            (string) $row->livro,
            (int) $row->capitulo,
            (int) $row->versiculo_inicio,
            (int) $row->versiculo_fim,
        );

        $ref = $resolved['ref'] ?? sprintf(
            '%s %d:%d%s',
            $row->livro,
            $row->capitulo,
            $row->versiculo_inicio,
            $row->versiculo_fim !== $row->versiculo_inicio ? '-'.$row->versiculo_fim : '',
        );

        return [
            'id' => $row->id,
            'livro' => $row->livro,
            'capitulo' => $row->capitulo,
            'versiculo_inicio' => $row->versiculo_inicio,
            'versiculo_fim' => $row->versiculo_fim,
            'categoria' => $row->categoria,
            'nota' => $row->nota,
            'peso' => $row->peso,
            'ativo' => (bool) $row->ativo,
            'ref' => $ref,
            'textPreview' => $resolved['text'] ?? null,
        ];
    }
}
