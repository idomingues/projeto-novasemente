<?php
declare(strict_types=1);

require_once __DIR__ . '/ano_biblico/_inc/ano_biblico_model.php';
require_once __DIR__ . '/ano_biblico/_inc/desafios_model.php';

// ------------------------------------------------------------
// Ajuste simples para rodar local:
// - Passe ?usuario_id=1 na URL, ou defina um default abaixo.
// ------------------------------------------------------------
$usuario_id = isset($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : 0;
if ($usuario_id <= 0) $usuario_id = 1;

$feedback = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? (string)$_POST['action'] : '';
    if ($action === 'concluir') {
        $dia = isset($_POST['dia']) ? (int)$_POST['dia'] : 0;
        $pdo = ns_pdo();
        // Se estiver no modo Desafios, conclui o "dia" do desafio ativo.
        if (ns_has_desafios_schema($pdo)) {
            $active = ns_get_desafio_ativo($pdo, $usuario_id)['row'] ?? null;
            if ($active) {
                $res = ns_concluir_dia_desafio($pdo, (int)$active['id'], $dia);
            } else {
                $res = ['ok' => false, 'error' => 'Nenhum desafio ativo.'];
            }
        } else {
            $res = marcarComoConcluido($usuario_id, $dia);
        }
        $feedback = $res['ok'] ? ['type' => 'success', 'msg' => 'Dia marcado como concluído!'] : ['type' => 'danger', 'msg' => ($res['error'] ?? 'Erro ao concluir.')];
    }
}

$pdo = ns_pdo();
$useDesafios = ns_has_desafios_schema($pdo);
$active = $useDesafios ? (ns_get_desafio_ativo($pdo, $usuario_id)['row'] ?? null) : null;

if ($useDesafios && $active) {
    $status = ns_status_desafio($pdo, (int)$active['id']);
    $leitura = ns_leitura_hoje($pdo, (int)$active['id']);
    $leitura['dia'] = $leitura['dia'] ?? 0;
    $leitura['display'] = $leitura['display'] ?? '';
    $leitura['finished'] = ($status['kind'] ?? '') === 'finished';

    // progresso
    $stmtTot = $pdo->prepare("SELECT COUNT(*) FROM ano_biblico_desafio_itens WHERE usuario_desafio_id = :ud");
    $stmtTot->execute([':ud' => (int)$active['id']]);
    $totalItems = (int)($stmtTot->fetchColumn() ?: 0);
    $stmtDone = $pdo->prepare("SELECT COUNT(*) FROM ano_biblico_desafio_itens WHERE usuario_desafio_id = :ud AND concluido = 1");
    $stmtDone->execute([':ud' => (int)$active['id']]);
    $doneItems = (int)($stmtDone->fetchColumn() ?: 0);
    $percent = $totalItems > 0 ? (int)floor(($doneItems / $totalItems) * 100) : 0;
    $prog = [
        'ok' => true,
        'total' => $totalItems,
        'concluidos' => $doneItems,
        'restantes' => max(0, $totalItems - $doneItems),
        'percent' => $percent,
        'status_label' => $status['label'] ?? 'Em dia',
    ];
} else {
    $leitura = getLeituraDoDia($usuario_id);
    $prog = getProgresso($usuario_id);
}

$brand600 = '#008d36';
$brand500 = '#41b144';
$setupNeeded = !($leitura['ok'] ?? false) && !empty($leitura['setupNeeded']);
$desafiosSetupNeeded = $useDesafios && !$active;
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ano Bíblico</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root{
            --ns-brand-600: <?= htmlspecialchars($brand600, ENT_QUOTES) ?>;
            --ns-brand-500: <?= htmlspecialchars($brand500, ENT_QUOTES) ?>;
        }
        body{
            background: #f8fafc;
        }
        .ns-card{
            border: 1px solid rgba(0,0,0,.06);
            box-shadow: 0 12px 30px rgba(0,0,0,.06);
            border-radius: 18px;
        }
        .ns-title{
            letter-spacing: .2px;
        }
        .btn-ns{
            background: var(--ns-brand-600);
            border-color: var(--ns-brand-600);
            font-weight: 700;
            border-radius: 999px;
            padding: .9rem 1.1rem;
        }
        .btn-ns:hover{ background: #00732d; border-color: #00732d; }
        .btn-outline-ns{
            border-color: var(--ns-brand-600);
            color: var(--ns-brand-600);
            font-weight: 700;
            border-radius: 999px;
            padding: .9rem 1.1rem;
        }
        .btn-outline-ns:hover{
            background: rgba(0,141,54,.08);
            color: var(--ns-brand-600);
        }
        .progress-bar{
            background: var(--ns-brand-500);
        }
        .ns-chip{
            display:inline-flex;
            align-items:center;
            padding:.25rem .6rem;
            border-radius: 999px;
            background: rgba(0,141,54,.08);
            color: var(--ns-brand-600);
            font-weight: 700;
            font-size: .82rem;
        }
    </style>
</head>
<body>
<div class="container py-4" style="max-width: 720px;">
    <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
            <div class="text-muted small">Módulo</div>
            <h1 class="h3 mb-0 ns-title">Ano Bíblico</h1>
        </div>
        <span class="ns-chip">365 dias</span>
    </div>

    <div class="ns-card bg-white p-3 p-md-4">
        <?php if ($useDesafios): ?>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="small text-muted">
                    <?php if ($active): ?>
                        Desafio atual: <span class="fw-semibold"><?= htmlspecialchars((string)$active['nome'], ENT_QUOTES) ?></span>
                        <span class="ms-2 ns-chip"><?= htmlspecialchars((string)($prog['status_label'] ?? 'Em dia'), ENT_QUOTES) ?></span>
                    <?php else: ?>
                        <span class="fw-semibold">Nenhum desafio ativo.</span>
                    <?php endif; ?>
                </div>
                <div class="d-flex gap-2">
                    <a class="btn btn-outline-ns btn-sm" href="/ano_biblico_planos.php?usuario_id=<?= (int)$usuario_id ?>">Trocar desafio</a>
                    <?php if ($active): ?>
                        <a class="btn btn-outline-ns btn-sm" href="/ano_biblico_reprogramar.php?usuario_id=<?= (int)$usuario_id ?>">Reprogramar plano</a>
                    <?php endif; ?>
                </div>
            </div>
            <?php if (!$active): ?>
                <div class="alert alert-info">
                    Escolha um desafio para começar.
                    <div class="mt-2">
                        <a class="btn btn-ns" href="/ano_biblico_planos.php?usuario_id=<?= (int)$usuario_id ?>">Ver desafios</a>
                    </div>
                </div>
            <?php endif; ?>
        <?php endif; ?>

        <?php if ($setupNeeded): ?>
            <div class="alert alert-warning mb-3">
                <div class="fw-semibold mb-1">Configuração necessária</div>
                <div class="small">
                    <?= htmlspecialchars((string)($leitura['error'] ?? 'Módulo não instalado no banco.'), ENT_QUOTES) ?>
                    <br><br>
                    <div class="fw-semibold">1) Crie as tabelas</div>
                    Importe o SQL: <code>database/sql/ano_biblico.sql</code> na base <code>ns</code>.
                    <br><br>
                    <div class="fw-semibold">2) Gere o plano (365 dias)</div>
                    Rode no terminal: <code>php scripts/gerar_plano_ano_biblico.php</code>
                </div>
            </div>
        <?php endif; ?>

        <div class="d-flex align-items-start justify-content-between gap-3">
            <div>
                <div class="text-muted small mb-1">Leitura sugerida</div>
                <?php if ($setupNeeded): ?>
                    <div class="h5 mb-0">Instale o módulo para começar.</div>
                <?php elseif (!empty($leitura['finished'])): ?>
                    <div class="h4 mb-0">Parabéns! Você concluiu o plano.</div>
                <?php else: ?>
                    <div class="h4 mb-0"><?= htmlspecialchars($leitura['display'] ?? '', ENT_QUOTES) ?></div>
                    <div class="text-muted small mt-1">Dia <?= (int)($leitura['dia'] ?? 0) ?> de 365</div>
                <?php endif; ?>
            </div>
        </div>

        <hr class="my-3">

        <div class="row g-2">
            <div class="col-12 col-md-6">
                <?php if ($setupNeeded): ?>
                    <button type="button" class="btn btn-ns w-100" disabled>Iniciar leitura</button>
                <?php elseif (empty($leitura['finished'])): ?>
                    <a class="btn btn-ns w-100" href="/ano_biblico_leitura.php?usuario_id=<?= (int)$usuario_id ?>&dia=<?= (int)$leitura['dia'] ?>">
                        Iniciar leitura
                    </a>
                <?php else: ?>
                    <a class="btn btn-ns w-100" href="/mobile/biblia">Abrir Bíblia</a>
                <?php endif; ?>
            </div>
            <div class="col-12 col-md-6">
                <?php if ($setupNeeded): ?>
                    <button type="button" class="btn btn-outline-ns w-100" disabled>Marcar como concluído</button>
                <?php elseif (empty($leitura['finished'])): ?>
                    <form method="post" class="m-0">
                        <input type="hidden" name="action" value="concluir">
                        <input type="hidden" name="dia" value="<?= (int)$leitura['dia'] ?>">
                        <button type="submit" class="btn btn-outline-ns w-100">
                            Já li / Concluir
                        </button>
                    </form>
                <?php else: ?>
                    <button type="button" class="btn btn-outline-ns w-100" disabled>Concluído</button>
                <?php endif; ?>
            </div>
        </div>

        <div class="mt-4">
            <div class="d-flex justify-content-between small text-muted mb-2">
                <span>Progresso</span>
                <span><?= (int)($prog['percent'] ?? 0) ?>%</span>
            </div>
            <div class="progress" role="progressbar" aria-label="Progresso Ano Bíblico" aria-valuenow="<?= (int)($prog['percent'] ?? 0) ?>" aria-valuemin="0" aria-valuemax="100" style="height: 12px; border-radius: 999px;">
                <div class="progress-bar" style="width: <?= (int)($prog['percent'] ?? 0) ?>%"></div>
            </div>
            <div class="row g-2 mt-2">
                <div class="col-6">
                    <div class="p-2 rounded-3 bg-light">
                        <div class="text-muted small">Dias concluídos</div>
                        <div class="h5 mb-0"><?= (int)($prog['concluidos'] ?? 0) ?></div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-2 rounded-3 bg-light">
                        <div class="text-muted small">Dias restantes</div>
                        <div class="h5 mb-0"><?= (int)($prog['restantes'] ?? 0) ?></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="position-fixed bottom-0 start-0 end-0 p-3" style="z-index: 1080;">
    <div id="nsToast" class="toast align-items-center text-bg-<?= htmlspecialchars($feedback['type'] ?? 'success', ENT_QUOTES) ?> border-0 w-100" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
            <div class="toast-body">
                <?= htmlspecialchars($feedback['msg'] ?? '', ENT_QUOTES) ?>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
(() => {
    const hasMsg = <?= json_encode((bool)$feedback) ?>;
    if (!hasMsg) return;
    const el = document.getElementById('nsToast');
    if (!el) return;
    const toast = new bootstrap.Toast(el, { delay: 2500 });
    toast.show();
})();
</script>
</body>
</html>

