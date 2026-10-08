#!/usr/bin/env bash
# Checks a master CV on the real page before saving it. Needs Node and Playwright (pre-installed in Claude's cloud workspace).
# Usage: bash setup/check-cv.sh <master-cv.json> [preview.png]
abs() { [ -n "$1" ] && echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; }
cv="$(abs "$1")"; shot="$(abs "$2")"
cd "$(dirname "$0")/.." && NODE_PATH="${NODE_PATH:-$(npm root -g)}" node setup/check-cv.js "$cv" $shot
