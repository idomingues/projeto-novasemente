#!/bin/bash
# Exporta o banco local para um arquivo SQL (para depois importar em produção).
# Suporta MySQL/MariaDB e SQLite (usa DB_CONNECTION e variáveis do .env).

set -e
cd "$(dirname "$0")/.."

# Carregar variáveis do .env
if [ -f .env ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
fi

DB_CONNECTION="${DB_CONNECTION:-mysql}"
OUTPUT="backup_local_$(date +%Y%m%d_%H%M).sql"

if [ "$DB_CONNECTION" = "sqlite" ]; then
    DB_DATABASE="${DB_DATABASE:-database/database.sqlite}"
    # Caminho absoluto se for relativo
    [[ "$DB_DATABASE" != /* ]] && DB_DATABASE="$PWD/$DB_DATABASE"
    if [ ! -f "$DB_DATABASE" ]; then
        echo "Arquivo SQLite não encontrado: $DB_DATABASE"
        exit 1
    fi
    echo "Exportando SQLite: $DB_DATABASE"
    sqlite3 "$DB_DATABASE" .dump > "$OUTPUT"
else
    DB_HOST="${DB_HOST:-127.0.0.1}"
    DB_PORT="${DB_PORT:-3306}"
    DB_DATABASE="${DB_DATABASE:-laravel}"
    DB_USERNAME="${DB_USERNAME:-root}"
    DB_PASSWORD="${DB_PASSWORD:-}"
    echo "Exportando MySQL $DB_DATABASE..."
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_DATABASE" > "$OUTPUT"
fi

echo "OK: $OUTPUT"
echo ""
echo "Próximo: envie o arquivo para o servidor e importe (veja scripts/sync-db-to-production.md)"
