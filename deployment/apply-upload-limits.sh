#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_LIMITS_SOURCE="${ROOT_DIR}/deployment/nginx-upload-limits.conf"
PHP_LIMITS_FILE="/tmp/projeto-novasemente-upload-limits.ini"

if command -v nginx >/dev/null 2>&1 && [ -d /etc/nginx/conf.d ]; then
    install -m 0644 "${NGINX_LIMITS_SOURCE}" /etc/nginx/conf.d/projeto-novasemente-upload-limits.conf
    nginx -t
    # Smoke check: se o nginx não incluir conf.d, este ficheiro não terá efeito.
    if nginx -T 2>/dev/null | grep -q "projeto-novasemente-upload-limits.conf"; then
        echo "[upload-limits] Nginx: limites aplicados via /etc/nginx/conf.d/."
    else
        echo "[upload-limits] AVISO: Nginx não parece incluir /etc/nginx/conf.d/*.conf."
        echo "[upload-limits]        Inclua manualmente o ficheiro em sites-enabled/server { ... }."
    fi
    if command -v systemctl >/dev/null 2>&1; then
        systemctl reload nginx
    else
        service nginx reload
    fi
fi

cat > "${PHP_LIMITS_FILE}" <<'INI'
upload_max_filesize = 64M
post_max_size = 72M
INI

PHP_FPM_CONFIGURED=0
# Instala para FPM / Apache2 / CLI conforme a stack do servidor.
PHP_SAPI_CONFIGURED=0
for PHP_CONF_DIR in /etc/php/*/fpm/conf.d /etc/php/*/apache2/conf.d /etc/php/*/cli/conf.d; do
    if [ -d "${PHP_CONF_DIR}" ]; then
        install -m 0644 "${PHP_LIMITS_FILE}" "${PHP_CONF_DIR}/99-projeto-novasemente-upload-limits.ini"
        PHP_SAPI_CONFIGURED=1
    fi
done
rm -f "${PHP_LIMITS_FILE}"

if [ "${PHP_SAPI_CONFIGURED}" -eq 1 ] && command -v systemctl >/dev/null 2>&1; then
    while IFS= read -r PHP_FPM_SERVICE; do
        [ -n "${PHP_FPM_SERVICE}" ] || continue
        systemctl reload "${PHP_FPM_SERVICE}" || systemctl restart "${PHP_FPM_SERVICE}"
    done < <(systemctl list-units --type=service --all 'php*-fpm.service' --no-legend --no-pager | awk '{print $1}')
fi

# Se a stack for Apache (mod_php/php-fpm via proxy_fcgi), recarrega também.
if command -v systemctl >/dev/null 2>&1; then
    systemctl reload apache2 2>/dev/null || true
    systemctl reload httpd 2>/dev/null || true
fi
