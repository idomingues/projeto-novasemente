#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: post-clone (noop)"

# Heavy dependency install happens in `ci_pre_xcodebuild.sh` to ensure it runs
# before `xcodebuild`/SwiftPM resolution.

exit 0
