import React from "react"
import { Link } from "gatsby"
import BlockContent from "@sanity/block-content-to-react"

import Layout from "../components/layout"
import Image from "../components/image"
import SEO from "../components/seo"

const IndexPage = ({data}) => (
  <Layout>
    <SEO title="Home" />
    {console.log(data)}
    <h1>Wolfw.xyz</h1>
    {
      data.allSanityPost.edges.map(({ node }) => (
        <div key={node.id}>
          <h2>{node.title}</h2>
          <img src={node.mainImage.asset.url}></img>
        </div>
      ))
    }
    <p>Welcome to your new Gatsby site.</p>
    <Link to="/page-2/">Go to page 2</Link>
  </Layout>
)

export default IndexPage

export const query = graphql `
  query MyQuery {
    allSanityPost {
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
