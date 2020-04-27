import React from "react"
import Img from "gatsby-image"

import Layout from "../components/layout"
import SEO from "../components/seo"
import Facts from "../components/facts"

const AboutPage = ({data}) => (
  <Layout whitebox="true">
    <SEO title="about wolf" />
    <a className="backlink" href="/" onClick={(e) => {
        e.preventDefault()
        window.history.back()
      }}
      >← BACK
    </a>
    <h1>About me</h1>
    <Img fluid={data.sanityAuthor.image.asset.fluid}></Img>
    <div className="caption">(DISCLAIMER: Usually my beard ain't this hobo, my hair ain't that nappy.)</div>
    <Facts></Facts>
  </Layout>
)

export const imgQuery = graphql`
  query authorImgQuery {
    sanityAuthor(name: {eq: "Wolf"}) {
      id
      _rawBio
      image {
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
    }
  }
`

export default AboutPage
