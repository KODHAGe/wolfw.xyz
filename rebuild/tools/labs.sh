#!/usr/bin/env bash
# Labs on/off for the preview server.
#
# The five labs live in rebuild/tools/ (dev-only). To see them in a preview they
# must be COPIED into src/pages/ — which is exactly what trips the production
# CSS/JS budgets (S3-css, S1-*) if you build and commit from that state.
# Twice now. So: this script toggles them, and `off` is what you run before
# a production build or a commit.
#
#   tools/labs.sh on     copy the labs into src/pages (preview with labs)
#   tools/labs.sh off    remove them (production build / commit)
#   tools/labs.sh status show which is in place
#
# Usage: tools/labs.sh on|off|status
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rebuild="$(dirname "$here")"
pages="$rebuild/src/pages"

labs=(type-lab button-lab background-lab background-playground glass-lab)

case "${1:-status}" in
  on)
    for l in "${labs[@]}"; do
      cp "$here/$l.astro" "$pages/$l.astro"
    done
    echo "labs ON (${#labs[@]} pages copied into src/pages) — preview will serve them."
    echo "REMEMBER: tools/labs.sh off before committing or building for production."
    ;;
  off)
    for l in "${labs[@]}"; do
      rm -f "$pages/$l.astro"
    done
    echo "labs OFF (src/pages clean) — safe to build and commit."
    ;;
  status)
    present=0
    for l in "${labs[@]}"; do
      [ -f "$pages/$l.astro" ] && present=$((present + 1))
    done
    echo "labs in src/pages: $present/${#labs[@]}"
    [ "$present" -gt 0 ] && echo "  -> run tools/labs.sh off before a production build/commit"
    exit 0
    ;;
  *)
    echo "usage: $0 on|off|status" >&2
    exit 1
    ;;
esac
