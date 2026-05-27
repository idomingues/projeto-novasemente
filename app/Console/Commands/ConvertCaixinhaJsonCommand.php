<?php

namespace App\Console\Commands;

use App\Models\BibleBook;
use App\Models\BibleVerse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ConvertCaixinhaJsonCommand extends Command
{
    protected $signature = 'bible:caixinha-converter-json
                            {--path= : Caminho de um arquivo .json com [{versiculo,localizacao}]}
                            {--out=database/sql/versiculos_caixinha.from_json.sql : Caminho de saída do .sql}
                            {--default-nota=9 : Nota padrão quando não der para pontuar (1-10)}
                            {--default-peso=7 : Peso padrão (1-10)}
                            {--drop-violencia : Remove versos com linguagem violenta}
                            {--dry-run : Não grava arquivo; só mostra resumo}';

    protected $description = 'Converte um JSON de versículos + localização em INSERTs SQL para versiculos_caixinha';

    public function handle(): int
    {
        $path = (string) ($this->option('path') ?? '');
        $path = trim($path);
        if ($path === '') {
            $this->error('Informe --path=... (arquivo JSON).');
            $this->line('Exemplo: php artisan bible:caixinha-converter-json --path=storage/app/caixinha.json');

            return self::FAILURE;
        }

        $fullPath = str_starts_with($path, '/') ? $path : base_path($path);
        if (! is_file($fullPath)) {
            $this->error("Arquivo não encontrado: {$fullPath}");

            return self::FAILURE;
        }

        $raw = file_get_contents($fullPath);
        if ($raw === false) {
            $this->error("Não foi possível ler: {$fullPath}");

            return self::FAILURE;
        }

        $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw) ?? $raw;

        /** @var mixed $data */
        $data = json_decode($raw, true);
        if (! is_array($data)) {
            $this->error('JSON inválido: esperado um array de objetos.');

            return self::FAILURE;
        }

        if (! Schema::hasTable('bible_books') || ! Schema::hasTable('bible_verses')) {
            $this->warn('Tabelas bible_books/bible_verses não existem. Vou gerar SQL mesmo assim (sem validação no banco).');
        }

        $bookNameByNorm = $this->buildBookNameIndex();

        $defaultNota = (int) $this->option('default-nota');
        $defaultNota = max(1, min(10, $defaultNota));

        $defaultPeso = (int) $this->option('default-peso');
        $defaultPeso = max(1, min(10, $defaultPeso));

        $dropViolence = (bool) $this->option('drop-violencia');

        $out = (string) ($this->option('out') ?? 'database/sql/versiculos_caixinha.from_json.sql');
        $out = trim($out) !== '' ? trim($out) : 'database/sql/versiculos_caixinha.from_json.sql';
        $outFull = base_path($out);

        $stats = [
            'total' => 0,
            'ok' => 0,
            'skipped' => 0,
            'dupes' => 0,
            'db_missing' => 0,
        ];

        /** @var array<string, array{livro:string,capitulo:int,versiculo_inicio:int,versiculo_fim:int,categoria:string,nota:int,peso:int}> $unique */
        $unique = [];

        foreach ($data as $i => $row) {
            $stats['total']++;

            if (! is_array($row)) {
                $stats['skipped']++;
                continue;
            }

            $text = trim((string) ($row['versiculo'] ?? ''));
            $loc = trim((string) ($row['localizacao'] ?? ''));

            if ($text === '' || $loc === '') {
                $stats['skipped']++;
                continue;
            }

            if ($dropViolence && $this->hasViolence($text)) {
                $stats['skipped']++;
                continue;
            }

            $parsed = $this->parseLocation($loc);
            if (! $parsed) {
                $this->warn("Linha {$i}: localização não reconhecida: {$loc}");
                $stats['skipped']++;
                continue;
            }

            $bookRaw = $parsed['livro'];
            $bookNorm = $this->normBook($bookRaw);
            $book = $bookNameByNorm[$bookNorm] ?? $bookRaw;

            $chapter = (int) $parsed['capitulo'];
            $vStart = (int) $parsed['versiculo_inicio'];
            $vEnd = (int) $parsed['versiculo_fim'];

            // Categoria: tenta inferir do texto (devocional).
            $categoria = $this->pickCategory($text);

            // Nota/peso: heurística leve (mantém sua regra de nota >= 8)
            [$nota, $peso] = $this->score($text, $defaultNota, $defaultPeso);
            if ($nota < 8) {
                $nota = 8;
            }

            // Validação opcional no banco: checa existência do verso inicial.
            if (Schema::hasTable('bible_books') && Schema::hasTable('bible_verses')) {
                $exists = $this->existsInDb($book, $chapter, $vStart);
                if (! $exists) {
                    $stats['db_missing']++;
                }
            }

            $key = mb_strtolower($book).'|'.$chapter.'|'.$vStart.'|'.$vEnd;
            if (isset($unique[$key])) {
                $stats['dupes']++;
                continue;
            }

            $unique[$key] = [
                'livro' => $book,
                'capitulo' => $chapter,
                'versiculo_inicio' => $vStart,
                'versiculo_fim' => $vEnd,
                'categoria' => $categoria,
                'nota' => $nota,
                'peso' => $peso,
            ];
            $stats['ok']++;
        }

        $items = array_values($unique);
        usort($items, fn ($a, $b) => [$b['nota'], $b['peso']] <=> [$a['nota'], $a['peso']]);

        $sql = $this->renderSql($items, $path, $stats);

        $this->info("Convertidos: {$stats['ok']} (de {$stats['total']}). Duplicados: {$stats['dupes']}. Ignorados: {$stats['skipped']}.");
        if ($stats['db_missing'] > 0) {
            $this->warn("Atenção: {$stats['db_missing']} referência(s) não foram encontradas no banco (pode ser diferença no nome do livro).");
        }

        if ((bool) $this->option('dry-run')) {
            $this->warn('dry-run ativo: não foi gerado arquivo.');
            $this->line('Prévia (top 10):');
            foreach (array_slice($items, 0, 10) as $it) {
                $this->line(sprintf(
                    '- %s %d:%d-%d | %s | nota %d | peso %d',
                    $it['livro'],
                    $it['capitulo'],
                    $it['versiculo_inicio'],
                    $it['versiculo_fim'],
                    $it['categoria'],
                    $it['nota'],
                    $it['peso'],
                ));
            }

            return self::SUCCESS;
        }

        $dir = dirname($outFull);
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $ok = file_put_contents($outFull, $sql);
        if ($ok === false) {
            $this->error("Falha ao gravar arquivo: {$outFull}");

            return self::FAILURE;
        }

        $this->info("OK. SQL gerado em: {$out}");

        return self::SUCCESS;
    }

    /**
     * @return array<string, string> norm => book_name
     */
    private function buildBookNameIndex(): array
    {
        if (! (Schema::hasTable('bible_books'))) {
            return [];
        }

        $out = [];
        foreach (BibleBook::query()->get(['name']) as $b) {
            $name = (string) $b->name;
            $out[$this->normBook($name)] = $name;

            // Aliases comuns:
            if ($this->normBook($name) === $this->normBook('Atos')) {
                $out[$this->normBook('Atos dos Apóstolos')] = $name;
            }
        }

        return $out;
    }

    private function normBook(string $s): string
    {
        $s = trim($s);
        $s = Str::lower(Str::ascii($s));
        $s = preg_replace('/\s+/u', ' ', $s) ?? $s;

        return $s;
    }

    /**
     * @return array{livro:string,capitulo:int,versiculo_inicio:int,versiculo_fim:int}|null
     */
    private function parseLocation(string $loc): ?array
    {
        $loc = trim($loc);
        $loc = preg_replace('/\s+/u', ' ', $loc) ?? $loc;
        $loc = rtrim($loc, '.');

        // Ex.: "Marcos 12:42-44" | "2 Coríntios 9:7" | "Mateus 11:28-29"
        if (! preg_match('/^(?<book>.+?)\s+(?<chap>\d+)\s*:\s*(?<verses>.+)$/u', $loc, $m)) {
            return null;
        }

        $book = trim((string) ($m['book'] ?? ''));
        $chap = (int) ($m['chap'] ?? 0);
        $versesRaw = trim((string) ($m['verses'] ?? ''));

        if ($book === '' || $chap <= 0 || $versesRaw === '') {
            return null;
        }

        // Se tiver múltiplos segmentos (ex.: "2-3,5,7"), usa o primeiro e avisa.
        $first = preg_split('/[;,]/u', $versesRaw);
        if (! $first || ! isset($first[0])) {
            return null;
        }
        $verses = trim((string) $first[0]);

        $vStart = null;
        $vEnd = null;
        if (preg_match('/^(?<a>\d+)\s*-\s*(?<b>\d+)$/u', $verses, $mm)) {
            $vStart = (int) $mm['a'];
            $vEnd = (int) $mm['b'];
        } elseif (preg_match('/^(?<a>\d+)$/u', $verses, $mm)) {
            $vStart = (int) $mm['a'];
            $vEnd = (int) $mm['a'];
        } else {
            return null;
        }

        if ($vStart <= 0 || $vEnd <= 0) {
            return null;
        }
        if ($vEnd < $vStart) {
            [$vStart, $vEnd] = [$vEnd, $vStart];
        }

        return [
            'livro' => $book,
            'capitulo' => $chap,
            'versiculo_inicio' => $vStart,
            'versiculo_fim' => $vEnd,
        ];
    }

    private function pickCategory(string $text): string
    {
        $t = Str::lower(Str::ascii($text));

        $cats = [
            'Sábado' => ['sabado', 'santificar', 'descanso'],
            'Volta de Jesus' => ['voltarei', 'vinda', 'venho sem demora', 'arrebat', 'nuvens', 'voltara'],
            'Salvação' => ['salvacao', 'salvo', 'vida eterna', 'graca', 'redencao', 'arrepend'],
            'Perdão' => ['perdao', 'perdo', 'confessar', 'purificar'],
            'Oração' => ['oracao', 'orar', 'ore', 'suplic', 'clam'],
            'Gratidão' => ['gratid', 'agradec', 'louvor', 'deem gracas', 'dou gracas'],
            'Família' => ['pai', 'mae', 'filhos', 'casa', 'lar', 'marido', 'esposa'],
            'Coragem' => ['coragem', 'forte', 'nao temas', 'nao tenha medo', 'animo', 'valente'],
            'Consolo' => ['paz', 'consolo', 'descanso', 'nao se perturbe', 'alivio'],
            'Confiança' => ['confie', 'confi', 'refugio', 'socorro', 'fortaleza', 'guardar', 'protege'],
            'Fé' => ['fe', 'crer', 'creia', 'invisivel'],
            'Esperança' => ['esperanca', 'futuro', 'amanha', 'promessa', 'renovar', 'restaur'],
            'Sabedoria' => ['sabedoria', 'prud', 'entendimento', 'discern'],
        ];

        // Se não houver match, o default deve ser Esperança (não Sábado).
        $best = 'Esperança';
        $bestScore = 0;
        foreach ($cats as $cat => $words) {
            $score = 0;
            foreach ($words as $w) {
                if (Str::contains($t, $w)) {
                    $score += 2;
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $cat;
            }
        }

        return $best;
    }

    private function hasViolence(string $t): bool
    {
        return (bool) preg_match('/\b(matar|mate|morte|morrer|sangue|espada|guerra|destruir|vingan[çc]a|aniquilar|ferir|degolar)\b/u', $t);
    }

    /**
     * @return array{0:int,1:int} [nota, peso]
     */
    private function score(string $text, int $defaultNota, int $defaultPeso): array
    {
        $t = trim($text);
        if ($t === '') {
            return [$defaultNota, $defaultPeso];
        }

        $nota = $defaultNota;
        $peso = $defaultPeso;

        $len = mb_strlen($t);
        if ($len <= 120) {
            $nota += 1;
            $peso += 1;
        }

        if (preg_match('/\b(deus|senhor|jesus|cristo|esp[ií]rito)\b/u', $t)) {
            $nota += 1;
            $peso += 1;
        }

        if (preg_match('/\b(n[aã]o temas|n[aã]o tenha medo|confie|entregue|ore|clame|espere)\b/u', $t)) {
            $nota += 1;
        }

        $nota = max(1, min(10, $nota));
        $peso = max(1, min(10, $peso));

        return [$nota, $peso];
    }

    private function existsInDb(string $bookName, int $chapter, int $verse): bool
    {
        $book = BibleBook::query()->where('name', $bookName)->first();
        if (! $book) {
            // fallback: tenta pelo nome normalizado
            $norm = $this->normBook($bookName);
            $book = BibleBook::query()
                ->get(['id', 'name'])
                ->first(fn ($b) => $this->normBook((string) $b->name) === $norm);
        }
        if (! $book) {
            return false;
        }

        return BibleVerse::query()
            ->where('book_id', $book->id)
            ->where('chapter', $chapter)
            ->where('verse', $verse)
            ->exists();
    }

    /**
     * @param array<int, array{livro:string,capitulo:int,versiculo_inicio:int,versiculo_fim:int,categoria:string,nota:int,peso:int}> $items
     * @param array<string,int> $stats
     */
    private function renderSql(array $items, string $sourcePath, array $stats): string
    {
        $lines = [];
        $lines[] = '-- Caixinha Bíblica - importado de JSON';
        $lines[] = '-- Fonte: '.$sourcePath;
        $lines[] = sprintf('-- Total: %d | Convertidos: %d | Duplicados: %d | Ignorados: %d', $stats['total'], $stats['ok'], $stats['dupes'], $stats['skipped']);
        $lines[] = '';
        $lines[] = 'INSERT INTO versiculos_caixinha';
        $lines[] = '(livro, capitulo, versiculo_inicio, versiculo_fim, categoria, nota, peso)';
        $lines[] = 'VALUES';

        $values = [];
        foreach ($items as $it) {
            $values[] = sprintf(
                "(%s, %d, %d, %d, %s, %d, %d)",
                $this->sqlString($it['livro']),
                (int) $it['capitulo'],
                (int) $it['versiculo_inicio'],
                (int) $it['versiculo_fim'],
                $this->sqlString($it['categoria']),
                (int) $it['nota'],
                (int) $it['peso'],
            );
        }

        $lines[] = implode(",\n", $values).';';
        $lines[] = '';

        return implode("\n", $lines)."\n";
    }

    private function sqlString(string $s): string
    {
        $s = str_replace("'", "''", $s);

        return "'".$s."'";
    }
}

