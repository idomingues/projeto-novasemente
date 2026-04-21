#!/bin/bash
set -euo pipefail

# Some Xcode Cloud workflows look for CI scripts at repo root.
# Delegate to the canonical script under ci_scripts/.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/ci_scripts/ci_post_clone.sh"

