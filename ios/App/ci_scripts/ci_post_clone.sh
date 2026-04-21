#!/bin/bash
set -euo pipefail

# Fallback location: some Xcode Cloud configurations resolve ci_scripts relative
# to the selected project/workspace directory (here: ios/App/App.xcodeproj).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

bash "$REPO_ROOT/ci_scripts/ci_post_clone.sh"

