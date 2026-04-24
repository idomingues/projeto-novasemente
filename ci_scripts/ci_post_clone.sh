#!/bin/bash
set -euo pipefail

echo "==> Xcode Cloud: post-clone (noop)"

# Important: keep this script non-fatal.
# Some Xcode Cloud pipelines resolve SwiftPM very early; heavy work should run in
# `ios/App/ci_scripts/ci_pre_xcodebuild.sh` (runs before `xcodebuild`).

exit 0
