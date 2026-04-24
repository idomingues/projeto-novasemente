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
  echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: Node not found in PATH."
  exit 1
fi

ensure_node_20_plus() {
  local major
  major="$(node -p 'process.versions.node.split(\".\")[0]')"
  if [ "$major" -ge 20 ]; then
    echo "==> Node OK: $(node -v)"
    return 0
  fi

  echo "==> Node too old for Vite 7: $(node -v)"

  if command -v brew >/dev/null 2>&1; then
    export HOMEBREW_NO_ANALYTICS=1
    export HOMEBREW_NO_AUTO_UPDATE=1

    echo "==> Trying Homebrew Node installs (best-effort)"
    # Prefer newer LTS lines first; fall back to generic `node`.
    brew install node@22 || brew install node@20 || brew install node || true

    BREW_PREFIX="$(brew --prefix)"
    # Put common keg paths ahead of PATH.
    export PATH="$BREW_PREFIX/opt/node@22/bin:$BREW_PREFIX/opt/node@20/bin:$BREW_PREFIX/opt/node/bin:$PATH"
    hash -r || true
  fi

  major="$(node -p 'process.versions.node.split(\".\")[0]')"
  if [ "$major" -ge 20 ]; then
    echo "==> Node OK after brew: $(node -v)"
    return 0
  fi

  # Fallback: official Node binary tarball (no brew needed).
  echo "==> Installing Node 20.x via official tarball (fallback)"

  if ! command -v curl >/dev/null 2>&1; then
    echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: curl not found; cannot download Node."
    exit 1
  fi

  ARCH="$(uname -m)"
  NODE_DIST=""
  if [ "$ARCH" = "arm64" ]; then
    NODE_DIST="darwin-arm64"
  else
    NODE_DIST="darwin-x64"
  fi

  NODE_VERSION="20.18.1"
  TARBALL="node-v${NODE_VERSION}-${NODE_DIST}.tar.gz"
  URL="https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}"

  TOOL_DIR="${TMPDIR:-/tmp}/ns-node"
  mkdir -p "$TOOL_DIR"
  cd "$TOOL_DIR"
  rm -rf "node-v${NODE_VERSION}-${NODE_DIST}" "$TARBALL" || true
  curl -fsSL "$URL" -o "$TARBALL"
  tar -xzf "$TARBALL"
  export PATH="$TOOL_DIR/node-v${NODE_VERSION}-${NODE_DIST}/bin:$PATH"
  hash -r || true

  cd "$REPO_DIR"
  major="$(node -p 'process.versions.node.split(\".\")[0]')"
  if [ "$major" -lt 20 ]; then
    echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: Could not upgrade Node to >= 20 (still $(node -v))."
    exit 1
  fi

  echo "==> Node OK after tarball: $(node -v)"
}

ensure_node_20_plus

if ! command -v npm >/dev/null 2>&1; then
  echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: npm not found in PATH."
  exit 1
fi

echo "==> npm: $(npm -v)"

echo "==> Installing JS dependencies (npm ci)"
set +e
npm ci --no-audit --no-fund
npm_ci_status=$?
set -e
if [ "$npm_ci_status" -ne 0 ]; then
  echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: npm ci failed (exit $npm_ci_status). See npm output above."
  exit "$npm_ci_status"
fi

echo "==> Building web bundle (npm run build)"
npm run build

echo "==> Syncing Capacitor iOS (npx cap sync ios)"
# If CAPACITOR_SERVER_URL is provided in the workflow Environment, Capacitor will
# configure the iOS WebView to load it (remote Laravel/Inertia).
npx cap sync ios

echo "==> Verifying plugin paths exist for SPM"
test -d "$REPO_DIR/node_modules/@capacitor/device" || (echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: missing node_modules/@capacitor/device" && exit 1)
test -d "$REPO_DIR/node_modules/@capacitor/network" || (echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: missing node_modules/@capacitor/network" && exit 1)
test -d "$REPO_DIR/node_modules/@capacitor/push-notifications" || (echo "ci_scripts/lib/capacitor_cloud_prepare.sh:1: error: missing node_modules/@capacitor/push-notifications" && exit 1)

echo "==> Capacitor Cloud prepare: OK"
