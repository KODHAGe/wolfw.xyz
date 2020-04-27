/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions
  const result = await graphql(`
    {
      allSanityProjectWolf(filter: { slug: { current: { ne: null } } }) {
        edges {
          node {
            title
            slug {
              current
            }
            _rawBody
            categories {
              id
              title
            }
            mainVideo {
              _key
              _type
              asset {
                _key
                _type
                status
                assetId
                playbackId
                filename
                thumbTime
              }
            }
          }
        }
      }
    }
  `)
  if (result.errors) {
    throw result.errors
  }
  const projects = result.data.allSanityProjectWolf.edges || []
  projects.forEach((edge, index) => {
    const path = `/${edge.node.slug.current}`
    createPage({
      path,
      component: require.resolve("./src/pages/projectPage.js"),
      context: { 
        slug: edge.node.slug.current,
        title: edge.node.title,
        body: edge.node._rawBody,
        video: edge.node.mainVideo 
      },
    })
  })
}
