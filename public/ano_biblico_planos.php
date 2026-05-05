<?php
declare(strict_types=1);

require_once __DIR__ . '/ano_biblico/_inc/ano_biblico_model.php';
require_once __DIR__ . '/ano_biblico/_inc/desafios_model.php';

$usuario_id = isset($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : 0;
if ($usuario_id <= 0) $usuario_id = 1;

$pdo = ns_pdo();
$setupNeeded = !ns_has_desafios_schema($pdo);

$feedback = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$setupNeeded) {
    $action = (string)($_POST['action'] ?? '');
    if ($action === 'iniciar') {
        $planoId = (int)($_POST['plano_id'] ?? 0);
        $dataFim = isset($_POST['data_fim']) && $_POST['data_fim'] !== '' ? (string)$_POST['data_fim'] : null;
        // Sempre substitui: apenas 1 desafio em andamento (arquiva o anterior mantendo histórico).
        $res = gerarPlanoUsuario($usuario_id, $planoId, $dataFim, true);
        $feedback = $res['ok']
            ? ['type' => 'success', 'msg' => 'Desafio iniciado!']
            : ['type' => 'danger', 'msg' => (string)($res['error'] ?? 'Erro ao iniciar desafio.')];
        if (($res['ok'] ?? false) === true) {
            header('Location: /ano_biblico.php?usuario_id=' . $usuario_id);
            exit;
        }
    }
}

$brand600 = '#008d36';
$brand500 = '#41b144';

$desafios = $setupNeeded ? [] : ns_listar_desafios($pdo);

function ns_days_until_end_of_year(): int {
    $today = new DateTimeImmutable('today');
    $end = new DateTimeImmutable($today->format('Y') . '-12-31');
    return (int)$today->diff($end)->days + 1;
}

function ns_calc_meta(PDO $pdo, string $tipo, string $escopo): string {
    $total = ns_total_capitulos($pdo, $escopo);
    $today = new DateTimeImmutable('today');
    if ($tipo === 'fim_do_ano') {
        $days = ns_days_until_end_of_year();
    } elseif ($tipo === 'um_ano') {
        $days = 365;
    } elseif ($tipo === 'noventa_dias') {
        $days = 90;
    } elseif ($tipo === 'novo_testamento_30') {
        $days = 30;
    } else {
        return 'Defina a data para calcular';
    }
    $perDay = $days > 0 ? (int)ceil($total / $days) : $total;
    if ($perDay < 1) $perDay = 1;
    return "cerca de {$perDay} capítulo(s) por dia";
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Desafios Bíblicos</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root{
            --ns-brand-600: <?= htmlspecialchars($brand600, ENT_QUOTES) ?>;
            --ns-brand-500: <?= htmlspecialchars($brand500, ENT_QUOTES) ?>;
        }
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
        .btn-outline-ns{
            border-color: var(--ns-brand-600);
            color: var(--ns-brand-600);
            font-weight: 700;
            border-radius: 999px;
            padding: .85rem 1.1rem;
        }
        .btn-outline-ns:hover{
            background: rgba(0,141,54,.08);
            color: var(--ns-brand-600);
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
<div class="container py-4" style="max-width: 980px;">
    <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
            <div class="text-muted small">Ano Bíblico</div>
            <h1 class="h3 mb-0">Desafios Bíblicos</h1>
            <div class="text-muted small mt-1">Escolha um desafio para começar</div>
        </div>
        <a class="btn btn-link" href="/ano_biblico.php?usuario_id=<?= (int)$usuario_id ?>">Voltar</a>
    </div>

    <?php if ($setupNeeded): ?>
        <div class="ns-card bg-white p-3 p-md-4">
            <div class="alert alert-warning mb-0">
                <div class="fw-semibold mb-1">Configuração necessária</div>
                <div class="small">
                    As tabelas de “Desafios Bíblicos” ainda não existem no banco.
                    <br><br>
                    Importe o SQL atualizado: <code>database/sql/ano_biblico.sql</code> (ou rode <code>php scripts/instalar_ano_biblico.php</code>).
                </div>
            </div>
        </div>
    <?php else: ?>
        <div class="row g-3">
            <?php foreach ($desafios as $d): ?>
                <?php
                    $meta = ns_calc_meta($pdo, (string)$d['tipo'], (string)$d['escopo']);
                    $needsDate = ((string)$d['tipo'] === 'data_personalizada');
                ?>
                <div class="col-12 col-md-6">
                    <div class="ns-card bg-white p-3 p-md-4 h-100">
                        <div class="d-flex justify-content-between align-items-start gap-3">
                            <div>
                                <div class="h5 mb-1"><?= htmlspecialchars((string)$d['nome'], ENT_QUOTES) ?></div>
                                <div class="text-muted small"><?= htmlspecialchars((string)$d['descricao'], ENT_QUOTES) ?></div>
                            </div>
                            <span class="ns-chip"><?= htmlspecialchars($meta, ENT_QUOTES) ?></span>
                        </div>

                        <div class="mt-3">
                            <?php if ($needsDate): ?>
                                <button class="btn btn-ns w-100" type="button" data-bs-toggle="modal" data-bs-target="#modalData<?= (int)$d['id'] ?>">
                                    Iniciar desafio
                                </button>
                            <?php else: ?>
                                <form method="post" class="m-0" onsubmit="return confirmStartChallenge();">
                                    <input type="hidden" name="action" value="iniciar">
                                    <input type="hidden" name="plano_id" value="<?= (int)$d['id'] ?>">
                                    <button class="btn btn-ns w-100" type="submit">Iniciar desafio</button>
                                </form>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <?php if ($needsDate): ?>
                    <div class="modal fade" id="modalData<?= (int)$d['id'] ?>" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content" style="border-radius:18px;">
                                <div class="modal-header">
                                    <h5 class="modal-title">Meta personalizada</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                                </div>
                                <form method="post" class="m-0" onsubmit="return confirmStartChallenge();">
                                    <div class="modal-body">
                                        <div class="mb-2 text-muted small">Escolha a data final do desafio.</div>
                                        <input class="form-control" type="date" name="data_fim" required>
                                        <input type="hidden" name="action" value="iniciar">
                                        <input type="hidden" name="plano_id" value="<?= (int)$d['id'] ?>">
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                                        <button type="submit" class="btn btn-ns">Iniciar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
function confirmStartChallenge(){
    return confirm('Iniciar este desafio vai substituir o atual (o anterior fica arquivado com histórico salvo). Continuar?');
}
</script>
</body>
</html>

