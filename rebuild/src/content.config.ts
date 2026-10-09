// Content collections. Astro validates these at build time, which is how the
// spec stops being a document and starts being enforced.
//
// D1.2 — this is the home for the CV that was hardcoded in cvList.js
// (recovered.md#R4.1), and D1.1 for projects that lived in Sanity.

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Projects. Replaces `sanityProjectWolf` (spec/content-model.md).
 *
 * The fields here are the ones the legacy code actually *rendered*, not the
 * ones it requested — content-model.md found roughly a third of queried fields
 * were dead. Nothing dead comes across.
 */
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      // recovered.md#R1.3 — work and art are the same type, partitioned by
      // category. Kept as an array because the legacy filters could both match.
      categories: z.array(z.enum(["Web", "Visualization", "Experiment"])),
      publishedAt: z.coerce.date(),
      summary: z.string(),
      mainImage: image().optional(),
      // D3.3 — build guard. If a private project is ever published, the build
      // fails. Content-side hiding only works with this check.
      private: z.boolean().default(false),
      // D4.8 — speculative. If project art becomes animated, this is the field
      // that changes shape. Recorded now so it is not designed twice.
      animatedMedia: z.string().optional(),
      hasVideo: z.boolean().default(false),
    }),
});

/**
 * CV. Replaces the JSX in cvList.js. recovered.md#R4.2 records three titled
 * sections; the schema keeps that structure rather than flattening it.
 */
const cv = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/cv" }),
  schema: z.object({
    section: z.enum(["Recent positions", "Education", "Other more/less relevant skills"]),
    order: z.number(),
    items: z.array(
      z.object({
        dates: z.string(),
        position: z.string(),
        company: z.string(),
        clients: z.string().default(""),
        keywords: z.string().default(""),
        description: z.string(),
        bullets: z.array(z.string()).default([]),
        // recovered.md#R4.3 — two entries exist but are commented out.
        // Preserved as content, excluded from output.
        hidden: z.boolean().default(false),
      }),
    ),
  }),
});

/**
 * Facts widget. 37 entries from facts.js:56-94 (recovered.md#R7.1).
 * Now data, not JSX.
 */
const facts = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/facts" }),
  schema: z.object({
    items: z.array(z.string()).min(2),
  }),
});

export const collections = { projects, cv, facts };
