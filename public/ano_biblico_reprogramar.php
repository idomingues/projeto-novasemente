<?php
declare(strict_types=1);

require_once __DIR__ . '/ano_biblico/_inc/ano_biblico_model.php';
require_once __DIR__ . '/ano_biblico/_inc/desafios_model.php';

$usuario_id = isset($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : 0;
if ($usuario_id <= 0) $usuario_id = 1;

$pdo = ns_pdo();
$setupNeeded = !ns_has_desafios_schema($pdo);

$brand600 = '#008d36';

$feedback = null;

if ($setupNeeded) {
    $active = null;
} else {
    $active = ns_get_desafio_ativo($pdo, $usuario_id)['row'] ?? null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$setupNeeded && $active) {
    $mode = (string)($_POST['mode'] ?? 'keep_end');
    $dataFim = isset($_POST['data_fim']) && $_POST['data_fim'] !== '' ? (string)$_POST['data_fim'] : null;

    $ud = (int)$active['id'];
    $today = new DateTimeImmutable('today');
    $currentEnd = new DateTimeImmutable((string)$active['data_fim']);
    $targetEnd = $currentEnd;

    if ($mode === 'new_end') {
        if (!$dataFim) {
            $feedback = ['type' => 'danger', 'msg' => 'Informe a nova data final.'];
        } else {
            $targetEnd = new DateTimeImmutable($dataFim);
            if ($targetEnd <= $today) {
                $feedback = ['type' => 'danger', 'msg' => 'A data final precisa ser maior que hoje.'];
            }
        }
    } elseif ($mode === 'start_today_keep_end') {
        // só redistribui a partir de hoje mantendo data final
    } elseif ($mode !== 'keep_end') {
        $feedback = ['type' => 'danger', 'msg' => 'Opção inválida.'];
    }

    if (!$feedback) {
        try {
            $pdo->beginTransaction();

            // carrega itens concluídos (mantém)
            $stmtDone = $pdo->prepare("
                SELECT livro_id, capitulo, data_conclusao
                FROM ano_biblico_desafio_itens
                WHERE usuario_desafio_id = :ud AND concluido = 1
                ORDER BY id
            ");
            $stmtDone->execute([':ud' => $ud]);
            $done = $stmtDone->fetchAll();

            $doneMap = [];
            foreach ($done as $r) {
                $doneMap[((int)$r['livro_id']).':'.((int)$r['capitulo'])] = (string)($r['data_conclusao'] ?? '');
            }

            // lista completa de capítulos do escopo do desafio
            $escopo = (string)($active['escopo'] ?? 'all');
            $all = ns_listar_capitulos($pdo, $escopo);

            $remaining = [];
            foreach ($all as $c) {
                $k = ((int)$c['book_id']).':'.((int)$c['chapter']);
                if (!isset($doneMap[$k])) $remaining[] = $c;
            }

            // remove itens não concluídos e recria agenda
            $stmtDel = $pdo->prepare("DELETE FROM ano_biblico_desafio_itens WHERE usuario_desafio_id = :ud AND concluido = 0");
            $stmtDel->execute([':ud' => $ud]);

            $diasRestantes = (int)$today->diff($targetEnd)->days + 1;
            if ($diasRestantes < 1) $diasRestantes = 1;
            $capRest = count($remaining);
            $porDia = (int)ceil($capRest / $diasRestantes);
            if ($porDia < 1) $porDia = 1;

            // define próximo "dia" sequencial após o último dia já existente
            $stmtMax = $pdo->prepare("SELECT COALESCE(MAX(dia),0) FROM ano_biblico_desafio_itens WHERE usuario_desafio_id = :ud");
            $stmtMax->execute([':ud' => $ud]);
            $dia = (int)($stmtMax->fetchColumn() ?: 0);
            $dia = max(1, $dia + 1);

            $stmtIns = $pdo->prepare("
                INSERT INTO ano_biblico_desafio_itens
                  (usuario_desafio_id, usuario_id, dia, data_leitura, livro_id, capitulo, concluido, data_conclusao)
                VALUES
                  (:ud, :uid, :dia, :dt, :livro, :cap, 0, NULL)
            ");

            $idx = 0;
            $date = $today;
            while ($idx < $capRest) {
                $dt = $date->format('Y-m-d');
                $count = 0;
                while ($idx < $capRest && $count < $porDia) {
                    $stmtIns->execute([
                        ':ud' => $ud,
                        ':uid' => $usuario_id,
                        ':dia' => $dia,
                        ':dt' => $dt,
                        ':livro' => (int)$remaining[$idx]['book_id'],
                        ':cap' => (int)$remaining[$idx]['chapter'],
                    ]);
                    $idx++;
                    $count++;
                }
                $dia++;
                $date = $date->modify('+1 day');
                if ($date > $targetEnd && $idx < $capRest) $date = $targetEnd;
            }

            $stmtUp = $pdo->prepare("
                UPDATE ano_biblico_desafio_usuario
                SET data_fim = :df, atualizado_em = NOW()
                WHERE id = :ud
            ");
            $stmtUp->execute([':df' => $targetEnd->format('Y-m-d'), ':ud' => $ud]);

            $pdo->commit();
            header('Location: /ano_biblico.php?usuario_id=' . $usuario_id);
            exit;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $feedback = ['type' => 'danger', 'msg' => 'Erro ao reprogramar: ' . $e->getMessage()];
        }
    }
}

// Preview simples para UI
$preview = null;
if (!$setupNeeded && $active) {
    $ud = (int)$active['id'];
    $stmtR = $pdo->prepare("SELECT COUNT(*) FROM ano_biblico_desafio_itens WHERE usuario_desafio_id = :ud AND concluido = 0");
    $stmtR->execute([':ud' => $ud]);
    $rest = (int)($stmtR->fetchColumn() ?: 0);
    $end = new DateTimeImmutable((string)$active['data_fim']);
    $today = new DateTimeImmutable('today');
    $dias = (int)$today->diff($end)->days + 1;
    if ($dias < 1) $dias = 1;
    $preview = ['rest' => $rest, 'dias' => $dias, 'porDia' => $dias > 0 ? (int)ceil($rest / $dias) : $rest];
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reprogramar Ano Bíblico</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root{ --ns-brand-600: <?= htmlspecialchars($brand600, ENT_QUOTES) ?>; }
        body{ background:#f8fafc; }
        .ns-card{
            border: 1px solid rgba(0,0,0,.06);
            box-shadow: 0 12px 30px rgba(0,0,0,.06);
            border-radius: 18px;
        }
        .btn-ns{
            background: var(--ns-brand-600);
            border-color: var(--ns-brand-600);
            font-weight: 700;
            border-radius: 999px;
            padding: .85rem 1.1rem;
        }
        .btn-ns:hover{ background: #00732d; border-color: #00732d; }
    </style>
</head>
<body>
<div class="container py-4" style="max-width: 720px;">
    <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
            <div class="text-muted small">Ano Bíblico</div>
            <h1 class="h4 mb-0">Reprogramar plano</h1>
        </div>
        <a class="btn btn-link" href="/ano_biblico.php?usuario_id=<?= (int)$usuario_id ?>">Voltar</a>
    </div>

    <div class="ns-card bg-white p-3 p-md-4">
        <?php if ($setupNeeded): ?>
            <div class="alert alert-warning mb-0">
                Instale o schema de desafios (SQL atualizado) para usar a reprogramação.
            </div>
        <?php elseif (!$active): ?>
            <div class="alert alert-info mb-0">
                Você ainda não iniciou um desafio. Vá em “Trocar desafio” para começar.
            </div>
        <?php else: ?>
            <div class="fw-bold mb-1"><?= htmlspecialchars((string)$active['nome'], ENT_QUOTES) ?></div>
            <div class="text-muted small">Término previsto: <?= htmlspecialchars((string)$active['data_fim'], ENT_QUOTES) ?></div>

            <?php if ($preview): ?>
                <div class="mt-3 p-3 rounded-3 bg-light">
                    <div class="fw-semibold">Antes de salvar</div>
                    <div class="small text-muted">
                        Capítulos restantes: <b><?= (int)$preview['rest'] ?></b><br>
                        Dias restantes: <b><?= (int)$preview['dias'] ?></b><br>
                        Média: <b><?= (int)$preview['porDia'] ?></b> capítulo(s) por dia
                    </div>
                </div>
            <?php endif; ?>

            <?php if ($feedback): ?>
                <div class="alert alert-<?= htmlspecialchars((string)$feedback['type'], ENT_QUOTES) ?> mt-3 mb-0">
                    <?= htmlspecialchars((string)$feedback['msg'], ENT_QUOTES) ?>
                </div>
            <?php endif; ?>

            <form method="post" class="mt-4">
                <div class="mb-2 fw-semibold">Escolha como deseja ajustar</div>

                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="mode" id="m1" value="keep_end" checked>
                    <label class="form-check-label" for="m1">Manter data final original</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="mode" id="m2" value="start_today_keep_end">
                    <label class="form-check-label" for="m2">Recomeçar a partir de hoje (mantendo a data final)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="mode" id="m3" value="new_end">
                    <label class="form-check-label" for="m3">Escolher nova data final</label>
                </div>

                <div class="mt-3" id="dateWrap" style="display:none;">
                    <label class="form-label fw-semibold">Nova data final</label>
                    <input class="form-control" type="date" name="data_fim">
                </div>

                <div class="mt-4">
                    <button class="btn btn-ns w-100" type="submit">Salvar reprogramação</button>
                </div>
            </form>
        <?php endif; ?>
    </div>
</div>

<script>
(() => {
    const m3 = document.getElementById('m3');
    const wrap = document.getElementById('dateWrap');
    const radios = document.querySelectorAll('input[name="mode"]');
    function refresh(){
        const checked = document.querySelector('input[name="mode"]:checked');
        if (!checked || !wrap) return;
        wrap.style.display = checked.value === 'new_end' ? 'block' : 'none';
    }
    radios.forEach(r => r.addEventListener('change', refresh));
    refresh();
})();
</script>
</body>
</html>

