#!/usr/bin/env bash
# Garante o cron do Laravel Schedule em produção (schedule:run a cada minuto).
# Idempotente: não duplica a linha se já existir.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PHP_BIN="$(command -v php || true)"
if [[ -z "${PHP_BIN}" ]]; then
  echo "php não encontrado no PATH." >&2
  exit 1
fi

LOG_DIR="${ROOT}/storage/logs"
mkdir -p "${LOG_DIR}"
touch "${LOG_DIR}/scheduler.log"

CRON_MARK="projeto-novasemente schedule:run"
CRON_LINE="* * * * * cd ${ROOT} && ${PHP_BIN} artisan schedule:run >> ${LOG_DIR}/scheduler.log 2>&1"

EXISTING="$(crontab -l 2>/dev/null || true)"

if printf '%s\n' "${EXISTING}" | grep -Fq "${ROOT}" && printf '%s\n' "${EXISTING}" | grep -Fq "artisan schedule:run"; then
  echo "Cron do Laravel Schedule já configurado (${ROOT})."
  exit 0
fi

{
  printf '%s\n' "${EXISTING}"
  echo "# ${CRON_MARK}"
  echo "${CRON_LINE}"
} | crontab -

echo "Cron do Laravel Schedule instalado:"
echo "  ${CRON_LINE}"
echo "Jobs (America/Sao_Paulo): meditação 05:00 · revista 02:30 · acervo 03:00"
