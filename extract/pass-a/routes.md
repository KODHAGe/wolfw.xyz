# Routes (Gatsby file routing over src/pages)

| Source | Route | Kind |
|---|---|---|
| `src/pages/404.js` | `/404` | static |
| `src/pages/about.js` | `/about` | static |
| `src/pages/art.js` | `/art` | static |
| `src/pages/cv.js` | `/cv` | static |
| `src/pages/index.js` | `/` | static |
| `src/pages/projectPage.js` | `/{slug}` | dynamic — one per Sanity project, created in `gatsby-node.js` |
| `src/pages/work.js` | `/work` | static |
