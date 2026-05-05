<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function ns_col_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare("
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = :t
          AND column_name = :c
        LIMIT 1
    ");
    $stmt->execute([':t' => $table, ':c' => $column]);
    return (bool)$stmt->fetchColumn();
}

function ns_table_exists2(PDO $pdo, string $table): bool
{
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

function ns_has_desafios_schema(PDO $pdo): bool
{
    return ns_table_exists2($pdo, 'ano_biblico_desafios')
        && ns_table_exists2($pdo, 'ano_biblico_desafio_usuario')
        && ns_table_exists2($pdo, 'ano_biblico_desafio_itens')
        && ns_table_exists2($pdo, 'bible_books');
}

/**
 * Retorna total de capítulos por escopo.
 * escopo = 'all' | 'new'
 */
function ns_total_capitulos(PDO $pdo, string $escopo): int
{
    $where = '';
    $params = [];
    if ($escopo === 'new') {
        $where = "WHERE testament = :t";
        $params[':t'] = 'new';
    }
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(chapters_count),0) AS total FROM bible_books {$where}");
    $stmt->execute($params);
    return (int)($stmt->fetchColumn() ?: 0);
}

/**
 * Lista ordenada de capítulos (book_id, chapter) para o escopo.
 * Mantém ordem bíblica: testament/position e capítulo.
 *
 * @return array<int, array{book_id:int, chapter:int}>
 */
function ns_listar_capitulos(PDO $pdo, string $escopo): array
{
    $where = '';
    $params = [];
    if ($escopo === 'new') {
        $where = "WHERE testament = :t";
        $params[':t'] = 'new';
    }
    $stmt = $pdo->prepare("SELECT id, chapters_count FROM bible_books {$where} ORDER BY position");
    $stmt->execute($params);
    $books = $stmt->fetchAll();

    $out = [];
    foreach ($books as $b) {
        $bookId = (int)$b['id'];
        $count = (int)$b['chapters_count'];
        for ($c = 1; $c <= $count; $c++) {
            $out[] = ['book_id' => $bookId, 'chapter' => $c];
        }
    }
    return $out;
}

/**
 * Busca desafios ativos para tela de seleção.
 *
 * @return array<int, array{id:int,chave:string,nome:string,descricao:string,tipo:string,duracao_dias:?int,escopo:string}>
 */
function ns_listar_desafios(PDO $pdo): array
{
    $stmt = $pdo->prepare("
        SELECT id, chave, nome, descricao, tipo, duracao_dias, escopo
        FROM ano_biblico_desafios
        WHERE ativo = 1
        ORDER BY id
    ");
    $stmt->execute();
    return array_map(function (array $r) {
        return [
            'id' => (int)$r['id'],
            'chave' => (string)$r['chave'],
            'nome' => (string)$r['nome'],
            'descricao' => (string)$r['descricao'],
            'tipo' => (string)$r['tipo'],
            'duracao_dias' => $r['duracao_dias'] !== null ? (int)$r['duracao_dias'] : null,
            'escopo' => (string)$r['escopo'],
        ];
    }, $stmt->fetchAll());
}

/**
 * Retorna desafio ativo do usuário (se houver).
 * @return array{ok:bool, row?:array, error?:string}
 */
function ns_get_desafio_ativo(PDO $pdo, int $usuario_id): array
{
    $stmt = $pdo->prepare("
        SELECT du.*, d.nome, d.descricao, d.chave, d.escopo
        FROM ano_biblico_desafio_usuario du
        JOIN ano_biblico_desafios d ON d.id = du.desafio_id
        WHERE du.usuario_id = :uid AND du.status = 'active'
        ORDER BY du.id DESC
        LIMIT 1
    ");
    $stmt->execute([':uid' => $usuario_id]);
    $row = $stmt->fetch();
    if (!$row) return ['ok' => true, 'row' => null];
    return ['ok' => true, 'row' => $row];
}

/**
 * Arquiva desafio ativo (não apaga histórico).
 */
function ns_arquivar_desafio_ativo(PDO $pdo, int $usuario_id): void
{
    $stmt = $pdo->prepare("
        UPDATE ano_biblico_desafio_usuario
        SET status = 'archived', arquivado_em = NOW(), atualizado_em = NOW()
        WHERE usuario_id = :uid AND status = 'active'
    ");
    $stmt->execute([':uid' => $usuario_id]);
}

/**
 * Gera plano de leitura para o usuário conforme o desafio.
 * - Mantém ordem bíblica
 * - Distribui capítulos equilibrados: ceil(capítulos / dias)
 * - Suporta escopo all/new
 *
 * @return array{ok:bool, usuario_desafio_id?:int, error?:string}
 */
function gerarPlanoUsuario(int $usuario_id, int $plano_id, ?string $data_fim = null, bool $arquivar_ativo = true): array
{
    $pdo = ns_pdo();
    if (!ns_has_desafios_schema($pdo)) {
        return ['ok' => false, 'error' => 'Schema de desafios não instalado. Rode o instalador SQL do módulo.'];
    }

    // Busca desafio
    $stmt = $pdo->prepare("SELECT id, chave, tipo, duracao_dias, escopo FROM ano_biblico_desafios WHERE id = :id AND ativo = 1");
    $stmt->execute([':id' => $plano_id]);
    $d = $stmt->fetch();
    if (!$d) return ['ok' => false, 'error' => 'Desafio não encontrado.'];

    $tipo = (string)$d['tipo'];
    $escopo = (string)$d['escopo'];

    $inicio = new DateTimeImmutable('today');
    if ($tipo === 'fim_do_ano') {
        $fim = new DateTimeImmutable($inicio->format('Y') . '-12-31');
    } elseif ($tipo === 'um_ano') {
        $fim = $inicio->modify('+365 days');
    } elseif ($tipo === 'data_personalizada') {
        if (!$data_fim) return ['ok' => false, 'error' => 'Informe a data final.'];
        $fim = new DateTimeImmutable($data_fim);
        if ($fim <= $inicio) return ['ok' => false, 'error' => 'A data final precisa ser maior que hoje.'];
    } elseif ($tipo === 'noventa_dias') {
        $fim = $inicio->modify('+90 days');
    } elseif ($tipo === 'novo_testamento_30') {
        $fim = $inicio->modify('+30 days');
    } else {
        return ['ok' => false, 'error' => 'Tipo de desafio inválido.'];
    }

    $diasDisponiveis = (int)$inicio->diff($fim)->days + 1; // inclui hoje
    if ($diasDisponiveis < 1) $diasDisponiveis = 1;

    $capitulos = ns_listar_capitulos($pdo, $escopo);
    if (!$capitulos) return ['ok' => false, 'error' => 'Nenhum capítulo encontrado para este escopo.'];

    $capitulosPorDia = (int)ceil(count($capitulos) / $diasDisponiveis);
    if ($capitulosPorDia < 1) $capitulosPorDia = 1;

    try {
        $pdo->beginTransaction();

        if ($arquivar_ativo) {
            ns_arquivar_desafio_ativo($pdo, $usuario_id);
        }

        // Cria instância do desafio
        $stmtI = $pdo->prepare("
            INSERT INTO ano_biblico_desafio_usuario (usuario_id, desafio_id, data_inicio, data_fim, status, criado_em, atualizado_em)
            VALUES (:uid, :did, :di, :df, 'active', NOW(), NOW())
        ");
        $stmtI->execute([
            ':uid' => $usuario_id,
            ':did' => (int)$d['id'],
            ':di' => $inicio->format('Y-m-d'),
            ':df' => $fim->format('Y-m-d'),
        ]);
        $usuarioDesafioId = (int)$pdo->lastInsertId();

        // Insere itens
        $stmtItem = $pdo->prepare("
            INSERT INTO ano_biblico_desafio_itens
              (usuario_desafio_id, usuario_id, dia, data_leitura, livro_id, capitulo, concluido, data_conclusao)
            VALUES
              (:ud, :uid, :dia, :data, :livro, :cap, 0, NULL)
        ");

        $idx = 0;
        for ($dia = 1; $dia <= $diasDisponiveis && $idx < count($capitulos); $dia++) {
            $data = $inicio->modify('+' . ($dia - 1) . ' days')->format('Y-m-d');
            for ($k = 0; $k < $capitulosPorDia && $idx < count($capitulos); $k++, $idx++) {
                $stmtItem->execute([
                    ':ud' => $usuarioDesafioId,
                    ':uid' => $usuario_id,
                    ':dia' => $dia,
                    ':data' => $data,
                    ':livro' => (int)$capitulos[$idx]['book_id'],
                    ':cap' => (int)$capitulos[$idx]['chapter'],
                ]);
            }
        }

        $pdo->commit();
        return ['ok' => true, 'usuario_desafio_id' => $usuarioDesafioId];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        return ['ok' => false, 'error' => 'Erro ao gerar plano: ' . $e->getMessage()];
    }
}

/**
 * Status simples:
 * - Em dia: próxima leitura pendente é hoje
 * - Atrasado: próxima leitura pendente é antes de hoje
 * - Adiantado: próxima leitura pendente é após hoje
 *
 * @return array{kind:string, label:string, days:int}
 */
function ns_status_desafio(PDO $pdo, int $usuario_desafio_id): array
{
    $today = new DateTimeImmutable('today');
    $stmt = $pdo->prepare("
        SELECT MIN(data_leitura) AS dt
        FROM ano_biblico_desafio_itens
        WHERE usuario_desafio_id = :ud AND concluido = 0
    ");
    $stmt->execute([':ud' => $usuario_desafio_id]);
    $dt = (string)($stmt->fetchColumn() ?: '');
    if ($dt === '') return ['kind' => 'finished', 'label' => 'Concluído', 'days' => 0];

    $next = new DateTimeImmutable($dt);
    $diff = (int)$next->diff($today)->days;
    if ($next->format('Y-m-d') === $today->format('Y-m-d')) return ['kind' => 'on_time', 'label' => 'Em dia', 'days' => 0];
    if ($next < $today) return ['kind' => 'late', 'label' => "Atrasado em {$diff} dia(s)", 'days' => $diff];
    return ['kind' => 'ahead', 'label' => "Adiantado em {$diff} dia(s)", 'days' => $diff];
}

/**
 * Leitura de hoje (ou próxima pendente).
 * @return array{ok:bool, dia?:int, data_leitura?:string, chapters?:array, display?:string, error?:string}
 */
function ns_leitura_hoje(PDO $pdo, int $usuario_desafio_id): array
{
    $stmt = $pdo->prepare("
        SELECT dia, data_leitura
        FROM ano_biblico_desafio_itens
        WHERE usuario_desafio_id = :ud AND concluido = 0
        ORDER BY data_leitura, dia
        LIMIT 1
    ");
    $stmt->execute([':ud' => $usuario_desafio_id]);
    $row = $stmt->fetch();
    if (!$row) return ['ok' => true, 'chapters' => [], 'display' => '', 'dia' => 0];

    $dia = (int)$row['dia'];
    $data = (string)$row['data_leitura'];

    $stmt2 = $pdo->prepare("
        SELECT
          i.livro_id AS book_id,
          b.abbrev AS book_key,
          b.name AS book_name,
          i.capitulo AS chapter
        FROM ano_biblico_desafio_itens i
        JOIN bible_books b ON b.id = i.livro_id
        WHERE i.usuario_desafio_id = :ud AND i.dia = :dia
        ORDER BY b.position, i.capitulo
    ");
    $stmt2->execute([':ud' => $usuario_desafio_id, ':dia' => $dia]);
    $chapters = $stmt2->fetchAll();

    // Reusa formatador do módulo antigo, se disponível.
    $display = '';
    if (function_exists('ns_format_reading_display')) {
        $display = ns_format_reading_display($chapters);
    } else {
        // fallback simples
        $display = $chapters ? ((string)$chapters[0]['book_name'] . ' ' . (int)$chapters[0]['chapter']) : '';
    }

    return [
        'ok' => true,
        'dia' => $dia,
        'data_leitura' => $data,
        'chapters' => array_map(fn ($c) => [
            'book_id' => (int)$c['book_id'],
            'book_key' => (string)$c['book_key'],
            'book_name' => (string)$c['book_name'],
            'chapter' => (int)$c['chapter'],
        ], $chapters),
        'display' => $display,
    ];
}

/**
 * Marca todos os itens do dia como concluídos.
 */
function ns_concluir_dia_desafio(PDO $pdo, int $usuario_desafio_id, int $dia): array
{
    if ($dia < 1) return ['ok' => false, 'error' => 'Dia inválido.'];
    try {
        $stmt = $pdo->prepare("
            UPDATE ano_biblico_desafio_itens
            SET concluido = 1, data_conclusao = NOW()
            WHERE usuario_desafio_id = :ud AND dia = :dia AND concluido = 0
        ");
        $stmt->execute([':ud' => $usuario_desafio_id, ':dia' => $dia]);
        return ['ok' => true];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => 'Erro ao concluir: ' . $e->getMessage()];
    }
}

