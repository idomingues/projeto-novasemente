#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: pre-xcodebuild (ensure Capacitor deps exist)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

REPO_DIR=""
if command -v git >/dev/null 2>&1; then
  REPO_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$REPO_DIR" ]; then
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

# Install JS deps if missing (or if node_modules wasn't restored).
if [ ! -d "node_modules" ]; then
  echo "==> Installing JS dependencies (npm ci)"
  npm ci
fi

echo "==> Building web bundle"
npm run build

echo "==> Syncing Capacitor iOS project"
npx cap sync ios

