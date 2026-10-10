#!/usr/bin/env bash
# Pass B — content recovery from the live site.
#
# Runs after pass-a.sh. Produces rebuild/src/content/projects/*.md with real
# bodies, listing thumbnails, and inline markup CONVERTED rather than discarded.
#
# The first version stripped tags with a regex, which destroyed <code> and
# <a> mid-sentence — "created with" / "peity" / "and plain javascript" was one
# link and one <code> shredded into three fragments. Inline elements are now
# converted to their Markdown equivalents before any tags are removed.
#
# Rule: recover, never invent. If a body cannot be recovered, leave it empty and
# record the slug in spec/gaps.md. Fabricated portfolio content attributed to a
# named real person is not a placeholder.

set -uo pipefail
cd "$(dirname "$0")/.."

OUT=extract
LIVE=$OUT/live
DEST=rebuild/src/content/projects
THUMBS=rebuild/public/images/thumbs

mkdir -p "$LIVE" "$DEST" "$THUMBS"

WORK=(approval-rates brb-email diabetes digitaalinenkirjallisuus-fi
      election-day-results ilmastonmuuttajat-climate-changers kaekriaeinen
      lukiovertailu-high-school-comparison runokuu-2020 stt-tarkkailija
      veikkaus-beneficiaries visualizing-government)
ART=(beyond-shape conversions eurovision-som i-can-t-let-you-do-that-human
     instru-mental inversion)

for slug in "${WORK[@]}" "${ART[@]}"; do
  [ -f "$LIVE/$slug.html" ] || \
    curl -s -m 30 -o "$LIVE/$slug.html" "https://wolfw.xyz/$slug"
done

for page in work art; do
  [ -f "$LIVE/__listing_$page.html" ] || \
    curl -s -m 30 -o "$LIVE/__listing_$page.html" "https://wolfw.xyz/$page"
done

echo "Fetched. Now run: python3 extract/pass-b.py"
