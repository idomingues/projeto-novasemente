#!/usr/bin/env bash
# Correr no servidor quando public/build/manifest.json estiver em falta:
#   cd /var/www/projeto-novasemente && bash scripts/build-assets.sh
set -e
cd "$(dirname "$0")/.."
echo "Node: $(node -v 2>/dev/null || echo 'não encontrado')"
echo "NPM:  $(npm -v 2>/dev/null || echo 'não encontrado')"
if ! command -v node &>/dev/null; then
  echo "Instale Node.js 18+ (ex: apt install nodejs ou use nvm)."
  exit 1
fi
rm -rf node_modules
npm ci
npm run build
echo "Build concluído. Verifique: ls -la public/build/"
