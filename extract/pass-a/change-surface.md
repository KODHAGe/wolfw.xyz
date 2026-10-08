# Pass A — change surface

Upstream boilerplate boundary: `07caae8` (gatsby-starter-default)

## Files touched since starter
 package.json                                       |  27 +-
 .../components/PasswordProtect.js                  |  40 ++
 .../components/PasswordProtect.module.css          |  46 ++
 .../gatsby-theme-password-protect/utils/utils.js   |  31 +
 src/components/background.js                       | 135 ++++
 src/components/background.module.css               |  10 +
 src/components/backgroundElement.js                |  84 +++
 src/components/backgroundElement.module.css        |  14 +
 src/components/cvList.js                           |  97 +++
 src/components/cvList.module.css                   |   1 +
 src/components/cvListItem.js                       |  34 +
 src/components/cvListItem.module.css               |  36 ++
 src/components/cvListTitle.js                      |  21 +
 src/components/cvListTitle.module.css              |   4 +
 src/components/facts.js                            | 101 +++
 src/components/facts.module.css                    |  34 +
 src/components/image.js                            |  32 -
 src/components/layout.css                          | 715 ++++-----------------
 src/components/layout.js                           |  39 +-
 src/components/list.css                            |   3 +
 src/components/list.js                             |  26 +
 src/components/listItem.js                         |  31 +
 src/components/listItem.module.css                 |  25 +
 src/fonts/Necto-Mono.woff                          | Bin 0 -> 31348 bytes
 src/fonts/Necto-Mono.woff2                         | Bin 0 -> 25288 bytes
 src/fonts/fonts.css                                |   7 +
 src/images/1140703.jpg                             | Bin 0 -> 576357 bytes
 src/images/gatsby-astronaut.png                    | Bin 167273 -> 0 bytes
 src/images/gatsby-icon.png                         | Bin 21212 -> 0 bytes
 src/images/icon.png                                | Bin 0 -> 4875 bytes
 src/pages/404.js                                   |   5 +-
 src/pages/about.js                                 |  44 ++
 src/pages/art.js                                   |  60 ++
 src/pages/cv.js                                    |  28 +
 src/pages/index.js                                 |  31 +-
 src/pages/page-2.js                                |  16 -
 src/pages/projectPage.css                          |  25 +
 src/pages/projectPage.js                           |  41 ++
 src/pages/work.js                                  |  60 ++
 43 files changed, 1304 insertions(+), 708 deletions(-)

## Deleted boilerplate
D	src/components/image.js
D	src/images/gatsby-astronaut.png
D	src/images/gatsby-icon.png
D	src/pages/page-2.js

## Commit count since starter
29
