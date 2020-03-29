import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import Image from "../components/image"
import SEO from "../components/seo"
import ListItem from "../components/listItem"

const IndexPage = ({data}) => (
  <Layout>
    <SEO title="Home" />
    {console.log(data)}
    <h1>Wolfw.xyz</h1>
    {
      data.allSanityProjectWolf.edges.map(({ node }) => (
        <ListItem node={node} key={node.id}></ListItem>
      ))
    }
  </Layout>
)

export default IndexPage

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
