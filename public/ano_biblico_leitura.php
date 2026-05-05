<?php
declare(strict_types=1);

require_once __DIR__ . '/ano_biblico/_inc/ano_biblico_model.php';

$usuario_id = isset($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : 0;
if ($usuario_id <= 0) $usuario_id = 1;

$dia = isset($_GET['dia']) ? (int)$_GET['dia'] : 0;
if ($dia < 1 || $dia > 365) {
    // Se não veio dia, usa o próximo não concluído.
    $next = getLeituraDoDia($usuario_id);
    $dia = (int)($next['dia'] ?? 1);
}

$pdo = ns_pdo();
$stmt = $pdo->prepare("
    SELECT
      b.`key` AS book_key,
      b.`name` AS book_name,
      p.capitulo AS chapter
    FROM plano_leitura p
    JOIN bible_books b ON b.id = p.livro_id
    WHERE p.dia = :dia
    ORDER BY b.position, p.capitulo
");
$stmt->execute([':dia' => $dia]);
$items = $stmt->fetchAll();

$display = ns_format_reading_display($items);

$brand600 = '#008d36';
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ano Bíblico - Dia <?= (int)$dia ?></title>
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
        .list-group-item{
            border-color: rgba(0,0,0,.06);
        }
        a.chapter-link{
            text-decoration: none;
            color: inherit;
        }
    </style>
</head>
<body>
<div class="container py-4" style="max-width: 720px;">
    <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
            <div class="text-muted small">Ano Bíblico</div>
            <h1 class="h4 mb-0">Dia <?= (int)$dia ?></h1>
            <div class="text-muted small mt-1"><?= htmlspecialchars($display, ENT_QUOTES) ?></div>
        </div>
        <a class="btn btn-link" href="/ano_biblico.php?usuario_id=<?= (int)$usuario_id ?>">Voltar</a>
    </div>

    <div class="ns-card bg-white p-3 p-md-4">
        <?php if (!$items): ?>
            <div class="alert alert-warning mb-0">
                Nenhum capítulo encontrado para este dia. Gere o plano primeiro.
            </div>
        <?php else: ?>
            <div class="list-group">
                <?php foreach ($items as $it): ?>
                    <?php
                        $bookKey = (string)$it['book_key'];
                        $bookName = (string)$it['book_name'];
                        $chapter = (int)$it['chapter'];
                        $url = "/mobile/biblia?book=" . rawurlencode($bookKey) . "&chapter=" . $chapter;
                    ?>
                    <a class="list-group-item list-group-item-action chapter-link" href="<?= htmlspecialchars($url, ENT_QUOTES) ?>">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="fw-semibold"><?= htmlspecialchars($bookName, ENT_QUOTES) ?> <?= (int)$chapter ?></div>
                            <span class="text-muted small">Abrir</span>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>

            <div class="mt-3">
                <a class="btn btn-ns w-100" href="/mobile/biblia">Abrir Bíblia (geral)</a>
            </div>
        <?php endif; ?>
    </div>
</div>
</body>
</html>

