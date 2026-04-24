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

node_major() {
  if ! command -v node >/dev/null 2>&1; then
    echo 0
    return 0
  fi
  node -p 'process.versions.node.split(".")[0]'
}

install_official_node_darwin() {
  # Xcode Cloud images may ship Node 18 or omit npm; Homebrew is not always reliable.
  local version="${XCODE_CLOUD_NODE_VERSION:-22.14.0}"
  local arch node_arch name tar dest dl tmp extracted
  arch="$(uname -m)"
  case "$arch" in
    arm64) node_arch="arm64" ;;
    x86_64) node_arch="x64" ;;
    *)
      echo "ci_scripts/ci_post_clone.sh:1: error: Unsupported macOS arch for Node bootstrap: $arch"
      return 1
      ;;
  esac
  name="node-v${version}-darwin-${node_arch}"
  tar="${name}.tar.gz"
  dest="$REPO_DIR/.ci-toolcache/nodejs/${name}"
  mkdir -p "$REPO_DIR/.ci-toolcache/nodejs"
  if [ -x "$dest/bin/node" ]; then
    export PATH="$dest/bin:$PATH"
    hash -r || true
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    echo "ci_scripts/ci_post_clone.sh:1: error: curl not found; cannot download Node."
    return 1
  fi
  dl="$REPO_DIR/.ci-toolcache/$tar"
  tmp="$REPO_DIR/.ci-toolcache/_node_unpack"
  echo "==> Installing Node ${version} (${node_arch}) under $REPO_DIR/.ci-toolcache/nodejs"
  rm -rf "$tmp"
  mkdir -p "$tmp"
  curl -fsSL "https://nodejs.org/dist/v${version}/${tar}" -o "$dl"
  tar -xzf "$dl" -C "$tmp"
  extracted="$(find "$tmp" -maxdepth 1 -mindepth 1 -type d | head -n 1)"
  rm -rf "$dest"
  mv "$extracted" "$dest"
  rm -rf "$tmp" "$dl" 2>/dev/null || true
  export PATH="$dest/bin:$PATH"
  hash -r || true
}

NODE_MAJOR="$(node_major)"
echo "==> Node (initial): ${NODE_MAJOR:-0} $(command -v node >/dev/null 2>&1 && node -v || echo '(no node)')"

# Vite 7 expects Node 20+. Xcode Cloud images may default to Node 18.x.
if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  if command -v brew >/dev/null 2>&1; then
    echo "==> Node < 20; trying Homebrew (best-effort)"
    export HOMEBREW_NO_ANALYTICS=1
    export HOMEBREW_NO_AUTO_UPDATE=1
    brew install node@22 || brew install node@20 || brew install node || true
    BREW_PREFIX="$(brew --prefix 2>/dev/null || true)"
    if [ -n "${BREW_PREFIX:-}" ]; then
      export PATH="$BREW_PREFIX/opt/node@22/bin:$BREW_PREFIX/opt/node@20/bin:$BREW_PREFIX/opt/node/bin:$PATH"
    fi
    hash -r || true
    NODE_MAJOR="$(node_major)"
    echo "==> Node (after brew): ${NODE_MAJOR:-0} $(command -v node >/dev/null 2>&1 && node -v || echo '(no node)')"
  fi
fi

if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  echo "==> Node still < 20; bootstrapping official Node tarball for darwin"
  install_official_node_darwin
  NODE_MAJOR="$(node_major)"
  echo "==> Node (after tarball): ${NODE_MAJOR:-0} $(command -v node >/dev/null 2>&1 && node -v || echo '(no node)')"
fi

if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  echo "ci_scripts/ci_post_clone.sh:1: error: Node >= 20 is required for this frontend toolchain."
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

echo "==> Repoint CapApp-SPM local packages (ios/App/CapacitorSpmPlugins; survives npm ci)"
node scripts/patch-capapp-spm-local-packages.mjs
