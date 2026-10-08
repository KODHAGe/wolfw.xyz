#!/usr/bin/env bash
# Pass A — deterministic extraction.
#
# No model. Everything here is grep/awk/git. The point of running this
# separately from Pass B is to find out how much of the spec is recoverable
# without a model at all — whatever Pass A gets right, Pass B must not
# re-derive or contradict.
#
# Note: this deliberately avoids `set -e`. Several greps legitimately exit
# non-zero (no matches, or filtered-out-only matches), and the loop
# conditionals would abort the run. Every output file is written whole, so a
# partial block is still useful output.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

OUT=extract/pass-a
mkdir -p "$OUT"

STARTER=07caae8   # upstream gatsby-starter-default import

# ---------------------------------------------------------------- change surface
{
  echo "# Pass A — change surface"
  echo
  echo "Upstream boilerplate boundary: \`$STARTER\` (gatsby-starter-default)"
  echo
  echo "## Files touched since starter"
  git diff --stat "$STARTER" HEAD -- . ':!package-lock.json' | tail -n +5
  echo
  echo "## Deleted boilerplate"
  git diff --name-status "$STARTER" HEAD | grep '^D' || echo "(none)"
  echo
  echo "## Commit count since starter"
  git rev-list --count "$STARTER"..HEAD
} > "$OUT/change-surface.md"

# ------------------------------------------------------------------------ routes
# Gatsby file routing: every file under src/pages becomes a route.
# projectPage.js is special — instantiated dynamically by gatsby-node.js.
{
  echo "# Routes (Gatsby file routing over src/pages)"
  echo
  echo "| Source | Route | Kind |"
  echo "|---|---|---|"
  for f in src/pages/*.js; do
    base=$(basename "$f" .js)
    case "$base" in
      index) route="/" ;;
      404)   route="/404" ;;
      *)     route="/$base" ;;
    esac
    if [ "$base" = "projectPage" ]; then
      echo "| \`$f\` | \`/{slug}\` | dynamic — one per Sanity project, created in \`gatsby-node.js\` |"
    else
      echo "| \`$f\` | \`$route\` | static |"
    fi
  done
} > "$OUT/routes.md"

# --------------------------------------------------------------------- queries
# The GraphQL queries ARE the consumed data contract. Anything the site reads
# from Sanity has to appear here, or it is not actually used.
{
  echo "# GraphQL queries — the consumed data contract"
  echo
  echo "## Sanity types referenced"
  grep -rhoE '\b(sanity|allSanity)[A-Z][A-Za-z]*' src/ --include='*.js' | sort -u
  echo
  echo "## Full query definitions"
  for f in $(grep -rl 'graphql`' src/pages --include='*.js'); do
    echo
    echo "### \`$f\`"
    echo '```graphql'
    awk '/graphql`/,/`$/' "$f" | sed '1s/.*graphql`//; $s/`.*//'
    echo '```'
  done
} > "$OUT/queries.md"

# ------------------------------------------------------------------ integrations
# gatsby-config plugins are the site's entire external dependency list, and they
# are already declarative — no extraction difficulty here.
{
  echo "# Integration surface"
  echo
  echo "## Gatsby plugins (\`gatsby-config.js\`)"
  grep -nE "resolve:|^ *\`[a-z@]" gatsby-config.js
  echo
  echo "## siteMetadata"
  sed -n '/siteMetadata:/,/^  },/p' gatsby-config.js
  echo
  echo "## Env vars referenced in code"
  grep -rnoE 'process\.env\.[A-Z_]+' . --include='*.js' --exclude-dir=node_modules | sort -u
  echo
  echo "## Env vars defined (now.json)"
  jq -r '.build.env // {} | to_entries[] | "  \(.key) = \(.value)"' now.json 2>/dev/null || echo "  (none)"
  echo
  echo "## Runtime dependencies (package.json)"
  jq -r '.dependencies | to_entries[] | "  \(.key)@\(.value)"' package.json
} > "$OUT/integrations.md"

# ------------------------------------------------------------------- components
# Which components exist and which are reachable from a route. Unreachable
# components are not site requirements.
{
  echo "# Components"
  echo
  echo "## Declared"
  find src -name '*.js' | sort | sed 's/^/  /'
  echo
  echo "## Import specifiers"
  grep -rhoE 'from "[./@][^"]+"' src/ --include='*.js' | sed 's/from "//; s/"//' | sort -u | sed 's/^/  /'
  echo
  echo "## Unreachable — declared but never imported anywhere"
  echo
  echo "A component here is never rendered. Not a requirement."
  echo
  echo "Two classes of entry point are excluded, because import graph analysis"
  echo "cannot see them and a naive check wrongly reports them as dead:"
  echo
  echo "- **Pages** (\`src/pages/*\`) are routed to by Gatsby, never imported."
  echo "- **Theme shadow overrides** (\`src/@mkitio/*\`) replace files inside an"
  echo "  installed theme at build time, consumed by the plugin, not by import."
  echo
  for f in $(find src -name '*.js'); do
    case "$f" in
      src/pages/*|src/@mkitio/*) continue ;;
    esac
    base=$(basename "$f" .js)
    refs=$(grep -rl "/${base}\"\|\./${base}\"" src/ --include='*.js' 2>/dev/null | grep -v "^${f}$")
    if [ -z "$refs" ]; then
      echo "  $f"
    fi
  done
} > "$OUT/components.md"

# ---------------------------------------------------------------------- content
# Content living in code rather than Sanity. The rebuild has to carry every
# byte of this forward explicitly, so it needs to be inventoried.
{
  echo "# Hardcoded content — lives in code, not in Sanity"
  echo
  echo "## \`src/pages/index.js\` text nodes"
  grep -oE '>[^<>{}]{2,}<' src/pages/index.js | sed 's/^>//; s/<$//' | grep -v '^[[:space:]]*$' | sed 's/^/  /'
  echo
  echo "## \`src/pages/cv.js\` text nodes"
  grep -oE '>[^<>{}]{2,}<' src/pages/cv.js | sed 's/^>//; s/<$//' | grep -v '^[[:space:]]*$' | sed 's/^/  /'
  echo
  echo "## \`src/components/facts.js\` — default facts array"
  echo
  echo "Count: $(grep -cE '^ +\"' src/components/facts.js)"
  sed -n '/facts: \[/,/^  \]/p' src/components/facts.js | grep -oE '"[^"]{10,}"' | sed 's/^/  /'
  echo
  echo "## \`src/components/cvList.js\` — CV structure"
  echo
  echo "CvListItem count: $(grep -cE '<CvListItem' src/components/cvList.js)"
  echo "CvListTitle sections:"
  grep -oE '<CvListTitle>[^<]*</CvListTitle>' src/components/cvList.js | sed 's/<[^>]*>//g' | sed 's/^/  /'
  echo
  echo "Positions (dates | position | company):"
  grep -oE 'dates="[^"]*" position="[^"]*" company="[^"]*"' src/components/cvList.js \
    | sed 's/dates="/  /; s/" position="/  |  /; s/" company="/  |  /; s/"$//'
} > "$OUT/content.md"

echo "Pass A complete -> $OUT/"
ls -1 "$OUT"
