import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = ({data}) => (
  <Layout>
    <SEO title="wolfw.xyz" />
    <h1 className="siteTitle">wolfw.xyz</h1>
    <div className="description">I make web happen, both the beautiful and the useful kind.</div>
    <div className="contact">
    </div>
    <div className="main">
      <Link className="button"  to="/projects">projects</Link>
      <Link className="button" to="/about">about</Link>
      <Link className="button" to="/cv">cv</Link>
      <a className="button" href="https://github.com/KODHAGe" target="_blank" rel="noopener noreferrer">github</a>
      <a className="button" href="https://www.linkedin.com/in/wwwolf/" target="_blank" rel="noopener noreferrer">linkedin</a>
    </div>
  </Layout>
)

export default IndexPage