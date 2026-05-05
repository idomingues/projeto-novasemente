<?php
declare(strict_types=1);

/**
 * Instala o módulo "Ano Bíblico" sem depender do binário `mysql`.
 *
 * Uso:
 *   php scripts/instalar_ano_biblico.php
 *
 * Ele executa `database/sql/ano_biblico.sql` via PDO usando as credenciais do `.env`.
 */

require_once __DIR__ . '/../public/ano_biblico/_inc/db.php';

function out(string $msg): void { fwrite(STDOUT, $msg . PHP_EOL); }
function fail(string $msg): void { fwrite(STDERR, $msg . PHP_EOL); exit(1); }

function read_sql_file(string $path): string
{
    if (!is_file($path)) fail("SQL não encontrado: {$path}");
    $sql = file_get_contents($path);
    if ($sql === false) fail("Falha ao ler SQL: {$path}");
    return $sql;
}

/**
 * Divide um arquivo SQL em statements por ';' respeitando aspas simples/dobras.
 * Remove comentários de linha que começam com `--`.
 *
 * @return string[]
 */
function split_sql_statements(string $sql): array
{
    // remove comentários de linha (simples e suficiente para o nosso arquivo)
    $lines = preg_split("/\r\n|\n|\r/", $sql) ?: [];
    $filtered = [];
    foreach ($lines as $line) {
        $trim = ltrim($line);
        if (str_starts_with($trim, '--')) continue;
        $filtered[] = $line;
    }
    $sql = implode("\n", $filtered);

    $stmts = [];
    $buf = '';
    $inSingle = false;
    $inDouble = false;
    $len = strlen($sql);

    for ($i = 0; $i < $len; $i++) {
        $ch = $sql[$i];

        // alterna estado de aspas (ignorando escapes)
        if ($ch === "'" && !$inDouble) {
            $prev = $i > 0 ? $sql[$i - 1] : '';
            if ($prev !== "\\") $inSingle = !$inSingle;
        } elseif ($ch === '"' && !$inSingle) {
            $prev = $i > 0 ? $sql[$i - 1] : '';
            if ($prev !== "\\") $inDouble = !$inDouble;
        }

        if ($ch === ';' && !$inSingle && !$inDouble) {
            $stmt = trim($buf);
            $buf = '';
            if ($stmt !== '') $stmts[] = $stmt;
            continue;
        }

        $buf .= $ch;
    }

    $tail = trim($buf);
    if ($tail !== '') $stmts[] = $tail;

    return $stmts;
}

function table_has_column(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        "SELECT 1
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = :t
           AND column_name = :c
         LIMIT 1"
    );
    $stmt->execute([':t' => $table, ':c' => $column]);
    return (bool) $stmt->fetchColumn();
}

$postInstallAlters = [
    // evoluções do schema (idempotentes via information_schema)
    [
        'table' => 'ano_biblico_usuario',
        'column' => 'data_fim',
        'sql' => "ALTER TABLE `ano_biblico_usuario` ADD COLUMN `data_fim` DATE NULL AFTER `data_inicio`",
    ],
    [
        'table' => 'ano_biblico_usuario',
        'column' => 'status',
        'sql' => "ALTER TABLE `ano_biblico_usuario` ADD COLUMN `status` VARCHAR(20) NULL AFTER `data_fim`",
    ],
];

$sqlPath = __DIR__ . '/../database/sql/ano_biblico.sql';

try {
    $pdo = ns_pdo();
} catch (Throwable $e) {
    fail('Erro ao conectar no banco: ' . $e->getMessage());
}

$sql = read_sql_file($sqlPath);
$stmts = split_sql_statements($sql);
if (!$stmts) fail('Nenhum statement SQL encontrado.');

out('Instalando módulo Ano Bíblico...');

try {
    foreach ($stmts as $idx => $stmt) {
        $pdo->exec($stmt);
    }

    foreach ($postInstallAlters as $a) {
        if (!table_has_column($pdo, (string) $a['table'], (string) $a['column'])) {
            $pdo->exec((string) $a['sql']);
        }
    }
} catch (Throwable $e) {
    fail('Falha ao instalar: ' . $e->getMessage());
}

out('OK. Tabelas criadas/atualizadas com sucesso: plano_leitura, leitura_usuario, leitura_usuario_capitulo, ano_biblico_usuario, ano_biblico_usuario_itens, ano_biblico_desafios, ano_biblico_desafio_usuario, ano_biblico_desafio_itens');
out('Próximo passo: php scripts/gerar_plano_ano_biblico.php');

