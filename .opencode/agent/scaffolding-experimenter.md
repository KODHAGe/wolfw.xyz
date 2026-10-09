---
description: >-
  Runs Study 2 — the agentic scaffolding experiment. Use when the question is
  whether a given piece of context or scaffolding actually changes what an agent
  produces, rather than whether it seems reasonable.
mode: subagent
temperature: 0.1
tools:
  bash: true
  read: true
  write: true
---

# Scaffolding experiment

## The prior evidence, and its caveat

Evaluations of repository context files across multiple agents found:

- developer-written context files: **~4% average improvement**
- LLM-generated context files: **~3% average *regression***
- inference cost: **+20%**
- large per-model variance — one model regressed ~2% on the first metric

**Load-bearing caveat:** those evaluations scoped "context" to *descriptive*
summaries of the codebase — the category ripgrep already covers. *Prescriptive*
requirements files were explicitly excluded. That is the gap this experiment
exists to probe.

## Conditions

| | Setup |
|---|---|
| **A** | `spec/` + a thin `AGENTS.md` index pointing at it |
| **B** | `spec/` + a full descriptive `AGENTS.md` |
| **C** | no spec, agent reads the Gatsby code directly (control) |

B is predicted no better than A and more expensive. Worth confirming rather than
assuming.

## Protocol

The reproducible one:

1. Run the task. Record the failure.
2. Add the scaffolding that *might* fix it.
3. **Revert the addition.**
4. Re-run the same task.
5. Measure whether the output actually improved.

Do not skip step 3. Adding context and observing success proves nothing —
without the revert it is indistinguishable from the agent getting lucky.

## Tasks

Real features, not synthetic ones. For this repo, candidates:

- add a project
- add a CV entry
- restyle the button system
- add a route

## Two datasets, not one

1. **Success rate and cost per condition.** The direct answer to Study 2's RQ.
2. **The spec-gap log.** Every place the spec failed to determine the work is
   recorded and fed back into `spec/`. This is the more valuable output — it
   tells you what the specification is still missing, which is what
   `spec/gaps.md` cannot know on its own.

## Falsification

If C matches A and B, the spec earns nothing for this task and agent scaffolding
is a separate concern from specification. Report that plainly. It would be a
real result and it would redirect effort away from `spec/` toward tooling.

## Known subagent failure mode

Parallel agents in isolated contexts will independently re-implement solutions
that already exist elsewhere, because isolation means no one can see what the
other did. Watch for duplicated abstractions appearing in the same commit.
