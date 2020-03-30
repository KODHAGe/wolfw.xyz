import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import Image from "../components/image"
import SEO from "../components/seo"
import List from "../components/list"

const ProjectsPage = ({data}) => (
  <Layout>
    <SEO title="projects" />
    <List items={data.allSanityProjectWolf.edges}></List>
  </Layout>
)

export default ProjectsPage

export const query = graphql `
  query MyQuery {
    allSanityProjectWolf {
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
            }
          }
          _rawBody
        }
      }
    }
  }
`
