<?php
declare(strict_types=1);

/**
 * Gera automaticamente o plano de leitura de 365 dias.
 *
 * Fonte:
 * - bible_books (ordem por position)
 * - bible_verses (capítulos existentes por livro)
 *
 * Distribuição:
 * - ~3 a 4 capítulos/dia, equilibrado pelo total de capítulos.
 *
 * Como rodar (no root do projeto):
 *   php scripts/gerar_plano_ano_biblico.php
 */

require_once __DIR__ . '/../public/ano_biblico/_inc/db.php';

function fail(string $msg): void {
    fwrite(STDERR, $msg . PHP_EOL);
    exit(1);
}

try {
    $pdo = ns_pdo();
} catch (Throwable $e) {
    fail('Erro ao conectar no banco: ' . $e->getMessage());
}

// Pega lista de (livro, capitulo) existentes, na ordem canônica do livro.
$rows = $pdo->query("
    SELECT
      b.id AS book_id,
      b.position AS book_position,
      b.name AS book_name,
      v.chapter AS chapter
    FROM bible_verses v
    JOIN bible_books b ON b.id = v.book_id
    GROUP BY b.id, b.position, b.name, v.chapter
    ORDER BY b.position ASC, v.chapter ASC
")->fetchAll();

if (!$rows) {
    fail('Nenhum capítulo encontrado em bible_verses. Você já importou a Bíblia? (artisan bible:import)');
}

$totalChapters = count($rows);
$days = 365;
$minPerDay = 3;
$baseTotal = $days * $minPerDay;
if ($totalChapters < $baseTotal) {
    fail("Total de capítulos ({$totalChapters}) é menor que {$baseTotal}. Ajuste a regra ou confira o dataset.");
}

// Quantos dias terão 4 capítulos:
$extra = $totalChapters - $baseTotal; // cada "extra" vira +1 capítulo em um dia
if ($extra > $days) {
    // Em tese não deve acontecer com Bíblia padrão.
    fail("Total de capítulos ({$totalChapters}) gera extra ({$extra}) maior que 365. Ajuste a regra.");
}

// Monta vetor com capítulos/dia: $extra dias com 4, resto com 3.
$chaptersPerDay = array_fill(0, $days, $minPerDay);
for ($i = 0; $i < $extra; $i++) {
    $chaptersPerDay[$i] = $minPerDay + 1;
}

// Embaralhar NÃO: precisamos manter sequência bíblica.
// Para não "pesar" sempre no começo com 4, distribui em intervalos.
if ($extra > 0) {
    $spread = array_fill(0, $days, $minPerDay);
    $step = $days / $extra;
    for ($k = 0; $k < $extra; $k++) {
        $idx = (int)floor($k * $step);
        if ($idx >= 0 && $idx < $days) {
            $spread[$idx] = $minPerDay + 1;
        }
    }
    // Preenche os restantes 4-caps (se colisão gerou menos)
    $need = $extra - count(array_filter($spread, fn($x) => $x === 4));
    if ($need > 0) {
        for ($i = 0; $i < $days && $need > 0; $i++) {
            if ($spread[$i] === 3) {
                $spread[$i] = 4;
                $need--;
            }
        }
    }
    $chaptersPerDay = $spread;
}

$pdo->beginTransaction();
try {
    // Limpa plano anterior
    $pdo->exec("DELETE FROM plano_leitura");

    $ins = $pdo->prepare("INSERT INTO plano_leitura (dia, livro_id, capitulo) VALUES (:dia, :livro, :cap)");

    $pos = 0;
    for ($day = 1; $day <= $days; $day++) {
        $count = $chaptersPerDay[$day - 1];
        for ($j = 0; $j < $count; $j++) {
            if (!isset($rows[$pos])) break 2;
            $r = $rows[$pos];
            $ins->execute([
                ':dia' => $day,
                ':livro' => (int)$r['book_id'],
                ':cap' => (int)$r['chapter'],
            ]);
            $pos++;
        }
    }

    // Se sobrou capítulo (por algum motivo), empurra para os últimos dias.
    while (isset($rows[$pos])) {
        $day = $days;
        $r = $rows[$pos];
        $ins->execute([
            ':dia' => $day,
            ':livro' => (int)$r['book_id'],
            ':cap' => (int)$r['chapter'],
        ]);
        $pos++;
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    fail('Falha ao gerar plano: ' . $e->getMessage());
}

echo "OK. Plano gerado: {$totalChapters} capítulos distribuídos em 365 dias." . PHP_EOL;

