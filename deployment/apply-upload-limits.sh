#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_LIMITS_SOURCE="${ROOT_DIR}/deployment/nginx-upload-limits.conf"
PHP_LIMITS_FILE="/tmp/projeto-novasemente-upload-limits.ini"

if command -v nginx >/dev/null 2>&1 && [ -d /etc/nginx/conf.d ]; then
    install -m 0644 "${NGINX_LIMITS_SOURCE}" /etc/nginx/conf.d/projeto-novasemente-upload-limits.conf
    nginx -t
    if command -v systemctl >/dev/null 2>&1; then
        systemctl reload nginx
    else
        service nginx reload
    fi
fi

cat > "${PHP_LIMITS_FILE}" <<'INI'
upload_max_filesize = 32M
post_max_size = 32M
INI

PHP_FPM_CONFIGURED=0
for PHP_FPM_CONF_DIR in /etc/php/*/fpm/conf.d; do
    if [ -d "${PHP_FPM_CONF_DIR}" ]; then
        install -m 0644 "${PHP_LIMITS_FILE}" "${PHP_FPM_CONF_DIR}/99-projeto-novasemente-upload-limits.ini"
        PHP_FPM_CONFIGURED=1
    fi
done
rm -f "${PHP_LIMITS_FILE}"

if [ "${PHP_FPM_CONFIGURED}" -eq 1 ] && command -v systemctl >/dev/null 2>&1; then
    while IFS= read -r PHP_FPM_SERVICE; do
        [ -n "${PHP_FPM_SERVICE}" ] || continue
        systemctl reload "${PHP_FPM_SERVICE}" || systemctl restart "${PHP_FPM_SERVICE}"
    done < <(systemctl list-units --type=service --all 'php*-fpm.service' --no-legend --no-pager | awk '{print $1}')
fi
