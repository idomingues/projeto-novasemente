<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function ns_table_exists(PDO $pdo, string $table): bool
{
    // `SHOW TABLES LIKE ?` pode falhar com placeholders em alguns MariaDBs.
    // Usar information_schema é mais compatível e continua seguro (prepared).
    $stmt = $pdo->prepare("
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = :t
        LIMIT 1
    ");
    $stmt->execute([':t' => $table]);
    return (bool)$stmt->fetchColumn();
}

/**
 * Valida se o módulo está instalado no DB.
 *
 * @return array{ok:bool, error?:string, setupNeeded?:bool}
 */
function ns_assert_ano_biblico_schema(PDO $pdo): array
{
    if (!ns_table_exists($pdo, 'plano_leitura') || !ns_table_exists($pdo, 'leitura_usuario')) {
        return [
            'ok' => false,
            'setupNeeded' => true,
            'error' => 'As tabelas do módulo (plano_leitura / leitura_usuario) ainda não existem no banco.',
        ];
    }
    return ['ok' => true];
}

/**
 * Retorna o próximo dia não concluído e a sugestão de capítulos.
 *
 * @return array{
 *   ok: bool,
 *   setupNeeded?: bool,
 *   error?: string,
 *   dia?: int,
 *   chapters?: array<int, array{book_id:int, book_key:string, book_name:string, chapter:int}>,
 *   display?: string,
 *   finished?: bool
 * }
 */
function getLeituraDoDia(int $usuario_id): array
{
    $pdo = ns_pdo();

    $schema = ns_assert_ano_biblico_schema($pdo);
    if (!$schema['ok']) return $schema;

    // Próximo dia do plano que ainda não está concluído pelo usuário.
    try {
        $stmt = $pdo->prepare("
            SELECT MIN(p.dia) AS dia
            FROM plano_leitura p
            LEFT JOIN leitura_usuario lu
              ON lu.usuario_id = :uid AND lu.dia = p.dia AND lu.concluido = 1
            WHERE lu.id IS NULL
        ");
        $stmt->execute([':uid' => $usuario_id]);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => 'Erro ao consultar o plano: ' . $e->getMessage()];
    }

    $dia = isset($row['dia']) ? (int)$row['dia'] : 0;
    if ($dia <= 0) {
        return ['ok' => true, 'finished' => true];
    }

    $stmt2 = $pdo->prepare("
        SELECT
          p.livro_id AS book_id,
          b.`key` AS book_key,
          b.`name` AS book_name,
          p.capitulo AS chapter
        FROM plano_leitura p
        JOIN bible_books b ON b.id = p.livro_id
        WHERE p.dia = :dia
        ORDER BY b.position, p.capitulo
    ");
    $stmt2->execute([':dia' => $dia]);
    $chapters = $stmt2->fetchAll();

    $display = ns_format_reading_display($chapters);

    return [
        'ok' => true,
        'dia' => $dia,
        'chapters' => array_map(function (array $c) {
            return [
                'book_id' => (int)$c['book_id'],
                'book_key' => (string)$c['book_key'],
                'book_name' => (string)$c['book_name'],
                'chapter' => (int)$c['chapter'],
            ];
        }, $chapters),
        'display' => $display,
    ];
}

function marcarComoConcluido(int $usuario_id, int $dia): array
{
    if ($dia < 1 || $dia > 365) {
        return ['ok' => false, 'error' => 'Dia inválido.'];
    }

    $pdo = ns_pdo();
    $schema = ns_assert_ano_biblico_schema($pdo);
    if (!$schema['ok']) return $schema;

    // Upsert (MySQL/MariaDB) — garante 1 linha por (usuario_id, dia)
    try {
        $stmt = $pdo->prepare("
            INSERT INTO leitura_usuario (usuario_id, dia, concluido, data_conclusao)
            VALUES (:uid, :dia, 1, NOW())
            ON DUPLICATE KEY UPDATE
              concluido = VALUES(concluido),
              data_conclusao = VALUES(data_conclusao)
        ");
        $stmt->execute([':uid' => $usuario_id, ':dia' => $dia]);
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => 'Erro ao marcar como concluído: ' . $e->getMessage()];
    }

    return ['ok' => true];
}

/**
 * @return array{ok:bool, total:int, concluidos:int, restantes:int, percent:int}
 */
function getProgresso(int $usuario_id): array
{
    $pdo = ns_pdo();
    $schema = ns_assert_ano_biblico_schema($pdo);
    if (!$schema['ok']) {
        return [
            'ok' => false,
            'setupNeeded' => $schema['setupNeeded'] ?? false,
            'error' => $schema['error'] ?? 'Módulo não instalado.',
            'total' => 365,
            'concluidos' => 0,
            'restantes' => 365,
            'percent' => 0,
        ];
    }

    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT dia) AS concluidos
            FROM leitura_usuario
            WHERE usuario_id = :uid AND concluido = 1
        ");
        $stmt->execute([':uid' => $usuario_id]);
        $row = $stmt->fetch();
        $concluidos = isset($row['concluidos']) ? (int)$row['concluidos'] : 0;
    } catch (Throwable $e) {
        $concluidos = 0;
    }

    $total = 365;
    $restantes = max(0, $total - $concluidos);
    $percent = (int)floor(($concluidos / $total) * 100);

    return [
        'ok' => true,
        'total' => $total,
        'concluidos' => $concluidos,
        'restantes' => $restantes,
        'percent' => $percent,
    ];
}

/**
 * Converte capítulos do dia em um texto compacto:
 * - 1 livro: "Gênesis 10–12"
 * - múltiplos livros: "Gênesis 50; Êxodo 1–2"
 *
 * @param array<int, array{book_name:string, chapter:int}> $chapters
 */
function ns_format_reading_display(array $chapters): string
{
    if (!$chapters) return '';

    // Agrupa por livro mantendo ordem.
    $out = [];
    $currentBook = null;
    $current = [];

    foreach ($chapters as $c) {
        $book = (string)$c['book_name'];
        $chap = (int)$c['chapter'];
        if ($currentBook === null) {
            $currentBook = $book;
            $current = [$chap];
            continue;
        }
        if ($book !== $currentBook) {
            $out[] = ns_format_book_chapters($currentBook, $current);
            $currentBook = $book;
            $current = [$chap];
            continue;
        }
        $current[] = $chap;
    }
    if ($currentBook !== null) {
        $out[] = ns_format_book_chapters($currentBook, $current);
    }

    return implode('; ', $out);
}

/**
 * @param int[] $chapters
 */
function ns_format_book_chapters(string $bookName, array $chapters): string
{
    $chapters = array_values(array_unique(array_map('intval', $chapters)));
    sort($chapters);

    // Transforma em ranges consecutivos.
    $ranges = [];
    $start = null;
    $prev = null;
    foreach ($chapters as $c) {
        if ($start === null) {
            $start = $c;
            $prev = $c;
            continue;
        }
        if ($c === $prev + 1) {
            $prev = $c;
            continue;
        }
        $ranges[] = [$start, $prev];
        $start = $c;
        $prev = $c;
    }
    if ($start !== null && $prev !== null) {
        $ranges[] = [$start, $prev];
    }

    $parts = [];
    foreach ($ranges as [$a, $b]) {
        $parts[] = ($a === $b) ? (string)$a : ($a . '–' . $b);
    }

    return trim($bookName . ' ' . implode(', ', $parts));
}

