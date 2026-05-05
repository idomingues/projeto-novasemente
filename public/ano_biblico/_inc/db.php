<?php
declare(strict_types=1);

/**
 * DB helper simples (PDO) com leitura do .env do projeto.
 * - Sem frameworks
 * - Prepared statements por padrão
 */

function ns_env_path(): string
{
    return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env';
}

/**
 * Parser minimalista de .env (KEY=VALUE).
 * Suporta aspas simples/dobras e ignora comentários.
 */
function ns_read_env(string $path): array
{
    if (!is_file($path)) return [];
    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) return [];

    $env = [];
    foreach ($lines as $line) {
        $line = trim((string)$line);
        if ($line === '' || str_starts_with($line, '#')) continue;

        $pos = strpos($line, '=');
        if ($pos === false) continue;

        $key = trim(substr($line, 0, $pos));
        $val = trim(substr($line, $pos + 1));

        // remove comentário no fim: KEY=value # comment
        if ($val !== '' && ($val[0] !== '"' && $val[0] !== "'")) {
            $hash = strpos($val, ' #');
            if ($hash !== false) $val = trim(substr($val, 0, $hash));
        }

        if ($val !== '' && (($val[0] === '"' && str_ends_with($val, '"')) || ($val[0] === "'" && str_ends_with($val, "'")))) {
            $val = substr($val, 1, -1);
        }

        $env[$key] = $val;
    }

    return $env;
}

function ns_env(string $key, ?string $default = null): ?string
{
    static $cache = null;
    if ($cache === null) {
        $cache = ns_read_env(ns_env_path());
    }
    return array_key_exists($key, $cache) ? (string)$cache[$key] : $default;
}

function ns_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $host = ns_env('DB_HOST', '127.0.0.1') ?? '127.0.0.1';
    $port = ns_env('DB_PORT', '3306') ?? '3306';
    $db   = ns_env('DB_DATABASE', 'ns') ?? 'ns';
    $user = ns_env('DB_USERNAME', 'root') ?? 'root';
    $pass = ns_env('DB_PASSWORD', '') ?? '';

    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

