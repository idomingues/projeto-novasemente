#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: pre-xcodebuild"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Safety net: if post-clone didn't populate node_modules for some reason, do it now.
if [ ! -d "$REPO_ROOT/node_modules/@capacitor/device" ] || [ ! -d "$REPO_ROOT/node_modules/@capacitor/push-notifications" ]; then
  echo "==> Missing Capacitor plugin folders in node_modules; running prepare"
  bash "$REPO_ROOT/ci_scripts/lib/capacitor_cloud_prepare.sh"
else
  echo "==> node_modules Capacitor plugins already present; skipping prepare"
fi
