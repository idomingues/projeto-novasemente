#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: post-clone"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine repo root reliably (CI_WORKSPACE may be unset).
REPO_DIR=""
if command -v git >/dev/null 2>&1; then
  REPO_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$REPO_DIR" ]; then
  # Walk up from script dir looking for package.json
  CANDIDATE="$SCRIPT_DIR"
  for _ in 1 2 3 4 5 6; do
    if [ -f "$CANDIDATE/package.json" ]; then
      REPO_DIR="$CANDIDATE"
      break
    fi
    CANDIDATE="$(cd "$CANDIDATE/.." && pwd)"
  done
fi
if [ -z "$REPO_DIR" ]; then
  # Fall back to common Xcode Cloud checkout path
  if [ -d "/Volumes/workspace/repository" ]; then
    REPO_DIR="/Volumes/workspace/repository"
  else
    REPO_DIR="$SCRIPT_DIR"
  fi
fi

echo "==> Repo dir: $REPO_DIR"
cd "$REPO_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "ci_scripts/ci_post_clone.sh:1: error: Node not found in PATH."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
echo "==> Node version: $(node -v)"

# Vite 7 expects Node 20+. Xcode Cloud images may default to Node 18.x.
if [ "$NODE_MAJOR" -lt 20 ]; then
  if command -v brew >/dev/null 2>&1; then
    echo "==> Node < 20; installing a newer Node via Homebrew (best-effort)"
    export HOMEBREW_NO_ANALYTICS=1
    export HOMEBREW_NO_AUTO_UPDATE=1
    brew install node@22 || brew install node@20 || brew install node || true
    BREW_PREFIX="$(brew --prefix)"
    export PATH="$BREW_PREFIX/opt/node@22/bin:$BREW_PREFIX/opt/node@20/bin:$BREW_PREFIX/opt/node/bin:$PATH"
    hash -r || true
    NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
    echo "==> Node version (after brew): $(node -v)"
  fi
fi

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ci_scripts/ci_post_clone.sh:1: error: Node >= 20 is required for this frontend toolchain (got $(node -v))."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ci_scripts/ci_post_clone.sh:1: error: npm not found in PATH."
  exit 1
fi

echo "==> Installing JS dependencies (npm ci)"
npm ci --no-audit --no-fund

echo "==> Xcode Cloud: building web bundle"
npm run build

echo "==> Xcode Cloud: syncing Capacitor native projects"
# If CAPACITOR_SERVER_URL is provided in the workflow Environment, Capacitor will
# configure the iOS WebView to load it (remote Laravel/Inertia).
npx cap sync ios
