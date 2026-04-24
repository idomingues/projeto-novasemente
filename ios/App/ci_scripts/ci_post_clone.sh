#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: post-clone (ios/App/ci_scripts wrapper)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

bash "$REPO_ROOT/ci_scripts/ci_post_clone.sh"
