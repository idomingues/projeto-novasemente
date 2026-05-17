#!/usr/bin/env bash
# Falha se encontrar termos típicos de português de Portugal em textos de produto (PT-BR obrigatório).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATHS=(
  resources/js
  resources/views
  app/Http
  app/Support/VolunteerContactDuplicateChecker.php
  app/Support/PageViewRouteLabels.php
  lang
  config/app.php
)

PATTERNS=(
  '[[:<:]]equipa[[:>:]]'
  '[[:<:]]utilizador(es)?[[:>:]]'
  '[[:<:]]registo(s)?[[:>:]]'
  '[[:<:]]ecr[aã](s)?[[:>:]]'
  '[[:<:]]grelha[[:>:]]'
  '[[:<:]]contacto(s)?[[:>:]]'
  'telem[oó]vel'
  '[[:<:]]ficheiro(s)?[[:>:]]'
  'palavra-passe'
  '[[:<:]]morada[[:>:]]'
  '[[:<:]]separador[[:>:]]'
  '[[:<:]]registado(s)?[[:>:]]'
  '[[:<:]]noutra(s)?[[:>:]]'
  'mant[eé]m-se'
)

GREP_EXCLUDES=(
  --exclude-dir=node_modules
  --exclude-dir=vendor
  --exclude='adventistBeliefsFullText.gen.ts'
)

found=0
for pattern in "${PATTERNS[@]}"; do
  hits=$(grep -rniE "${pattern}" "${PATHS[@]}" "${GREP_EXCLUDES[@]}" 2>/dev/null | grep -vi equipament || true)
  if [[ -n "$hits" ]]; then
    echo "=== Termo PT-PT detectado (${pattern}) ==="
    echo "$hits"
    echo
    found=1
  fi
done

if [[ "$found" -ne 0 ]]; then
  echo "Corrija os textos acima para português do Brasil (pt_BR)."
  echo "Consulte .cursor/rules/pt-br-idioma.mdc e config/idioma.php."
  exit 1
fi

echo "OK: nenhum termo PT-PT proibido encontrado nos caminhos de produto."
