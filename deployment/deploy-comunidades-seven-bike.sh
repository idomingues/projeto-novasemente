#!/usr/bin/env bash
# Instala / repara o Seven Bike Nova Semente em produção (comunidade + capa).
# Uso no servidor:
#   cd /var/www/projeto-novasemente && bash deployment/deploy-comunidades-seven-bike.sh
#
# Pré-requisito: código atualizado (git pull / deploy) com:
#   - database/seed-assets/communities/seven-bike-nova-semente.jpg
#   - app/Support/CommunityAssetInstaller.php
#   - php artisan communities:install-defaults
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Comunidades — Seven Bike (produção)"
echo "    Diretório: $ROOT"
echo ""

SEED_FILE="database/seed-assets/communities/seven-bike-nova-semente.jpg"
if [[ ! -f "$SEED_FILE" ]]; then
  echo "ERRO: Arte não encontrada: $SEED_FILE"
  echo "      Faça git pull / deploy do código antes de rodar este pacote."
  exit 1
fi

echo "==> Migrations pendentes..."
php artisan migrate --force

echo ""
echo "==> Instalando Seven Bike (BD + storage)..."
php artisan communities:install-defaults

echo ""
echo "==> Limpando cache..."
php artisan optimize:clear 2>/dev/null || true
php artisan permission:cache-reset 2>/dev/null || true

APP_URL="$(php -r "require 'vendor/autoload.php'; \$app = require 'bootstrap/app.php'; \$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo rtrim(config('app.url'), '/');")"
MEDIA_URL="${APP_URL}/media/communities/covers/seven-bike-nova-semente.jpg"
PAGE_URL="${APP_URL}/mobile/comunidade"

echo ""
echo "==> Verificação"
echo "    Página app:  $PAGE_URL"
echo "    URL da capa: $MEDIA_URL"
echo ""
echo "    Teste rápido da capa:"
if command -v curl &>/dev/null; then
  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$MEDIA_URL" || echo '000')"
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "    curl: OK (HTTP $HTTP_CODE)"
  else
    echo "    curl: FALHOU (HTTP $HTTP_CODE) — confira PublicDiskFileController (prefixo communities/)"
    exit 1
  fi
else
  echo "    (curl não instalado — abra a URL da capa no navegador)"
fi

echo ""
echo "==> Atualizando descritivo da versão (Comunidades)..."
if [[ -f deployment/release-notes.txt ]]; then
  php artisan app:release-notes --for-version=20.0.5 || php artisan app:release-notes || true
fi

echo ""
echo "Pacote Seven Bike aplicado com sucesso."
