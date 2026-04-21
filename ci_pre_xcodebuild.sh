#!/bin/bash
set -euo pipefail

# Fallback hook at repo root for Xcode Cloud.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/ci_scripts/ci_pre_xcodebuild.sh"

