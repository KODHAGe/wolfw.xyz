import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = ({data}) => (
  <Layout>
    <SEO title="wolfw.xyz" />
    <h1 className="siteTitle">wolfw.xyz</h1>
    <div className="description">I make web happen, both the beautiful and useful kind.</div>
    <div className="contact">
    </div>
    <div className="main">
      <p><Link to="/projects">projects</Link></p>
      <p><Link to="/about">about</Link></p>
      <p><Link to="/cv">cv</Link></p>
      <p><a href="https://github.com/KODHAGe" target="_blank" rel="noopener noreferrer">github</a></p>
      <p><a href="https://www.linkedin.com/in/wwwolf/" target="_blank" rel="noopener noreferrer">linkedin</a></p>
    </div>
  </Layout>
)

export default IndexPage