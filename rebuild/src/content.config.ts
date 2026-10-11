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
      // typography.md §2.4 / accessibility-performance.md finding #3: the
      // corpus is bilingual, so a title's language is data, not an assumption.
      // Emitted as a lang attribute on the h1 and on the listing card.
      titleLang: z.enum(["en", "fi"]).optional(),
      // recovered.md#R1.3 — work and art are the same type, partitioned by
      // category. Kept as an array because the legacy filters could both match.
      categories: z.array(z.enum(["Web", "Visualization", "Experiment"])),
      publishedAt: z.coerce.date(),
      summary: z.string(),
      // Listing thumbnail — `sanityProjectWolf.mainImage` as consumed by
      // listItem.js:10. This is a DIFFERENT field from the body images below,
      // and the first rebuild collapsed the two, which put the wrong picture on
      // all 18 cards. Recovered from the live listing pages, matched by href.
      thumbnail: z.string().optional(),
      thumbnailWidth: z.number().optional(),
      thumbnailHeight: z.number().optional(),
      // Body images, from `projectBlock`. Downloaded from the Sanity CDN rather
      // than hotlinked — D1.3 decommissions Sanity, and a hotlink would keep the
      // dependency alive after the CMS is gone. Dimensions are carried alongside
      // so pages can reserve space and avoid layout shift, which matters more
      // than usual here because the background shader is already repainting.
      mainImage: z.string().optional(),
      images: z
        .array(
          z.object({
            src: z.string(),
            w: z.number(),
            h: z.number(),
          }),
        )
        .default([]),
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

/**
 * CV identity block. frontend-architecture.md §5.3: cv.js:19-21 hardcoded the
 * name, roles, focus areas and location in JSX — the exact pattern D1.1 was
 * written to remove, carried forward. The values below are verbatim recovered
 * content (recovered.md#R4.1), not new copy.
 */
const identity = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/cv-identity" }),
  schema: z.object({
    name: z.string(),
    roles: z.string(),
    focus: z.string(),
    location: z.string(),
  }),
});

export const collections = { projects, cv, facts, identity };
