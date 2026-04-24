#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: post-clone"

# Must run BEFORE SwiftPM dependency resolution in Xcode Cloud.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

bash "$REPO_ROOT/ci_scripts/lib/capacitor_cloud_prepare.sh"
