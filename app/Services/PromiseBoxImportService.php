<?php

namespace App\Services;

use App\Models\BibleVerse;
use App\Models\VersiculoCaixinha;
use Illuminate\Support\Facades\Schema;

class PromiseBoxImportService
{
    public function __construct(
        private PromiseBoxVerseService $verseService,
        private PromiseBoxCuratorService $curator,
    ) {}

    /**
     * @return array{ok:bool, message?:string, items:list<array<string, mixed>>, summary:array<string, int>}
     */
    public function previewPopular(): array
    {
        if (! $this->verseService->bibleReady()) {
            return $this->previewError('Importe a Bíblia no sistema antes de buscar promessas.');
        }

        $existing = $this->verseService->existingReferenceKeys();
        $seen = [];
        $items = [];
        $summary = $this->emptySummary();

        foreach (config('promise_box.popular_verses', []) as $row) {
            [$livro, $cap, $vStart, $vEnd, $categoria, $nota, $peso] = $row;
            $item = $this->buildPreviewItem(
                livro: (string) $livro,
                capitulo: (int) $cap,
                versiculoInicio: (int) $vStart,
                versiculoFim: (int) $vEnd,
                categoria: (string) $categoria,
                nota: (int) $nota,
                peso: (int) $peso,
                existing: $existing,
                seen: $seen,
            );

            if ($item === null) {
                continue;
            }

            $seen[$item['key']] = true;
            $items[] = $item;
            $summary['suggested']++;
            $summary[$item['status'] === 'ready' ? 'ready' : $item['status']]++;
        }

        return ['ok' => true, 'items' => $items, 'summary' => $summary];
    }

    /**
     * @return array{ok:bool, message?:string, items:list<array<string, mixed>>, summary:array<string, int>, scanned?:int}
     */
    public function previewScanBible(int $limit = 50, int $minNota = 8, int $maxChars = 220): array
    {
        if (! Schema::hasTable('bible_books') || ! Schema::hasTable('bible_verses')) {
            return $this->previewError('Tabelas da Bíblia não encontradas.');
        }

        $existing = $this->verseService->existingReferenceKeys();
        $popularBoost = $this->curator->popularBoostIndex();
        $candidates = [];
        $scanned = 0;

        $rows = BibleVerse::query()
            ->select([
                'bible_verses.chapter',
                'bible_verses.verse',
                'bible_verses.text',
                'bible_books.name as book_name',
            ])
            ->join('bible_books', 'bible_books.id', '=', 'bible_verses.book_id')
            ->orderBy('bible_books.position')
            ->orderBy('bible_verses.chapter')
            ->orderBy('bible_verses.verse')
            ->cursor();

        foreach ($rows as $r) {
            $scanned++;
            $book = (string) $r->book_name;
            $chapter = (int) $r->chapter;
            $verse = (int) $r->verse;
            $text = trim((string) $r->text);

            $key = VersiculoCaixinha::makeReferenceKey($book, $chapter, $verse, $verse);
            if (isset($existing[$key])) {
                continue;
            }

            $analysis = $this->curator->analyzeVerse($book, $chapter, $verse, $text, $maxChars, $popularBoost);
            if (! $analysis['keep'] || (int) $analysis['nota'] < $minNota) {
                continue;
            }

            $candidates[] = [
                'livro' => $book,
                'capitulo' => $chapter,
                'versiculo_inicio' => $verse,
                'versiculo_fim' => $verse,
                'categoria' => (string) $analysis['categoria'],
                'nota' => (int) $analysis['nota'],
                'peso' => (int) $analysis['peso'],
            ];
        }

        usort($candidates, fn (array $a, array $b) => [$b['nota'], $b['peso']] <=> [$a['nota'], $a['peso']]);
        $candidates = array_slice($candidates, 0, max(1, min(500, $limit)));

        $seen = [];
        $items = [];
        $summary = $this->emptySummary();

        foreach ($candidates as $candidate) {
            $item = $this->buildPreviewItem(
                livro: (string) $candidate['livro'],
                capitulo: (int) $candidate['capitulo'],
                versiculoInicio: (int) $candidate['versiculo_inicio'],
                versiculoFim: (int) $candidate['versiculo_fim'],
                categoria: (string) $candidate['categoria'],
                nota: (int) $candidate['nota'],
                peso: (int) $candidate['peso'],
                existing: $existing,
                seen: $seen,
            );

            if ($item === null) {
                continue;
            }

            $seen[$item['key']] = true;
            $items[] = $item;
            $summary['suggested']++;
            $summary[$item['status'] === 'ready' ? 'ready' : $item['status']]++;
        }

        return [
            'ok' => true,
            'items' => $items,
            'summary' => $summary,
            'scanned' => $scanned,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array{imported:int, skipped_duplicate:int, skipped_missing:int, skipped_excluded:int, errors:list<string>}
     */
    public function importSelected(array $items): array
    {
        $result = $this->emptyResult();
        $existing = $this->verseService->existingReferenceKeys();
        $categories = config('promise_box.categories', []);

        foreach ($items as $item) {
            $livro = $this->verseService->resolveBookName((string) ($item['livro'] ?? '')) ?? trim((string) ($item['livro'] ?? ''));
            $capitulo = (int) ($item['capitulo'] ?? 0);
            $versiculoInicio = (int) ($item['versiculo_inicio'] ?? 0);
            $versiculoFim = (int) ($item['versiculo_fim'] ?? $versiculoInicio);
            $categoria = trim((string) ($item['categoria'] ?? 'Esperança'));

            if ($livro === '' || $capitulo <= 0 || $versiculoInicio <= 0) {
                $result['errors'][] = 'Referência inválida na seleção.';
                continue;
            }

            if ($versiculoFim < $versiculoInicio) {
                [$versiculoInicio, $versiculoFim] = [$versiculoFim, $versiculoInicio];
            }

            if ($this->curator->isExcludedCategory($categoria) || ! in_array($categoria, $categories, true)) {
                $result['skipped_excluded']++;
                continue;
            }

            $key = VersiculoCaixinha::makeReferenceKey($livro, $capitulo, $versiculoInicio, $versiculoFim);
            if (isset($existing[$key])) {
                $result['skipped_duplicate']++;
                continue;
            }

            $resolved = $this->verseService->resolveReference($livro, $capitulo, $versiculoInicio, $versiculoFim);
            if ($resolved === null) {
                $result['skipped_missing']++;
                $result['errors'][] = "Referência não encontrada na Bíblia: {$livro} {$capitulo}:{$versiculoInicio}".($versiculoFim !== $versiculoInicio ? "-{$versiculoFim}" : '');

                continue;
            }

            VersiculoCaixinha::create([
                'livro' => $livro,
                'capitulo' => $capitulo,
                'versiculo_inicio' => $versiculoInicio,
                'versiculo_fim' => $versiculoFim,
                'categoria' => $categoria,
                'nota' => max(1, min(10, (int) ($item['nota'] ?? 8))),
                'peso' => max(1, min(10, (int) ($item['peso'] ?? 5))),
                'ativo' => true,
            ]);

            $existing[$key] = true;
            $result['imported']++;
        }

        return $result;
    }

    /**
     * @param  array<string, true>  $existing
     * @param  array<string, true>  $seen
     * @return array<string, mixed>|null
     */
    public function buildPreviewItem(
        string $livro,
        int $capitulo,
        int $versiculoInicio,
        int $versiculoFim,
        string $categoria,
        int $nota,
        int $peso,
        array $existing,
        array &$seen,
        string $motivo = '',
    ): ?array {
        $livro = $this->verseService->resolveBookName($livro) ?? trim($livro);
        if ($livro === '' || $capitulo <= 0 || $versiculoInicio <= 0) {
            return null;
        }

        if ($versiculoFim < $versiculoInicio) {
            [$versiculoInicio, $versiculoFim] = [$versiculoFim, $versiculoInicio];
        }

        if (! in_array($categoria, config('promise_box.categories', []), true)) {
            $categoria = 'Esperança';
        }

        $key = VersiculoCaixinha::makeReferenceKey($livro, $capitulo, $versiculoInicio, $versiculoFim);
        if (isset($seen[$key])) {
            return null;
        }

        $status = 'ready';
        if ($this->curator->isExcludedCategory($categoria)) {
            $status = 'excluded';
        } elseif (isset($existing[$key])) {
            $status = 'duplicate';
        }

        $resolved = $this->verseService->resolveReference($livro, $capitulo, $versiculoInicio, $versiculoFim);
        if ($resolved === null) {
            $status = 'missing';
        }

        $ref = $resolved['ref'] ?? sprintf(
            '%s %d:%d%s',
            $livro,
            $capitulo,
            $versiculoInicio,
            $versiculoFim !== $versiculoInicio ? '-'.$versiculoFim : '',
        );

        return [
            'key' => $key,
            'livro' => $livro,
            'capitulo' => $capitulo,
            'versiculo_inicio' => $versiculoInicio,
            'versiculo_fim' => $versiculoFim,
            'categoria' => $categoria,
            'nota' => max(1, min(10, $nota)),
            'peso' => max(1, min(10, $peso)),
            'motivo' => $motivo,
            'ref' => $ref,
            'textPreview' => $resolved['text'] ?? null,
            'status' => $status,
            'selected' => $status === 'ready',
        ];
    }

    /**
     * @return array{ok:false, message:string, items:list<array<string, mixed>>, summary:array<string, int>}
     */
    private function previewError(string $message): array
    {
        return [
            'ok' => false,
            'message' => $message,
            'items' => [],
            'summary' => $this->emptySummary(),
        ];
    }

    /**
     * @return array{suggested:int, ready:int, duplicate:int, missing:int, excluded:int}
     */
    private function emptySummary(): array
    {
        return [
            'suggested' => 0,
            'ready' => 0,
            'duplicate' => 0,
            'missing' => 0,
            'excluded' => 0,
        ];
    }

    /**
     * @return array{imported:int, skipped_duplicate:int, skipped_missing:int, skipped_excluded:int, errors:list<string>}
     */
    private function emptyResult(): array
    {
        return [
            'imported' => 0,
            'skipped_duplicate' => 0,
            'skipped_missing' => 0,
            'skipped_excluded' => 0,
            'errors' => [],
        ];
    }
}
