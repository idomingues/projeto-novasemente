#!/bin/bash
# Exporta o banco local para um arquivo SQL (para depois importar em produção)

cd "$(dirname "$0")/.."

# Carregar variáveis do .env
set -a
[ -f .env ] && source .env
set +a

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-laravel}"
DB_USERNAME="${DB_USERNAME:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

OUTPUT="backup_local_$(date +%Y%m%d_%H%M).sql"

echo "Exportando $DB_DATABASE..."
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_DATABASE" > "$OUTPUT"

if [ $? -eq 0 ]; then
    echo "OK: $OUTPUT"
else
    echo "Erro ao exportar."
    exit 1
fi
