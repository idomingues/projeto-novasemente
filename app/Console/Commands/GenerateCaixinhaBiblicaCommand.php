<?php

namespace App\Console\Commands;

use App\Models\BibleBook;
use App\Models\BibleVerse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class GenerateCaixinhaBiblicaCommand extends Command
{
    protected $signature = 'bible:caixinha-gerar
                            {--min-nota=8 : Nota mínima (1-10)}
                            {--max-chars=220 : Tamanho máximo do texto (caracteres)}
                            {--limit=500 : Máximo de versículos retornados}
                            {--scan-limit=0 : Máximo de versículos a escanear (0 = todos)}
                            {--out=database/sql/versiculos_caixinha.seed.sql : Caminho de saída do .sql}
                            {--dry-run : Não grava arquivo; só mostra resumo}';

    protected $description = 'Gera INSERTs SQL para versículos curados (Caixinha Bíblica)';

    public function handle(): int
    {
        if (! Schema::hasTable('bible_books') || ! Schema::hasTable('bible_verses')) {
            $this->error('Tabelas bible_books/bible_verses não existem. Rode as migrations primeiro.');

            return self::FAILURE;
        }

        $minNota = (int) $this->option('min-nota');
        $minNota = max(1, min(10, $minNota));

        $maxChars = (int) $this->option('max-chars');
        $maxChars = max(80, min(800, $maxChars));

        $limit = (int) $this->option('limit');
        $limit = max(1, min(5000, $limit));

        $scanLimit = (int) $this->option('scan-limit');
        $scanLimit = max(0, min(500000, $scanLimit));

        $out = (string) $this->option('out');
        $out = trim($out) !== '' ? trim($out) : 'database/sql/versiculos_caixinha.seed.sql';
        $outFull = base_path($out);

        $this->info('Lendo versículos e aplicando curadoria…');

        $popularBoost = $this->popularBoostIndex();

        $rows = BibleVerse::query()
            ->select([
                'bible_verses.id',
                'bible_verses.chapter',
                'bible_verses.verse',
                'bible_verses.text',
                'bible_books.name as book_name',
                'bible_books.position as book_position',
                'bible_books.testament as testament',
            ])
            ->join('bible_books', 'bible_books.id', '=', 'bible_verses.book_id')
            ->orderBy('bible_books.position')
            ->orderBy('bible_verses.chapter')
            ->orderBy('bible_verses.verse')
            ->cursor();

        $kept = [];
        $stats = [
            'total' => 0,
            'ignored' => 0,
            'kept' => 0,
            'by_category' => [],
            'by_nota' => array_fill(1, 10, 0),
        ];

        foreach ($rows as $r) {
            $stats['total']++;

            $book = (string) $r->book_name;
            $chapter = (int) $r->chapter;
            $verse = (int) $r->verse;
            $text = trim((string) $r->text);

            $analysis = $this->analyzeVerse(
                book: $book,
                chapter: $chapter,
                verse: $verse,
                text: $text,
                maxChars: $maxChars,
                popularBoost: $popularBoost,
            );

            if (! $analysis['keep']) {
                $stats['ignored']++;
                continue;
            }

            $nota = (int) $analysis['nota'];
            if ($nota < $minNota) {
                $stats['ignored']++;
                continue;
            }

            $kept[] = [
                'livro' => $book,
                'capitulo' => $chapter,
                'versiculo_inicio' => $verse,
                'versiculo_fim' => $verse,
                'categoria' => (string) $analysis['categoria'],
                'nota' => $nota,
                'peso' => (int) $analysis['peso'],
                'texto' => $text,
                'ref' => "{$book} {$chapter}:{$verse}",
            ];

            $stats['kept']++;
            $stats['by_nota'][$nota] = ($stats['by_nota'][$nota] ?? 0) + 1;
            $cat = (string) $analysis['categoria'];
            $stats['by_category'][$cat] = ($stats['by_category'][$cat] ?? 0) + 1;

            // Não interrompe ao atingir $limit: varremos tudo e só depois pegamos os top N.
            // Isso evita “viés” dos primeiros livros (ex.: Gênesis) e ajuda a chegar em centenas.
            if ($scanLimit > 0 && $stats['total'] >= $scanLimit) {
                break;
            }
        }

        // Ordena por (nota desc, peso desc, tamanho asc) para dar prioridade aos “impactantes”.
        usort($kept, function (array $a, array $b) {
            return [$b['nota'], $b['peso'], mb_strlen($a['texto'])] <=> [$a['nota'], $a['peso'], mb_strlen($b['texto'])];
        });

        $kept = array_slice($kept, 0, $limit);

        $this->line('');
        $this->info('Resumo:');
        $this->line("Total lidos: {$stats['total']}");
        $this->line("Ignorados: {$stats['ignored']}");
        $this->line("Selecionados (nota >= {$minNota}): ".count($kept));
        $this->line('');
        $this->info('Por categoria (top 10):');
        arsort($stats['by_category']);
        foreach (array_slice($stats['by_category'], 0, 10, true) as $cat => $n) {
            $this->line("- {$cat}: {$n}");
        }

        if ((bool) $this->option('dry-run')) {
            $this->warn('dry-run ativo: não foi gerado arquivo.');
            $this->line('Exemplos (top 10):');
            foreach (array_slice($kept, 0, 10) as $it) {
                $this->line("- {$it['ref']} | {$it['categoria']} | nota {$it['nota']} | peso {$it['peso']}");
            }

            return self::SUCCESS;
        }

        $sql = $this->renderSql($kept);

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
     * Retorna um índice de “boost” por referência popular: "Livro|cap|verso" => ['nota' => int, 'peso' => int, 'categoria' => string|null].
     *
     * Observação: livros estão em pt-BR (como gravados em bible_books.name).
     *
     * @return array<string, array{nota:int, peso:int, categoria?:string}>
     */
    private function popularBoostIndex(): array
    {
        $items = [
            // Promessas / encorajamento
            ['Isaías', 41, 10, 10, 'Coragem'],
            ['Isaías', 43, 2, 10, 'Consolo'],
            ['Josué', 1, 9, 10, 'Coragem'],
            ['Salmos', 23, 1, 10, 'Confiança'],
            ['Salmos', 23, 4, 10, 'Consolo'],
            ['Salmos', 46, 1, 10, 'Consolo'],
            ['Salmos', 91, 1, 10, 'Confiança'],
            ['Salmos', 121, 1, 9, 'Confiança'],
            ['Jeremias', 29, 11, 10, 'Esperança'],
            ['Provérbios', 3, 5, 10, 'Confiança'],
            ['Provérbios', 3, 6, 10, 'Sabedoria'],
            ['Mateus', 11, 28, 10, 'Consolo'],
            ['João', 3, 16, 10, 'Salvação'],
            ['João', 14, 27, 10, 'Consolo'],
            ['Romanos', 8, 28, 10, 'Esperança'],
            ['Romanos', 8, 31, 9, 'Confiança'],
            ['Filipenses', 4, 6, 10, 'Oração'],
            ['Filipenses', 4, 7, 10, 'Consolo'],
            ['Filipenses', 4, 13, 10, 'Coragem'],
            ['2 Timóteo', 1, 7, 10, 'Coragem'],
            ['Hebreus', 11, 1, 10, 'Fé'],
            ['1 Pedro', 5, 7, 10, 'Consolo'],
            ['Apocalipse', 21, 4, 10, 'Esperança'],

            // Perdão / salvação
            ['1 João', 1, 9, 10, 'Perdão'],
            ['Efésios', 2, 8, 10, 'Salvação'],
            ['Efésios', 2, 9, 9, 'Salvação'],

            // Sábado (mais “identidade” devocional em app cristão)
            ['Êxodo', 20, 8, 9, 'Sábado'],
            ['Êxodo', 20, 9, 8, 'Sábado'],
            ['Êxodo', 20, 10, 9, 'Sábado'],
            ['Isaías', 58, 13, 9, 'Sábado'],
            ['Isaías', 58, 14, 9, 'Sábado'],

            // Volta de Jesus
            ['João', 14, 3, 9, 'Volta de Jesus'],
            ['1 Tessalonicenses', 4, 16, 9, 'Volta de Jesus'],
            ['1 Tessalonicenses', 4, 17, 9, 'Volta de Jesus'],
            ['Apocalipse', 22, 12, 9, 'Volta de Jesus'],
            ['Apocalipse', 22, 20, 10, 'Volta de Jesus'],
        ];

        $out = [];
        foreach ($items as [$livro, $cap, $ver, $nota, $categoria]) {
            $key = $this->popularKey((string) $livro, (int) $cap, (int) $ver);
            $peso = $nota >= 10 ? 10 : 7;
            $out[$key] = ['nota' => (int) $nota, 'peso' => (int) $peso, 'categoria' => (string) $categoria];
        }

        return $out;
    }

    private function popularKey(string $book, int $chapter, int $verse): string
    {
        return mb_strtolower(trim($book)).'|'.$chapter.'|'.$verse;
    }

    /**
     * @param array<string, array{nota:int, peso:int, categoria?:string}> $popularBoost
     * @return array{keep:bool, categoria:string, nota:int, peso:int, reasons:string[]}
     */
    private function analyzeVerse(string $book, int $chapter, int $verse, string $text, int $maxChars, array $popularBoost): array
    {
        $reasons = [];
        $t = $this->normalize($text);

        if ($t === '' || mb_strlen($t) < 25) {
            return ['keep' => false, 'categoria' => 'Sabedoria', 'nota' => 1, 'peso' => 1, 'reasons' => ['muito_curto']];
        }

        if (mb_strlen($t) > $maxChars) {
            return ['keep' => false, 'categoria' => 'Sabedoria', 'nota' => 1, 'peso' => 1, 'reasons' => ['muito_longo']];
        }

        // Ignorar genealogias/nomes em sequência.
        if ($this->looksLikeGenealogy($t)) {
            return ['keep' => false, 'categoria' => 'Família', 'nota' => 1, 'peso' => 1, 'reasons' => ['genealogia']];
        }

        // Ignorar linguagem “violenta” / guerra.
        if ($this->hasViolence($t)) {
            return ['keep' => false, 'categoria' => 'Coragem', 'nota' => 1, 'peso' => 1, 'reasons' => ['violencia']];
        }

        // Ignorar leis cerimoniais / instruções técnicas.
        if ($this->looksTechnicalLaw($t)) {
            return ['keep' => false, 'categoria' => 'Sabedoria', 'nota' => 1, 'peso' => 1, 'reasons' => ['lei_tecnica']];
        }

        // Boost por referência popular conhecida.
        $pKey = $this->popularKey($book, $chapter, $verse);
        if (isset($popularBoost[$pKey])) {
            $p = $popularBoost[$pKey];

            return [
                'keep' => true,
                'categoria' => $p['categoria'] ?? 'Esperança',
                'nota' => (int) $p['nota'],
                'peso' => (int) $p['peso'],
                'reasons' => ['popular_boost'],
            ];
        }

        $scores = $this->categoryScores($t);
        arsort($scores);
        $categoria = array_key_first($scores) ?: 'Esperança';
        $catScore = (int) ($scores[$categoria] ?? 0);

        // Pontuação base: mensagem clara + devocional curta + palavras-chave.
        $nota = 5;
        $peso = 1;

        $clarity = 0;
        if ($this->hasPromiseTone($t)) { $clarity += 2; $reasons[] = 'promessa'; }
        if ($this->hasDevotionalTone($t)) { $clarity += 2; $reasons[] = 'devocional'; }
        if ($this->hasComfortWords($t)) { $clarity += 2; $reasons[] = 'conforto'; }

        $nota += min(4, $clarity);
        $nota += min(2, (int) floor($catScore / 3));

        // Penalidades leves para frases muito “dependentes de contexto”.
        if ($this->looksContextDependent($t)) {
            $nota -= 2;
            $reasons[] = 'contexto';
        }

        // Incentiva textos “curtos e impactantes”.
        $len = mb_strlen($t);
        if ($len <= 120) {
            $nota += 1;
            $peso += 2;
            $reasons[] = 'curto';
        }

        // Reforça menções explícitas a Deus / Jesus / Espírito.
        if (preg_match('/\b(deus|senhor|jesus|cristo|esp[ií]rito)\b/u', $t)) {
            $nota += 1;
            $peso += 2;
            $reasons[] = 'teocentrico';
        }

        // Reforça formas devocionais típicas.
        if (preg_match('/\b(n[aã]o temas|n[aã]o tenha medo|eu estou com voc[eê]|confie|entregue|ore|clame)\b/u', $t)) {
            $nota += 1;
            $peso += 1;
            $reasons[] = 'imperativo_devocional';
        }

        $nota = max(1, min(10, $nota));
        $peso = max(1, min(10, $peso));

        // Critério final de “faz sentido isoladamente”: pelo menos 1 sinal forte.
        $hasSignal = $clarity >= 2 || $catScore >= 5 || $peso >= 4;
        if (! $hasSignal) {
            return ['keep' => false, 'categoria' => $categoria, 'nota' => 1, 'peso' => 1, 'reasons' => ['pouco_sinal']];
        }

        return ['keep' => true, 'categoria' => $categoria, 'nota' => $nota, 'peso' => $peso, 'reasons' => $reasons];
    }

    private function normalize(string $text): string
    {
        $t = trim($text);
        $t = preg_replace('/\s+/u', ' ', $t) ?? $t;

        return $t;
    }

    private function looksLikeGenealogy(string $t): bool
    {
        // Heurística: muito “filho(s) de”/“gerou”/listas de nomes.
        $hits = 0;
        $hits += preg_match_all('/\bfilh[oa]s?\s+de\b/u', $t) ?: 0;
        $hits += preg_match_all('/\bgerou\b/u', $t) ?: 0;
        $hits += preg_match_all('/\be\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+/u', $t) ?: 0;

        return $hits >= 6;
    }

    private function hasViolence(string $t): bool
    {
        return (bool) preg_match('/\b(matar|mate|morte|morrer|sangue|espada|guerra|destruir|vingan[çc]a|aniquilar|ferir|degolar)\b/u', $t);
    }

    private function looksTechnicalLaw(string $t): bool
    {
        return (bool) preg_match('/\b(holocausto|sacrif[ií]cio|oferta|ofertas|levitas|impuro|imund[oa]|circuncid|altar|tabern[aá]culo|unc|purifica[cç][aã]o)\b/u', $t);
    }

    private function looksContextDependent(string $t): bool
    {
        // Começos que frequentemente dependem do verso anterior (“Portanto”, “Assim”, etc.)
        if (preg_match('/^(portanto|assim|por isso|ent[aã]o|logo)\b/u', $t)) {
            return true;
        }

        // “E aconteceu…” histórico, pouco devocional.
        if (preg_match('/^(e aconteceu|e sucedeu|naquele tempo)\b/u', $t)) {
            return true;
        }

        return false;
    }

    private function hasPromiseTone(string $t): bool
    {
        return (bool) preg_match('/\b(eu (sou|estou) com voc[eê]|n[aã]o te deixarei|n[aã]o te desampararei|eu te ajudarei|eu te sustentarei|eu te guardarei|eu te fortale[cç]erei)\b/u', $t);
    }

    private function hasDevotionalTone(string $t): bool
    {
        return (bool) preg_match('/\b(ore|orai|clame|clamai|busque|buscai|confie|confiai|entregue|entregai|espere|esperai|louve|louvai|agrade[cç]a|agradecei)\b/u', $t);
    }

    private function hasComfortWords(string $t): bool
    {
        return (bool) preg_match('/\b(paz|descanso|consolo|esperan[çc]a|alegria|for[çc]a|ref[uú]gio|socorro|salva[cç][aã]o|gra[çc]a|miseric[oó]rdia)\b/u', $t);
    }

    /**
     * @return array<string, int>
     */
    private function categoryScores(string $t): array
    {
        $cats = [
            'Esperança' => [
                'esperança', 'futuro', 'amanhã', 'vida eterna', 'nova', 'renovar', 'restaurar', 'promessa',
            ],
            'Fé' => [
                'fé', 'crer', 'creia', 'crede', 'confessar', 'justo viverá', 'invisível',
            ],
            'Confiança' => [
                'confie', 'confiança', 'refúgio', 'seguro', 'socorro', 'fortaleza', 'proteção', 'guardar', 'cuidar',
            ],
            'Oração' => [
                'oração', 'orar', 'ore', 'clamar', 'clame', 'pedir', 'peça', 'suplicar',
            ],
            'Perdão' => [
                'perdão', 'perdoar', 'perdoe', 'perdoai', 'confessar', 'limpar', 'purificar', 'misericórdia',
            ],
            'Gratidão' => [
                'gratidão', 'agradeça', 'agradecei', 'louvor', 'louve', 'bendiga', 'exaltar',
            ],
            'Família' => [
                'pai', 'mãe', 'filhos', 'lar', 'casa', 'esposo', 'esposa', 'casamento',
            ],
            'Salvação' => [
                'salvação', 'salvar', 'salvo', 'vida eterna', 'graça', 'redenção', 'cruz', 'arrependa', 'arrependimento',
            ],
            'Volta de Jesus' => [
                'voltarei', 'voltará', 'vinda', 'venho sem demora', 'arrebat', 'nuvens', 'volta',
            ],
            'Sábado' => [
                'sábado', 'santificar', 'descanso', 'mandamento',
            ],
            'Consolo' => [
                'consolo', 'paz', 'não temas', 'não tenha medo', 'cuidarei', 'descanso', 'alívio',
            ],
            'Coragem' => [
                'coragem', 'forte', 'fortaleça', 'não temas', 'não tenha medo', 'valente', 'ânimo',
            ],
            'Sabedoria' => [
                'sabedoria', 'entendimento', 'ensina', 'caminho', 'verdade', 'prudência', 'discernimento',
            ],
        ];

        $scores = [];
        foreach ($cats as $cat => $keywords) {
            $score = 0;
            foreach ($keywords as $kw) {
                $kw = (string) $kw;
                if ($kw === '') {
                    continue;
                }
                if (Str::contains(mb_strtolower($t), mb_strtolower($kw))) {
                    $score += 2;
                }
            }
            // Ajuste: presença explícita de Deus reforça categorias devocionais.
            if ($cat !== 'Família' && preg_match('/\b(deus|senhor|jesus|cristo)\b/u', $t)) {
                $score += 1;
            }
            $scores[$cat] = $score;
        }

        return $scores;
    }

    /**
     * @param array<int, array{
     *   livro:string, capitulo:int, versiculo_inicio:int, versiculo_fim:int, categoria:string, nota:int, peso:int, texto:string, ref:string
     * }> $items
     */
    private function renderSql(array $items): string
    {
        $lines = [];
        $lines[] = '-- Caixinha Bíblica - seed gerado automaticamente';
        $lines[] = '-- Origem: bible_books + bible_verses';
        $lines[] = '-- Regras: nota >= 8, devocional, sem violência/genealogia/leis técnicas';
        $lines[] = '';
        $lines[] = 'INSERT INTO versiculos_caixinha';
        $lines[] = '(livro, capitulo, versiculo_inicio, versiculo_fim, categoria, nota, peso)';
        $lines[] = 'VALUES';

        $values = [];
        foreach ($items as $it) {
            $livro = $this->sqlString($it['livro']);
            $cat = $this->sqlString($it['categoria']);
            $values[] = sprintf(
                "(%s, %d, %d, %d, %s, %d, %d)",
                $livro,
                (int) $it['capitulo'],
                (int) $it['versiculo_inicio'],
                (int) $it['versiculo_fim'],
                $cat,
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
        // SQL single-quote escape.
        $s = str_replace("'", "''", $s);

        return "'".$s."'";
    }
}

