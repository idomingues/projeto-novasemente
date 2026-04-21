#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: pre-xcodebuild (ensure Capacitor deps exist)"

REPO_DIR="${CI_WORKSPACE:-.}"
if [ -d "${CI_WORKSPACE:-}/repository" ]; then
  REPO_DIR="$CI_WORKSPACE/repository"
fi

cd "$REPO_DIR"

# Install JS deps if missing (or if node_modules wasn't restored).
if [ ! -d "node_modules" ]; then
  echo "==> Installing JS dependencies (npm ci)"
  npm ci
fi

echo "==> Building web bundle"
npm run build

echo "==> Syncing Capacitor iOS project"
npx cap sync ios

