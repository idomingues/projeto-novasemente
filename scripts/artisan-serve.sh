#!/usr/bin/env bash
# Limites de upload para capa + PDF no mesmo POST (ex.: Biblioteca).
# O `php artisan serve` do Laravel arranca um *segundo* processo `php -S` sem herdar os -d deste
# processo; PHP_INI_SCAN_DIR (repassado em AppServiceProvider) aplica estes .ini ao servidor HTTP.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# Sufixo ":" = carregar também os scan dirs por defeito do PHP (extensões, etc.).
export PHP_INI_SCAN_DIR="${SCRIPT_DIR}/php-dev-ini:"

PHP_BIN="${PHP_BIN:-php}"

exec "$PHP_BIN" \
  -d upload_max_filesize=40M \
  -d post_max_size=128M \
  artisan serve "$@"
