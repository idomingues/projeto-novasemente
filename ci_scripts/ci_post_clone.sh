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
  echo "==> Node not available; skipping npm/capacitor steps"
  exit 0
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(\".\")[0]')"
echo "==> Node version: $(node -v)"

if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "==> Node < 22; skipping npm/capacitor steps"
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "==> npm not available; skipping npm/capacitor steps"
  exit 0
fi

echo "==> Installing JS dependencies (npm ci)"
npm ci

echo "==> Xcode Cloud: building web bundle"
npm run build

echo "==> Xcode Cloud: syncing Capacitor native projects"
# If CAPACITOR_SERVER_URL is provided in the workflow Environment, Capacitor will
# configure the iOS WebView to load it (remote Laravel/Inertia).
npx cap sync ios

