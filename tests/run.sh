#!/usr/bin/env bash
# Runs the checks. Needs Node and Playwright (both pre-installed in Claude's cloud workspace).
cd "$(dirname "$0")/.." || exit 1
node tests/cv-rules-test.js | grep -v '^PASS' ; rules=${PIPESTATUS[0]}
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node tests/check.js; page=$?
[ "$rules" -eq 0 ] && [ "$page" -eq 0 ]
