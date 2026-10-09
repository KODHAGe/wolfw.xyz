# wolfw.xyz — rebuild

Astro 5 rebuild of the legacy Gatsby 2 site, built against `../spec/`.
Every component cites the spec requirement it implements.

## Run

    npm install
    PUBLIC_CV_PASSWORD=demo npm run preview

## Verified working

- 11 static pages build clean
- Content collections schema-validated (projects, cv, facts)
- Real content extracted from the legacy source, not lorem
- CV gated; hidden entries correctly excluded from output
- Design tokens precede all effect code (D4.10)
- Layered button animation with gooey enhancement (D4.5)
- View Transitions opt-in + reduced-motion opt-out (D4.6, D4.9)
- Build guard fails on private/unreachable projects (D3.3)
- Facts widget: division-by-zero and in-place mutation fixed (D5)

## Open

**Background shader draws nothing.** Compiles, links, uniforms resolve, one
frame is drawn at mount, no console errors — but no visible output. Ruled out:
GLSL compile errors, uniform upload (array uniforms need `name[0]`, fixed),
bounds logic, accumulation saturation. Remaining suspect is the pixel-space
coordinate setup against a 2x-DPR drawing buffer, or the dash mask collapsing
to zero.

The `data-fallback` CSS gradient covers this path in the meantime, so the site
degrades rather than breaking.

## Node

Needs Node >= 18.17.1 for Astro 5. Homebrew node 23 was used here:
`export PATH="/opt/homebrew/bin:$PATH"`
