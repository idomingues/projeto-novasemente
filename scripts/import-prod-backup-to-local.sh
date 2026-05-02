#!/usr/bin/env bash
# Recria a base LOCAL (nome em DB_DATABASE no .env) e importa um dump de produção (.sql ou .sql.gz).
# Rode no Mac (XAMPP). Não use em produção.
#
# Uso:
#   ./scripts/import-prod-backup-to-local.sh --force /caminho/backup.sql
#   ./scripts/import-prod-backup-to-local.sh --force /caminho/backup.sql.gz
# Se o dump usa outro nome de base (ex. sistema_igreja) e o .env tem DB_DATABASE=ns:
#   ./scripts/import-prod-backup-to-local.sh --force --source-db sistema_igreja /caminho/backup.sql

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$PWD" == /var/www* ]]; then
  echo "ERRO: Este script é para o ambiente local (Mac), não para o servidor."
  exit 1
fi

FORCE=0
SOURCE_DB=""
BACKUP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --source-db)
      SOURCE_DB="${2:-}"
      if [[ -z "$SOURCE_DB" ]]; then echo "Falta valor após --source-db"; exit 1; fi
      shift 2
      ;;
    -*)
      echo "Opção desconhecida: $1"
      exit 1
      ;;
    *)
      BACKUP="$1"
      shift
      ;;
  esac
done

if [[ -z "${BACKUP}" ]]; then
  echo "Uso: ./scripts/import-prod-backup-to-local.sh --force /caminho/backup.sql[.gz] [--source-db NOME_BD_PRODUCAO]"
  exit 1
fi

if [[ ! -f "$BACKUP" ]]; then
  echo "Ficheiro não encontrado: $BACKUP"
  exit 1
fi

if [[ "$FORCE" != 1 ]]; then
  echo "Para apagar e recriar a base local, confirme com --force"
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env 2>/dev/null || true
  set +a
fi

DB_CONNECTION="${DB_CONNECTION:-mysql}"
if [[ "$DB_CONNECTION" == "sqlite" ]]; then
  echo "Este script é para MySQL. No .env use DB_CONNECTION=mysql e credenciais XAMPP."
  exit 1
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-ns}"
DB_USERNAME="${DB_USERNAME:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

MYSQL=""
if command -v mysql &>/dev/null; then
  MYSQL="mysql"
elif [[ -x "/Applications/XAMPP/xamppfiles/bin/mysql" ]]; then
  MYSQL="/Applications/XAMPP/xamppfiles/bin/mysql"
elif [[ -x "/opt/homebrew/opt/mysql/bin/mysql" ]]; then
  MYSQL="/opt/homebrew/opt/mysql/bin/mysql"
elif [[ -x "/usr/local/bin/mysql" ]]; then
  MYSQL="/usr/local/bin/mysql"
else
  echo "mysql cliente não encontrado. Use XAMPP: /Applications/XAMPP/xamppfiles/bin/mysql"
  exit 1
fi

MYSQL_BASE=("$MYSQL" -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME")
if [[ -n "$DB_PASSWORD" ]]; then
  MYSQL_BASE+=(-p"$DB_PASSWORD")
fi

echo "A recriar base \`$DB_DATABASE\` e importar: $BACKUP"
"${MYSQL_BASE[@]}" -e "DROP DATABASE IF EXISTS \`$DB_DATABASE\`; CREATE DATABASE \`$DB_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

run_import() {
  if [[ -n "$SOURCE_DB" && "$SOURCE_DB" != "$DB_DATABASE" ]]; then
    echo "A substituir referências à base \`$SOURCE_DB\` por \`$DB_DATABASE\` no stream do dump..."
    sed "s/\`${SOURCE_DB}\`/\`${DB_DATABASE}\`/g"
  else
    cat
  fi | "${MYSQL_BASE[@]}" "$DB_DATABASE"
}

if [[ "$BACKUP" == *.gz ]]; then
  gunzip -c "$BACKUP" | run_import
else
  run_import <"$BACKUP"
fi

if command -v php &>/dev/null; then
  php artisan optimize:clear 2>/dev/null || true
fi

echo "OK. Base \`$DB_DATABASE\` importada. Verifique o .env (APP_KEY, APP_URL) e faça login."
