#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: post-clone"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/lib/capacitor_cloud_prepare.sh"
