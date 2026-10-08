# Integration surface

## Gatsby plugins (`gatsby-config.js`)
9:      resolve: `gatsby-plugin-google-analytics`,
20:      resolve: '@mkitio/gatsby-theme-password-protect',
28:      resolve: 'gatsby-source-sanity',
42:    `gatsby-plugin-react-helmet`,
44:      resolve: `gatsby-source-filesystem`,
50:    `gatsby-transformer-sharp`,
51:    `gatsby-plugin-sharp`,
53:      resolve: `gatsby-plugin-manifest`,

## siteMetadata
  siteMetadata: {
    title: `wolfw.xyz`,
    description: `I am Wolf. I make (mainly) web happen - both beautiful and useful.`,
    author: `@KODHAGe`,
  },

## Env vars referenced in code
./gatsby-config.js:22:process.env.GATSBY_NO_SECRET
./gatsby-config.js:35:process.env.MY_SANITY_TOKEN

## Env vars defined (now.json)
  NOT_VERY_SECRET = @not_very_secret

## Runtime dependencies (package.json)
  @mkitio/gatsby-theme-password-protect@^2.1.2
  @sanity/block-content-to-react@^2.0.7
  gatsby@^2.20.8
  gatsby-image@^2.3.1
  gatsby-plugin-google-analytics@^2.3.0
  gatsby-plugin-manifest@^2.3.3
  gatsby-plugin-offline@^3.1.2
  gatsby-plugin-react-helmet@^3.2.1
  gatsby-plugin-sharp@^2.5.3
  gatsby-source-filesystem@^2.2.2
  gatsby-source-sanity@^5.0.6
  gatsby-transformer-sharp@^2.4.3
  prop-types@^15.7.2
  react@^16.13.1
  react-dom@^16.13.1
  react-helmet@^5.2.1
  sanity-mux-player@0.0.26
