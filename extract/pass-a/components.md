# Components

## Declared
  src/@mkitio/gatsby-theme-password-protect/components/PasswordProtect.js
  src/@mkitio/gatsby-theme-password-protect/utils/utils.js
  src/components/background.js
  src/components/backgroundElement.js
  src/components/cvList.js
  src/components/cvListItem.js
  src/components/cvListTitle.js
  src/components/facts.js
  src/components/header.js
  src/components/layout.js
  src/components/list.js
  src/components/listItem.js
  src/components/seo.js
  src/pages/404.js
  src/pages/about.js
  src/pages/art.js
  src/pages/cv.js
  src/pages/index.js
  src/pages/projectPage.js
  src/pages/work.js

## Import specifiers
  ../components/cvList
  ../components/facts
  ../components/layout
  ../components/list
  ../components/seo
  ./background
  ./background.module.css
  ./backgroundElement
  ./backgroundElement.module.css
  ./cvList.module.css
  ./cvListItem
  ./cvListItem.module.css
  ./cvListTitle
  ./cvListTitle.module.css
  ./facts.module.css
  ./listItem
  ./listItem.module.css
  @sanity/block-content-to-react

## Unreachable — declared but never imported anywhere

A component here is never rendered. Not a requirement.

Two classes of entry point are excluded, because import graph analysis
cannot see them and a naive check wrongly reports them as dead:

- **Pages** (`src/pages/*`) are routed to by Gatsby, never imported.
- **Theme shadow overrides** (`src/@mkitio/*`) replace files inside an
  installed theme at build time, consumed by the plugin, not by import.

  src/components/header.js
