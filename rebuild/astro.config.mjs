import { defineConfig } from "astro/config";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

// ---------------------------------------------------------------------------
// GLSL trim.
//
// The shaders in src/lib/background*.ts are documented inline, which is the
// right way to write them: the reasoning behind a normal expansion, the origin
// of the 9-field stride, and the reason dpr() is a function are all comments
// that belong next to the line they explain. The browser does not need them.
// Shipping them cost 2,383 bytes of raw bundle on the two shaders that render
// the field on every page — which is what pushed /about and /cv past the 12 KB
// JS budget in audit.mjs.
//
// So the comments stay in the source and come out at build time. Only `//`
// comments are removed (GLSL ES has no block comments, and nothing here puts a
// `//` inside a string), indentation goes with them, and `#version` stays the
// first line because the spec requires it to precede everything except
// comments and whitespace.
//
// Verification is not left to inspection: the harness compiles the shipped
// string (probe.astro) and the audit asserts the live page runs on the
// instanced tier with a clean console, so a bad transform fails loudly rather
// than shipping a blank canvas.
// ---------------------------------------------------------------------------
function trimGlsl(literal) {
  return (
    "`" +
    literal
      .slice(1, -1)
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter(Boolean)
      .join("\n") +
    "`"
  );
}

const glslTrim = () => ({
  name: "glsl-trim",
  enforce: "pre",
  transform(code, id) {
    if (!/src\/lib\/background(-sdf)?\.ts$/.test(id)) return null;
    // Every shader literal in those two modules opens with the version
    // directive, so that prefix is the selector. Non-greedy to the closing
    // backtick — none of these strings contains one.
    const out = code.replace(/`#version 300 es[\s\S]*?`/g, trimGlsl);
    return out === code ? null : { code: out, map: null };
  },
});

// D2.2 — Vercel stays. Static output, no adapter needed.
// D4.6 — View Transitions are per-page opt-in via <ClientRouter />, configured
// in the layout rather than here.
export default defineConfig({
  site: "https://wolfw.xyz",
  vite: {
    build: { target: "es2022" },
    plugins: [glslTrim()],
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

          // -----------------------------------------------------------------
          // D4.10 / frontend-architecture.md §2.4 — the token contract.
          //
          // Two silent failure modes, both of which shipped real defects:
          //   referenced-but-undefined — six of them (PasswordGate's
          //     --c-accent-muted &c.), each dropping a declaration at
          //     computed-value time (audit finding #1);
          //   defined-but-unreferenced — eleven dead tokens nobody could find.
          // Both are now loud: the first fails the build, the second logs.
          // -----------------------------------------------------------------
          const stripComments = (s) =>
            s.replace(/\/\*[\s\S]*?\*\//g, "");

          const tokenExports = [
            "tokens.css",
            "tokens.recovered.css",
            "tokens.new.css",
          ]
            .map((f) => join(process.cwd(), "src", "styles", f))
            .filter((p) => existsSync(p));

          if (tokenExports.length > 0) {
            const defined = new Set();
            for (const p of tokenExports) {
              for (const m of stripComments(readFileSync(p, "utf8")).matchAll(
                /(--[\w-]+)\s*:[^;]*;/g,
              )) {
                defined.add(m[1]);
              }
            }

            const references = new Set();
            const srcRoot = join(process.cwd(), "src");
            const walkFiles = (dir) =>
              readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
                const p = join(dir, e.name);
                return e.isDirectory()
                  ? walkFiles(p)
                  : /\.(css|astro|ts|tsx|js)$/.test(e.name)
                    ? [p]
                    : [];
              });
            for (const f of walkFiles(srcRoot)) {
              const text = stripComments(readFileSync(f, "utf8"));
              for (const m of text.matchAll(/var\((\s*--[\w-]+)/g)) {
                references.add(m[1].trim());
              }
              // JS reads tokens too (background.ts reads --c-field for a
              // shader uniform); that is an interface, so count it.
              for (const m of text.matchAll(
                /getPropertyValue\(\s*["'`](--[\w-]+)/g,
              )) {
                references.add(m[1]);
              }
            }

            const dangling = [...references].filter((r) => !defined.has(r));
            const unused = [...defined].filter((d) => !references.has(d));
            if (dangling.length > 0) {
              problems.push(
                `${dangling.length} token(s) referenced by var() but defined nowhere — ` +
                  `${dangling.join(", ")}. A declared value is the contract; a missing ` +
                  `one is a silent style drop at computed-value time.`,
              );
            }
            logger.info(
              `tokens: ${defined.size} defined, ${references.size} referenced, ` +
                `${dangling.length} dangling` +
                (unused.length > 0
                  ? `; defined-but-unreferenced: ${unused.join(", ")}`
                  : ""),
            );
          }

          if (problems.length > 0) {
            const detail = problems.map((p) => `  - ${p}`).join("\n");
            throw new Error(
              `\n\nBuild guard failed (desired.md#D3.3, frontend-architecture.md §2.4). ` +
                `${problems.length} problem(s):\n${detail}\n`,
            );
          }

          logger.info(
            `build-guard: ${files.length} projects checked, no problems.`,
          );
        },
      },
    },
  ],
});
