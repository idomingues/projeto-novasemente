#!/bin/bash
set -euo pipefail

echo "==> Capacitor Cloud prepare"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# `lib/` lives under `ci_scripts/lib/`
CI_SCRIPTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Determine repo root reliably (CI_WORKSPACE may be unset).
REPO_DIR=""
if command -v git >/dev/null 2>&1; then
  REPO_DIR="$(git -C "$CI_SCRIPTS_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$REPO_DIR" ]; then
  # Walk up from ci_scripts/ looking for package.json
  CANDIDATE="$CI_SCRIPTS_DIR"
  for _ in 1 2 3 4 5 6 7 8; do
    if [ -f "$CANDIDATE/package.json" ]; then
      REPO_DIR="$CANDIDATE"
      break
    fi
    CANDIDATE="$(cd "$CANDIDATE/.." && pwd)"
  done
fi
if [ -z "$REPO_DIR" ]; then
  if [ -d "/Volumes/workspace/repository" ]; then
    REPO_DIR="/Volumes/workspace/repository"
  else
    REPO_DIR="$CI_SCRIPTS_DIR"
  fi
fi

echo "==> Repo dir: $REPO_DIR"
cd "$REPO_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "==> ERROR: Node not found in PATH."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(\".\")[0]')"
echo "==> Node version: $(node -v)"

# Vite 7 expects Node 20+. Xcode Cloud images may default to Node 18.x.
if [ "$NODE_MAJOR" -lt 20 ]; then
  if command -v brew >/dev/null 2>&1; then
    echo "==> Node < 20; installing Node 20 via Homebrew (Xcode Cloud)"
    brew list --formula | grep -q '^node@20$' || brew install node@20
    BREW_PREFIX="$(brew --prefix)"
    export PATH="$BREW_PREFIX/opt/node@20/bin:$PATH"
    hash -r
    NODE_MAJOR="$(node -p 'process.versions.node.split(\".\")[0]')"
    echo "==> Node version (after brew): $(node -v)"
  else
    echo "==> ERROR: Node < 20 and Homebrew not available."
    exit 1
  fi
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "==> ERROR: Still on Node < 20 after install attempt."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "==> ERROR: npm not found in PATH."
  exit 1
fi

echo "==> Installing JS dependencies (npm ci)"
npm ci

echo "==> Building web bundle (npm run build)"
npm run build

echo "==> Syncing Capacitor iOS (npx cap sync ios)"
# If CAPACITOR_SERVER_URL is provided in the workflow Environment, Capacitor will
# configure the iOS WebView to load it (remote Laravel/Inertia).
npx cap sync ios

echo "==> Capacitor Cloud prepare: OK"
