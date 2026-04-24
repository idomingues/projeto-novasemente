#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: post-clone (repo root)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# When Xcode Cloud runs scripts from repo root, still do the same prepare.
bash "$SCRIPT_DIR/lib/capacitor_cloud_prepare.sh"
