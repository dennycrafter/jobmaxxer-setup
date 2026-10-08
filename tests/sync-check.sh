#!/usr/bin/env bash
# Checks whether the live artifact still matches this repo, WITHOUT reading the files into Claude's context.
# Usage: first `Artifact` action "read" the live URL; for each file, pass the saved path it prints:
#   bash tests/sync-check.sh index.html /path/to/saved-live-index.html
#   bash tests/sync-check.sh app.js     /path/to/saved-live-app.js
# Prints SAME, or DIFFERENT plus a short summary. Only on DIFFERENT, look at the diff it prints (capped).
repo_file="$1"; live="$2"
cd "$(dirname "$0")/.." || exit 1
tmp="$(mktemp)"
if [ "$repo_file" = "index.html" ]; then
  # The host wraps index.html in a skeleton: strip it before comparing.
  sed '1s/^<!doctype.*<body>//' "$live" | sed '$s#</body></html>$##' > "$tmp"
else
  cp "$live" "$tmp"
fi
if diff -q -B <(sed '/^[[:space:]]*$/d' "$tmp") <(sed '/^[[:space:]]*$/d' "$repo_file") > /dev/null; then
  echo "SAME: live $repo_file matches the repo"
else
  echo "DIFFERENT: live $repo_file changed outside the repo ($(diff -B "$tmp" "$repo_file" | grep -c '^[<>]') changed lines)"
  diff -B "$tmp" "$repo_file" | cut -c1-200 | head -40
fi
rm -f "$tmp"
