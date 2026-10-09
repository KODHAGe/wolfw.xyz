/**
 * Build guard — D3.3.
 *
 * Content-side hiding of private work is only meaningful if publishing one by
 * mistake is loud. On a static build a mistakenly-published private document is
 * baked into public output with no error and no signal, which is the failure
 * mode that makes people believe they are hiding something when they are not.
 *
 * This is that signal. It runs as part of the content load, so a private project
 * fails the build rather than shipping.
 *
 * The mechanism deliberately stays dumb. Anything clever here — an allowlist, a
 * per-project secret — reintroduces exactly the "hiding" that this is meant to
 * make real.
 */
import type { CollectionEntry } from "astro:content";

export interface GuardResult {
  ok: boolean;
  violations: Array<{
    slug: string;
    reason: string;
  }>;
}

/**
 * @param projects the projects collection, already loaded
 * @param allowlist slugs explicitly permitted to be private right now. Empty by
 *        default — adding a slug here is a deliberate, reviewable act.
 */
export function checkProjects(
  projects: CollectionEntry<"projects">[],
  allowlist: string[] = [],
): GuardResult {
  const violations: GuardResult["violations"] = [];

  for (const project of projects) {
    const { slug, private: isPrivate } = project.data;

    if (isPrivate && !allowlist.includes(slug)) {
      violations.push({
        slug,
        reason:
          "marked private:true but not present in the build allowlist. " +
          "A private project must never be published. Either remove the flag, " +
          "or add the slug to ALLOWED_PRIVATE in build-guard.ts deliberately.",
      });
    }

    // recovered.md#R1.3 — a project matching neither listing filter is
    // unreachable from the site. Worth knowing about, since it means content
    // the author wrote that no visitor can find.
    const reachable =
      project.data.categories.some((c) =>
        ["Web", "Visualization", "Experiment"].includes(c),
      );
    if (!reachable && !isPrivate) {
      violations.push({
        slug,
        reason:
          "matches no listing filter, so it renders on neither /work nor /art. " +
          "Add a category or accept that it is unreachable.",
      });
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Run the guard and throw if it fails. Call from an Astro integration hook so a
 * violation stops the build rather than printing a warning nobody reads.
 */
export function assertProjectsBuildable(
  projects: CollectionEntry<"projects">[],
  allowlist: string[] = [],
): void {
  const { ok, violations } = checkProjects(projects, allowlist);
  if (ok) return;

  const detail = violations
    .map((v) => `  - ${v.slug}: ${v.reason}`)
    .join("\n");

  throw new Error(
    `\n\nBuild guard failed (desired.md#D3.3). ${violations.length} problem(s):\n${detail}\n`,
  );
}
