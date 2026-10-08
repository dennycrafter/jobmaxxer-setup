#!/usr/bin/env bash
# Runs the page check. Needs Node and Playwright (both pre-installed in Claude's cloud workspace).
cd "$(dirname "$0")/.." && NODE_PATH="${NODE_PATH:-$(npm root -g)}" node tests/check.js
