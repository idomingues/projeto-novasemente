#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: installing JS dependencies"
REPO_DIR="$CI_WORKSPACE"
if [ -d "$CI_WORKSPACE/repository" ]; then
  REPO_DIR="$CI_WORKSPACE/repository"
fi
cd "$REPO_DIR"

# Ensure a consistent install on CI.
npm ci

echo "==> Xcode Cloud: building web bundle"
npm run build

echo "==> Xcode Cloud: syncing Capacitor native projects"
# If CAPACITOR_SERVER_URL is provided in the workflow Environment, Capacitor will
# configure the iOS WebView to load it (remote Laravel/Inertia).
npx cap sync ios

