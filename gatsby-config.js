module.exports = {
  siteMetadata: {
    title: `wolfw.xyz`,
    description: `I am Wolf. I make (mainly) web happen - both beautiful and useful.`,
    author: `@KODHAGe`,
  },
  plugins: [
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: "UA-245054-12",
        head: false,
        anonymize: true,
        respectDNT: true,
        pageTransitionDelay: 100,
        defer: false
      },
    },
    {
      resolve: '@mkitio/gatsby-theme-password-protect',
      options: {
        password: process.env.GATSBY_NO_SECRET,
        partialMatching: true,
        pagePaths: ['/cv', '/agency-work'],
      }
    },
    {
      resolve: 'gatsby-source-sanity',
      options: {
        projectId: '5re0s6iv',
        dataset: 'prod',

        // a token with read permissions is required
        // if you have a private dataset
        token: process.env.MY_SANITY_TOKEN,

        // If the Sanity GraphQL API was deployed using `--tag <name>`,
        // use `graphqlTag` to specify the tag name. Defaults to `default`.
        graphqlTag: 'default',
      },
    },
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `wolfw.xyz`,
        short_name: `wolfw.xyz`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/icon.png`, // This path is relative to the root of the site.
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
  ],
}
