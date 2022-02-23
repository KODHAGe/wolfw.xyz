import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = ({data}) => (
  <Layout>
    <SEO title="@" />
    <h1 className="siteTitle">wolfw.xyz</h1>
    <div className="description">
      Hi, I'm Wolf W
      <br></br>
      I make web happen - both beautiful and useful.
    </div>
    <div className="contact">
    </div>
    <div className="main">
      <div className="doubleButton">
        <Link className="button" to="/work">work</Link>
        <Link className="button" to="/art">art</Link>
      </div>
      <Link className="button" to="/about">about</Link>
      <Link className="button" to="/cv">cv <span role="img" aria-label="locked">🔒</span></Link>
      <a className="button" href="https://github.com/KODHAGe" target="_blank" rel="noopener noreferrer">github</a>
      <a className="button" href="https://www.linkedin.com/in/wwwolf/" target="_blank" rel="noopener noreferrer">linkedin</a>
      <a className="textlink" href="mailto:wolf@grh.fi">get in touch</a>
    </div>
  </Layout>
)

export default IndexPage