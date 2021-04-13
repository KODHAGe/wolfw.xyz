import React from "react"

import Layout from "../components/layout"
import SEO from "../components/seo"
import List from "../components/list"

const ProjectsPage = ({data}) => (
  <Layout>
    <SEO title="projects" />
    <a className="backlink" href="/" onClick={(e) => {
        e.preventDefault()
        window.history.back()
      }}
      >← BACK
    </a>
    <h1>Projects: Art & Research</h1>
    <List items={data.allSanityProjectWolf.edges}></List>
  </Layout>
)

export default ProjectsPage

export const query = graphql `
query MyArtQuery {
  allSanityProjectWolf(filter: {categories: {elemMatch: {title: {eq: "Experiment"}}}}, sort: {fields: publishedAt, order: DESC}) {
    edges {
      node {
        id
        title
        slug {
          _key
          _type
          current
        }
        publishedAt
        author {
          id
          name
        }
        mainImage {
          _key
          _type
          asset {
            id
            url
            fluid(maxWidth: 700) {
              ...GatsbySanityImageFluid
            }
          }
        }
        _rawBody
        categories {
          title
          id
        }
      }
    }
  }
}
`
