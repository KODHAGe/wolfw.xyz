# wolfw.xyz — spec-driven migration study

Plan for three studies, using a real site with real external integrations as a
bounded test case for a method intended to scale to much larger multi-platform
systems.

**Subject:** this repo. Gatsby 2 / React 16, live at <https://wolfw.xyz>.
**Branch:** `spec-migration` — the legacy site stays untouched on `master`.

## Framing

The site is a fork of `gatsby-starter-default`. That gives us a free oracle:
`git diff 07caae8 HEAD` separates custom work from boilerplate, which most
reverse-engineering work never gets.

**Determinism is out of scope.** A portfolio site does not need a verified
compiler. It needs a specification good enough that an agent can build from it
without re-deriving everything from a Gatsby codebase. The artifact is a
**requirements list, not a machine-checkable schema**.

### Two invariants

1. **Recovered and desired-change requirements live in separate labelled
   zones.** If they interleave, "parity achieved" and "we changed things"
   become indistinguishable.
2. **Every behavioural claim carries a citation** — `file:line` for static
   claims, `URL + observed state` for behavioural ones. Uncited claims do not
   enter the spec. This is the hallucination control.

---

## Study 1 — reverse-engineering a spec from a deployed system

### Method

Bottom-up from artifacts, not top-down from assumed intent. Two passes,
deliberately separated so the second can be audited against the first:

- **Pass A — deterministic** (`extract/pass-a.sh`, no model). Change surface,
  routes, GraphQL queries, integration surface, component reachability,
  hardcoded content. Whatever Pass A gets right, Pass B must not re-derive or
  contradict. *Result so far: nearly all of it — see `extract/pass-a/`.*
- **Pass B — LLM-assisted.** Behavioural claims, component semantics, content
  model. Every claim carries a citation; a verifier re-reads the source and
  marks each claim valid/invalid.

### Outputs

| File | Contents |
|---|---|
| `spec/recovered.md` | Provenance-cited requirements, recovered zone |
| `spec/desired.md` | Improvements, desired zone |
| `spec/gaps.md` | Explicit unknown register |
| `spec/content-model.md` | Sanity schema, as the code consumes it |
| `spec/behavior.feature` | Gherkin, executable against the live site |

### Metrics

- **Citation validity rate** — fraction of Pass B claims surviving independent
  re-verification.
- **Gap count** — not a coverage percentage. There is no ground truth for
  completeness; the gap register *is* the honesty mechanism.
- **Pass A / Pass B split** — how much of the spec needed a model at all.

### Falsification

If the recovered zone turns out small relative to the desired zone, this stops
being reverse engineering and becomes greenfield with an unusually good spec.
Fine outcome, different study — so **check by end of week 2**.

---

## Study 2 — agentic scaffolding

### Prior evidence

Evaluations of repository context files across multiple agents found
developer-written files improved task success ~4% on average while LLM-generated
ones *reduced* it ~3%, with inference cost up over 20%.

**The load-bearing caveat:** those evaluations scoped "context" to *descriptive*
summaries — the category ripgrep already covers. *Prescriptive* requirements
files were explicitly excluded. Study 2 measures whether that distinction holds.

### Conditions

- **A** — spec + thin `AGENTS.md` index
- **B** — spec + full descriptive `AGENTS.md`
- **C** — no spec, agent reads the Gatsby code directly (control)

B is predicted no better than A and more expensive. Worth confirming.

### Protocol

Add scaffolding only after a recorded agent failure; revert the addition;
re-run the same task; measure. Log every regression the spec failed to prevent
— that log is the second dataset and the main input to spec revision.

Subagent isolation (one agent per feature) is the second lever, with its known
failure mode: parallel agents re-implementing existing solutions.

### Falsification

If C matches A and B, the spec earns nothing and agent scaffolding is a
separate concern. Report that.

---

## Study 3 — technology for advanced visuals

The site currently has effectively no animation beyond a randomly-parameterised
SVG sine-wave background. Target is materially richer.

**Constraint carried over from the migration work:** artifacts must stay text,
diffable and agent-editable, or the spec-as-source property is lost.

That rules out **Rive** as a primary choice — `.riv` is proprietary binary,
dual-file, no open standard, an opaque blob in a repo whose premise is
inspectable artifacts. Last resort; if used, an *asset* referenced from the
spec, not a spec artifact.

**Preference order:**

1. **CSS scroll-driven animations + View Transitions API.** Cross-browser as of
   2025–26, compositor-driven, zero JS, just CSS in the repo. Covers scroll
   reveals, parallax, cross-page transitions — likely most of the requirement.
2. **Lottie / dotLottie** for designer-authored vector animation. Open format,
   `.lottie` ~80% smaller than raw JSON.
3. **Rive** only for genuine interactive state machines.

Animation parameters live in the spec as data; renderers stay replaceable.

---

## Sequencing

| Weeks | Activity |
|---|---|
| 1–2 | Study 1. Extraction, spec, gaps. **Week-2 checkpoint** on recovered-vs-desired ratio. |
| 2–4 | Study 3 in parallel — technology selection, visual target, spec additions. |
| 3–4 | Study 2 — A/B/C conditions on real features. |
| 5–6 | Build from spec. Log every place the spec underdetermined the work. |
| 6 | Writeup. Failure cases first. |

---

## Layout

```
spec/          specification artifacts
extract/       Pass A scripts, Pass B prompts, verifier
notes/         Study 2 logs, Study 3 decision record
```

## Findings so far

Recorded as they are confirmed. Each is a candidate recovered requirement, and
each flags a defect to resolve rather than replicate.

- **Data layer is Sanity CMS** (`gatsby-source-sanity`, project `5re0s6iv`,
  dataset `prod`), not hardcoded. Consumed types: `sanityAuthor`,
  `sanityProjectWolf`. Live: 12 work projects, 6 art projects.
- **Dynamic routing** — `gatsby-node.js` creates one `projectPage.js` per
  Sanity project, path from `slug.current`.
- **Password gate env mismatch.** `gatsby-config.js:22` reads
  `process.env.GATSBY_NO_SECRET`; `now.json:4` defines `NOT_VERY_SECRET`.
  Different names, so the configured password is `undefined`. `/cv` is
  confirmed behind the gate in production.
- **Stale protected path.** `/agency-work` is in `pagePaths` but exists in
  neither the repo nor the live site. `listItem.js:23` marks any project whose
  title contains "agency" with a 🔒, suggesting the route existed and was
  removed.
- **Dead component.** `src/components/header.js` is upstream boilerplate,
  never imported. Not a requirement.
- **Dead analytics.** `gatsby-plugin-google-analytics` targets `UA-245054-12`.
  Universal Analytics stopped processing data in 2024. Emits nothing.
- **`facts.js` mutates state directly** — `progress.push(numba)` on a state
  array (line 17), with a self-admitted "this is ugly" comment at line 26. The
  progress bar divides by `facts.length - 1`, so `facts.length === 1` divides
  by zero. Behaviour to specify precisely.
- **`background.js` mutates a module-level array** at import time with
  `Math.random()`, then positions elements in `useLayoutEffect` to dodge an
  SSR mismatch. Positions are randomised around viewport centre every load.
  Non-deterministic by design — spec it as a behaviour *with a distribution*,
  not a fixed value.
- **Accessibility exists in places** — `role="img" aria-label` on the lock and
  print emoji (`index.js:24`, `cv.js:24`), and a print button calling
  `window.print()` (`cv.js:24`). Preserve these.

### Method caveat found by Pass A

Naive import-graph reachability produced four false positives. Gatsby routes
`src/pages/*` without importing them, and `src/@mkitio/*` overrides files
inside an installed theme at build time. Both are entry points invisible to
import analysis. Recorded in `extract/pass-a.sh` — this is the kind of
framework-specific loading knowledge that would otherwise poison Pass B.
