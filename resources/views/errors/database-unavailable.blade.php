<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Base de dados indisponível</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #fafafa; color: #18181b; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .box { max-width: 32rem; background: #fff; border: 1px solid #e4e4e7; border-radius: 1rem; padding: 1.75rem; box-shadow: 0 4px 24px rgba(0,0,0,.06); }
        h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
        p { margin: 0 0 1rem; font-size: 0.95rem; line-height: 1.55; color: #52525b; }
        ul { margin: 0 0 1rem 1rem; padding: 0; color: #52525b; font-size: 0.9rem; line-height: 1.5; }
        code { font-size: 0.85em; background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 0.25rem; }
        a { color: #15803d; font-weight: 600; }
    </style>
</head>
<body>
    <div class="box">
        <h1>Base de dados indisponível</h1>
        <p>O servidor não conseguiu ligar à base de dados. Os dados da aplicação (notícias, voluntários, fotos, etc.) não podem ser carregados.</p>
        <p><strong>O que verificar:</strong></p>
        <ul>
            <li>Se usa <strong>MySQL</strong>: serviço a correr e credenciais em <code>.env</code> (<code>DB_HOST</code>, <code>DB_DATABASE</code>, <code>DB_USERNAME</code>, <code>DB_PASSWORD</code>).</li>
            <li>Se usa <strong>SQLite</strong>: o arquivo existe (ex. <code>database/database.sqlite</code>) e tem permissões de leitura/escrita.</li>
            <li>Na pasta do projecto: <code>php artisan app:check-data</code> e <code>php artisan migrate:status</code>.</li>
        </ul>
        <p><a href="{{ url('/') }}">Tentar voltar ao início</a></p>
    </div>
</body>
</html>
