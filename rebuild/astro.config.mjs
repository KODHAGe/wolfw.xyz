import { defineConfig } from "astro/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

// D2.2 — Vercel stays. Static output, no adapter needed.
// D4.6 — View Transitions are per-page opt-in via <ClientRouter />, configured
// in the layout rather than here.
export default defineConfig({
  site: "https://wolfw.xyz",
  vite: {
    build: { target: "es2022" },
  },

  integrations: [
    {
      // D3.3 — fail the build on an unreachable or mistakenly-published project.
      // Reading frontmatter directly rather than going through the content layer
      // keeps the guard runnable before anything is rendered.
      name: "build-guard",
      hooks: {
        "astro:config:setup": ({ logger }) => {
          const dir = join(process.cwd(), "src/content/projects");

          let files = [];
          try {
            files = readdirSync(dir).filter((f) => f.endsWith(".md"));
          } catch {
            return;
          }

          const problems = [];

          for (const file of files) {
            const raw = readFileSync(join(dir, file), "utf8");
            const m = raw.match(/^---\n([\s\S]*?)\n---/);
            if (!m) {
              problems.push(`${file}: no frontmatter`);
              continue;
            }

            const fm = parseYaml(m[1]) ?? {};
            const slug = fm.slug ?? file.replace(/\.md$/, "");
            const isPrivate = fm.private === true;
            const categories = fm.categories ?? [];

            const reachable = categories.some((c) =>
              ["Web", "Visualization", "Experiment"].includes(c),
            );

            if (isPrivate) {
              problems.push(
                `${slug}: marked private:true — private projects must not be ` +
                  `published. See desired.md#D3.3.`,
              );
            }

            if (!reachable && !isPrivate) {
              problems.push(
                `${slug}: categories [${categories.join(", ")}] match neither ` +
                  `listing filter, so it renders on neither /work nor /art.`,
              );
            }
          }

          if (problems.length > 0) {
            const detail = problems.map((p) => `  - ${p}`).join("\n");
            throw new Error(
              `\n\nBuild guard failed (desired.md#D3.3). ` +
                `${problems.length} problem(s):\n${detail}\n`,
            );
          }

          logger.info(`build-guard: ${files.length} projects checked, no problems.`);
        },
      },
    },
  ],
});
