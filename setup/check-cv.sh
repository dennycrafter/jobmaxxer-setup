#!/usr/bin/env bash
# Checks a master CV on the real page before saving it. Needs Node and Playwright (pre-installed in Claude's cloud workspace).
# Usage: bash setup/check-cv.sh <master-cv.json> [preview.png] [--lang fr] [--paper a4]
abs() { [ -n "$1" ] && echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; }
args=()
while [ $# -gt 0 ]; do
  case "$1" in
    --lang|--paper) args+=("$1" "$2"); shift 2 ;;
    *) args+=("$(abs "$1")"); shift ;;
  esac
done
cd "$(dirname "$0")/.." && NODE_PATH="${NODE_PATH:-$(npm root -g)}" node setup/check-cv.js "${args[@]}"
