<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MobilePromiseBoxController extends Controller
{
    public function random(Request $request)
    {
        $excludeId = (int) $request->query('exclude', 0);

        return $this->promiseResponse(
            mode: 'random',
            excludeId: $excludeId > 0 ? $excludeId : null,
        );
    }

    public function daily(Request $request)
    {
        return $this->promiseResponse(mode: 'daily');
    }

    private function promiseResponse(string $mode, ?int $excludeId = null)
    {
        if (! Schema::hasTable('versiculos_caixinha')) {
            return response()->json([
                'ok' => false,
                'message' => app()->environment('production')
                    ? 'A Caixa de Promessas está temporariamente indisponível. Tente novamente em instantes.'
                    : 'A Caixa de Promessas ainda não está disponível neste ambiente. Peça ao responsável técnico para concluir a atualização da base de dados.',
            ], 503);
        }

        if (! Schema::hasTable('bible_books') || ! Schema::hasTable('bible_verses')) {
            return response()->json([
                'ok' => false,
                'message' => 'A Bíblia ainda não está disponível. Importe os livros e versículos primeiro.',
            ], 503);
        }

        $candidates = DB::table('versiculos_caixinha')
            ->where('ativo', true)
            ->where('categoria', '!=', 'Sábado')
            ->get(['id', 'peso', 'livro', 'capitulo', 'versiculo_inicio', 'versiculo_fim', 'categoria', 'nota', 'ativo']);

        if ($mode === 'random' && $excludeId !== null && $candidates->count() > 1) {
            $filtered = $candidates->where('id', '!=', $excludeId)->values();
            if ($filtered->isNotEmpty()) {
                $candidates = $filtered;
            }
        }

        if ($candidates->isEmpty()) {
            return response()->json([
                'ok' => false,
                'message' => app()->environment('production')
                    ? 'A Caixa de Promessas está em preparação. Volte em breve.'
                    : 'Ainda não há promessas cadastradas na Caixa de Promessas.',
            ], 404);
        }

        $totalPeso = 0;
        foreach ($candidates as $c) {
            $p = (int) ($c->peso ?? 1);
            $p = $p > 0 ? $p : 1;
            $totalPeso += $p;
        }
        $pick = $mode === 'daily'
            ? $this->dailyPick(max(1, $totalPeso))
            : random_int(1, max(1, $totalPeso));

        $acc = 0;
        $chosen = null;
        foreach ($candidates as $c) {
            $p = (int) ($c->peso ?? 1);
            $p = $p > 0 ? $p : 1;
            $acc += $p;
            if ($acc >= $pick) {
                $chosen = $c;
                break;
            }
        }
        $chosen = $chosen ?? $candidates->first();

        $book = DB::table('bible_books')->where('name', (string) $chosen->livro)->first(['id', 'name']);
        if (! $book) {
            return response()->json([
                'ok' => false,
                'message' => 'Livro não encontrado na Bíblia importada: '.(string) $chosen->livro,
            ], 404);
        }

        $chapter = (int) $chosen->capitulo;
        $vStart = (int) $chosen->versiculo_inicio;
        $vEnd = (int) $chosen->versiculo_fim;
        if ($vEnd < $vStart) {
            [$vStart, $vEnd] = [$vEnd, $vStart];
        }

        $verses = DB::table('bible_verses')
            ->where('book_id', (int) $book->id)
            ->where('chapter', $chapter)
            ->whereBetween('verse', [$vStart, $vEnd])
            ->orderBy('verse')
            ->get(['verse', 'text']);

        if ($verses->isEmpty()) {
            return response()->json([
                'ok' => false,
                'message' => 'Versículo não encontrado na Bíblia importada.',
            ], 404);
        }

        $text = $verses->map(fn ($v) => trim((string) $v->text))->filter()->implode(' ');
        $ref = $vStart === $vEnd
            ? sprintf('%s %d:%d', (string) $chosen->livro, $chapter, $vStart)
            : sprintf('%s %d:%d-%d', (string) $chosen->livro, $chapter, $vStart, $vEnd);

        return response()->json([
            'ok' => true,
            'mode' => $mode,
            'promise' => [
                'id' => (int) $chosen->id,
                'livro' => (string) $chosen->livro,
                'capitulo' => $chapter,
                'versiculo_inicio' => $vStart,
                'versiculo_fim' => $vEnd,
                'text' => $text,
                'ref' => $ref,
                'categoria' => (string) $chosen->categoria,
                'nota' => (int) $chosen->nota,
                'peso' => (int) ($chosen->peso ?? 1),
                'ativo' => (bool) ($chosen->ativo ?? true),
            ],
        ]);
    }

    private function dailyPick(int $max): int
    {
        $max = max(1, $max);
        $dateKey = now()->timezone('America/Sao_Paulo')->toDateString(); // YYYY-MM-DD
        // Determinístico e estável: todos veem o mesmo por dia.
        $h = sha1('ns:promise:'.$dateKey);
        $n = hexdec(substr($h, 0, 8)); // 32-bit
        $pick = ($n % $max) + 1;

        return (int) $pick;
    }
}

