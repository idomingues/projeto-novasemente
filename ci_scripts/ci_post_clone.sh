#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: installing JS dependencies"
cd "$CI_WORKSPACE"

# Ensure a consistent install on CI.
npm ci

echo "==> Xcode Cloud: building web bundle"
npm run build

echo "==> Xcode Cloud: syncing Capacitor native projects"
# If CAPACITOR_SERVER_URL is provided in the workflow Environment, Capacitor will
# configure the iOS WebView to load it (remote Laravel/Inertia).
npx cap sync ios

