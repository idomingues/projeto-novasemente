#!/bin/bash
# Exporta o banco LOCAL para um arquivo SQL (para depois importar em produção).
# IMPORTANTE: rodar na sua MÁQUINA LOCAL (onde está o XAMPP/MySQL com o banco "ns"),
# NÃO no servidor de produção.

set -e
cd "$(dirname "$0")/.."

# Aviso: se estiver em /var/www estamos provavelmente no servidor
if [[ "$PWD" == /var/www* ]]; then
    echo "ERRO: Este script deve ser executado no seu MAC (XAMPP), não no servidor."
    echo "No servidor não existem os dados locais (ex.: Acervo)."
    echo "No Mac: cd /Applications/XAMPP/xamppfiles/htdocs/projeto-novasemente && ./scripts/export-local-db.sh"
    exit 1
fi

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
    # Encontrar mysqldump (no Mac com XAMPP muitas vezes não está no PATH)
    MYSQLDUMP=""
    if command -v mysqldump &>/dev/null; then
        MYSQLDUMP="mysqldump"
    elif [ -x "/Applications/XAMPP/xamppfiles/bin/mysqldump" ]; then
        MYSQLDUMP="/Applications/XAMPP/xamppfiles/bin/mysqldump"
    elif [ -x "/opt/homebrew/opt/mysql/bin/mysqldump" ]; then
        MYSQLDUMP="/opt/homebrew/opt/mysql/bin/mysqldump"
    elif [ -x "/usr/local/bin/mysqldump" ]; then
        MYSQLDUMP="/usr/local/bin/mysqldump"
    fi
    if [ -z "$MYSQLDUMP" ]; then
        echo "Erro: mysqldump não encontrado. Adicione o MySQL ao PATH ou instale (XAMPP já inclui em /Applications/XAMPP/xamppfiles/bin/)."
        exit 1
    fi

    DB_HOST="${DB_HOST:-127.0.0.1}"
    DB_PORT="${DB_PORT:-3306}"
    DB_DATABASE="${DB_DATABASE:-laravel}"
    DB_USERNAME="${DB_USERNAME:-root}"
    DB_PASSWORD="${DB_PASSWORD:-}"
    echo "Exportando MySQL $DB_DATABASE..."
    "$MYSQLDUMP" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" ${DB_PASSWORD:+-p"$DB_PASSWORD"} --no-tablespaces "$DB_DATABASE" > "$OUTPUT"
fi

echo "OK: $OUTPUT"
echo ""
echo "Próximo: envie este ficheiro para o servidor e importe (veja scripts/sync-db-to-production.md)"
echo "Ex.: scp $OUTPUT root@IP_DO_SERVIDOR:/var/www/projeto-novasemente/"
